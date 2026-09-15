import {
  Store,
  MasterProduct,
  StoreProduct,
  StoreProductVariant,
  ProductSerial,
  ProductBatch,
  Sale,
  SaleItem,
  Payment,
  StockMovement,
  Customer,
} from '../types/database';

export interface AtomicSaleItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  serial_numbers?: string[];
  batch_number?: string | null;
  client_price_attempt?: number; // Malicious client attempt to override price
}

export interface AtomicPaymentInput {
  payment_method: 'CASH' | 'CARD' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK_TRANSFER' | 'STORE_CREDIT';
  amount: number;
  transaction_ref?: string;
}

export interface AtomicSalePayload {
  organization_id: string;
  store_id: string;
  cashier_id: string;
  customer_id?: string | null;
  discount_amount?: number;
  items: AtomicSaleItemInput[];
  payments: AtomicPaymentInput[];
  notes?: string | null;
}

export interface MockDatabaseState {
  stores: Map<string, Store>;
  master_products: Map<string, MasterProduct>;
  store_products: Map<string, StoreProduct>; // key: `${store_id}:${product_id}`
  store_product_variants: Map<string, StoreProductVariant>; // key: `${store_id}:${variant_id}`
  product_serials: Map<string, ProductSerial>; // key: `${store_id}:${serial_number}`
  product_batches: Map<string, ProductBatch>; // key: `${store_id}:${product_id}:${batch_number}`
  customers: Map<string, Customer>;
  sales: Map<string, Sale>;
  sale_items: SaleItem[];
  payments: Payment[];
  stock_movements: StockMovement[];
  locked_rows: Set<string>;
}

export interface AtomicSaleResult {
  success: boolean;
  sale_id?: string;
  invoice_no?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total?: number;
  paid_amount?: number;
  change_amount?: number;
  due_amount?: number;
  payment_status?: 'PAID' | 'PARTIAL' | 'DUE';
  error?: string;
}

/**
 * Pure simulation of the PostgreSQL `create_sale_atomic` stored procedure.
 * Guarantees exact ACID transaction semantics, row locks, server pricing, and rollback.
 */
export function executeCreateSaleAtomic(
  payload: AtomicSalePayload,
  db: MockDatabaseState
): AtomicSaleResult {
  // Snapshot initial state for atomic rollback on any failure
  const storeProductsBackup = new Map(
    Array.from(db.store_products.entries()).map(([k, v]) => [k, { ...v }])
  );
  const variantsBackup = new Map(
    Array.from(db.store_product_variants.entries()).map(([k, v]) => [k, { ...v }])
  );
  const serialsBackup = new Map(
    Array.from(db.product_serials.entries()).map(([k, v]) => [k, { ...v }])
  );
  const batchesBackup = new Map(
    Array.from(db.product_batches.entries()).map(([k, v]) => [k, { ...v }])
  );
  const customersBackup = new Map(
    Array.from(db.customers.entries()).map(([k, v]) => [k, { ...v }])
  );
  const initialSalesCount = db.sales.size;
  const initialSaleItemsCount = db.sale_items.length;
  const initialPaymentsCount = db.payments.length;
  const initialStockMovementsCount = db.stock_movements.length;

  const rollback = (errorMessage: string): AtomicSaleResult => {
    // Restore all snapshots
    db.store_products = storeProductsBackup;
    db.store_product_variants = variantsBackup;
    db.product_serials = serialsBackup;
    db.product_batches = batchesBackup;
    db.customers = customersBackup;
    db.sale_items.length = initialSaleItemsCount;
    db.payments.length = initialPaymentsCount;
    db.stock_movements.length = initialStockMovementsCount;
    db.locked_rows.clear();
    return { success: false, error: errorMessage };
  };

  try {
    // 1. Verify Store Existence & Tenancy
    const store = db.stores.get(payload.store_id);
    if (!store) {
      return rollback(`Store not found: ${payload.store_id}`);
    }
    if (store.organization_id !== payload.organization_id) {
      return rollback(`Store ${payload.store_id} does not belong to organization ${payload.organization_id}`);
    }

    if (!payload.items || payload.items.length === 0) {
      return rollback('Cannot complete checkout: Cart is empty');
    }

    // 2. Acquire Row Locks & Validate Inventory (Simulating SELECT FOR UPDATE)
    for (const item of payload.items) {
      const lockKey = `store_products:${payload.store_id}:${item.product_id}`;
      if (db.locked_rows.has(lockKey)) {
        return rollback(`Concurrent transaction lock timeout on product: ${item.product_id}`);
      }
      db.locked_rows.add(lockKey);
    }

    // 3. Process Line Items with Server-Authoritative Pricing
    let subtotal = 0;
    let totalCost = 0;
    let totalTax = 0;

    const validatedItems: Array<{
      product: MasterProduct;
      storeProduct: StoreProduct;
      variant?: StoreProductVariant;
      quantity: number;
      unit_price: number;
      unit_cost: number;
      subtotal: number;
      serials: string[];
      batch?: string | null;
    }> = [];

    for (const item of payload.items) {
      if (item.quantity <= 0) {
        return rollback('Item quantity must be greater than 0');
      }

      const storeProductKey = `${payload.store_id}:${item.product_id}`;
      const storeProduct = db.store_products.get(storeProductKey);

      if (!storeProduct) {
        return rollback(`Product ${item.product_id} is not stocked in store ${payload.store_id}`);
      }

      if (!storeProduct.is_available_for_sale) {
        return rollback(`Product is disabled for sale`);
      }

      const masterProduct = db.master_products.get(item.product_id);
      if (!masterProduct) {
        return rollback(`Master product ${item.product_id} not found`);
      }

      // Check cross-tenant isolation
      if (masterProduct.organization_id !== payload.organization_id) {
        return rollback(`Security violation: Product belongs to another organization`);
      }

      let unitPrice = storeProduct.sell_price;
      let unitCost = storeProduct.cost_price;
      let variant: StoreProductVariant | undefined;

      if (item.variant_id) {
        const variantKey = `${payload.store_id}:${item.variant_id}`;
        variant = db.store_product_variants.get(variantKey);
        if (!variant) {
          return rollback(`Variant ${item.variant_id} not found in store`);
        }
        if (variant.current_stock < item.quantity) {
          return rollback(
            `Insufficient stock for variant. Available: ${variant.current_stock}, Requested: ${item.quantity}`
          );
        }
        unitPrice = variant.sell_price;
        unitCost = variant.cost_price;
      } else {
        if (storeProduct.current_stock < item.quantity) {
          return rollback(
            `Insufficient stock for "${masterProduct.name}". Available: ${storeProduct.current_stock}, Requested: ${item.quantity}`
          );
        }
      }

      // Serial / IMEI Enforcement
      const serials = item.serial_numbers || [];
      if (masterProduct.has_serials) {
        if (serials.length !== item.quantity) {
          return rollback(
            `Product "${masterProduct.name}" requires ${item.quantity} serial(s), but ${serials.length} provided`
          );
        }
        for (const sn of serials) {
          const serialKey = `${payload.store_id}:${sn}`;
          const serialRecord = db.product_serials.get(serialKey);
          if (!serialRecord || serialRecord.status !== 'IN_STOCK') {
            return rollback(`Serial number "${sn}" is not in stock or invalid`);
          }
        }
      }

      // Batch & Expiry Enforcement
      if (masterProduct.has_batches && item.batch_number) {
        const batchKey = `${payload.store_id}:${item.product_id}:${item.batch_number}`;
        const batchRecord = db.product_batches.get(batchKey);
        if (!batchRecord || batchRecord.current_stock < item.quantity) {
          return rollback(`Batch "${item.batch_number}" has insufficient stock or is invalid`);
        }
      }

      const lineSubtotal = unitPrice * item.quantity;
      const lineCost = unitCost * item.quantity;

      let lineTax = 0;
      if (store.tax_mode === 'TAX_EXCLUSIVE' && store.tax_rate > 0) {
        lineTax = Number(((lineSubtotal * store.tax_rate) / 100).toFixed(2));
      }

      subtotal += lineSubtotal;
      totalCost += lineCost;
      totalTax += lineTax;

      validatedItems.push({
        product: masterProduct,
        storeProduct,
        variant,
        quantity: item.quantity,
        unit_price: unitPrice,
        unit_cost: unitCost,
        subtotal: lineSubtotal,
        serials,
        batch: item.batch_number,
      });
    }

    // 4. Calculate Final Financials
    const discount = Math.max(0, payload.discount_amount || 0);
    const total = Math.max(0, Number((subtotal + totalTax - discount).toFixed(2)));

    let paidAmount = 0;
    for (const p of payload.payments) {
      paidAmount += Number(p.amount) || 0;
    }
    paidAmount = Number(paidAmount.toFixed(2));

    let changeAmount = 0;
    let dueAmount = 0;
    let paymentStatus: 'PAID' | 'PARTIAL' | 'DUE' = 'PAID';

    if (paidAmount >= total) {
      changeAmount = Number((paidAmount - total).toFixed(2));
      dueAmount = 0;
      paymentStatus = 'PAID';
    } else {
      changeAmount = 0;
      dueAmount = Number((total - paidAmount).toFixed(2));
      paymentStatus = paidAmount > 0 ? 'PARTIAL' : 'DUE';
    }

    // 5. Generate Sequential Invoice Number & Sale Row
    const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoiceNo = `INV-${store.code}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(
      initialSalesCount + 1
    ).padStart(4, '0')}`;

    const nowStr = new Date().toISOString();

    const saleRecord: Sale = {
      id: saleId,
      organization_id: payload.organization_id,
      store_id: payload.store_id,
      cashier_id: payload.cashier_id,
      customer_id: payload.customer_id || null,
      invoice_no: invoiceNo,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: discount,
      tax_amount: Number(totalTax.toFixed(2)),
      total,
      paid_amount: paidAmount,
      change_amount: changeAmount,
      due_amount: dueAmount,
      total_cost: Number(totalCost.toFixed(2)),
      total_profit: Number((subtotal - totalCost - discount).toFixed(2)),
      payment_status: paymentStatus,
      sale_status: 'COMPLETED',
      notes: payload.notes || null,
      created_at: nowStr,
      updated_at: nowStr,
    };

    db.sales.set(saleId, saleRecord);

    // 6. Insert Line Items, Update Inventory & Append Stock Movements
    for (const vItem of validatedItems) {
      // Deduct stock
      if (vItem.variant) {
        vItem.variant.current_stock -= vItem.quantity;
      }
      vItem.storeProduct.current_stock -= vItem.quantity;

      // Add Sale Item
      db.sale_items.push({
        id: `si-${Date.now()}-${Math.random()}`,
        sale_id: saleId,
        product_id: vItem.product.id,
        variant_id: vItem.variant?.variant_id || null,
        product_name: vItem.product.name,
        serial_numbers: vItem.serials,
        batch_number: vItem.batch || null,
        unit_price: vItem.unit_price,
        unit_cost: vItem.unit_cost,
        quantity: vItem.quantity,
        subtotal: vItem.subtotal,
        discount_amount: 0,
        tax_amount: 0,
        total: vItem.subtotal,
        profit: (vItem.unit_price - vItem.unit_cost) * vItem.quantity,
        created_at: nowStr,
      });

      // Add Stock Movement
      db.stock_movements.push({
        id: `sm-${Date.now()}-${Math.random()}`,
        organization_id: payload.organization_id,
        store_id: payload.store_id,
        product_id: vItem.product.id,
        variant_id: vItem.variant?.variant_id || null,
        movement_type: 'SALE',
        quantity: -vItem.quantity,
        previous_stock: vItem.storeProduct.current_stock + vItem.quantity,
        new_stock: vItem.storeProduct.current_stock,
        unit_cost: vItem.unit_cost,
        reference_id: saleId,
        reference_type: 'SALE',
        notes: `POS Sale: ${invoiceNo}`,
        created_by: payload.cashier_id,
        created_at: nowStr,
      });

      // Update Serials status
      for (const sn of vItem.serials) {
        const serialKey = `${payload.store_id}:${sn}`;
        const serialRecord = db.product_serials.get(serialKey);
        if (serialRecord) {
          serialRecord.status = 'SOLD';
          serialRecord.sale_id = saleId;
          serialRecord.warranty_expires_at = new Date(
            Date.now() + serialRecord.warranty_months * 30 * 24 * 60 * 60 * 1000
          ).toISOString();
        }
      }

      // Update Batch stock
      if (vItem.batch) {
        const batchKey = `${payload.store_id}:${vItem.product.id}:${vItem.batch}`;
        const batchRecord = db.product_batches.get(batchKey);
        if (batchRecord) {
          batchRecord.current_stock -= vItem.quantity;
        }
      }
    }

    // 7. Record Payments
    for (const p of payload.payments) {
      db.payments.push({
        id: `pay-${Date.now()}-${Math.random()}`,
        sale_id: saleId,
        payment_method: p.payment_method,
        amount: p.amount,
        transaction_ref: p.transaction_ref || null,
        created_at: nowStr,
      });
    }

    // 8. Adjust Customer Due Balance
    if (payload.customer_id && dueAmount > 0) {
      const customer = db.customers.get(payload.customer_id);
      if (customer) {
        customer.current_balance += dueAmount;
      }
    }

    // Release locks
    db.locked_rows.clear();

    return {
      success: true,
      sale_id: saleId,
      invoice_no: invoiceNo,
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: Number(totalTax.toFixed(2)),
      discount_amount: discount,
      total,
      paid_amount: paidAmount,
      change_amount: changeAmount,
      due_amount: dueAmount,
      payment_status: paymentStatus,
    };
  } catch (err: any) {
    return rollback(err.message || 'Unexpected database error during checkout');
  }
}
