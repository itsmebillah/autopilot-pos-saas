import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeCreateSaleAtomic,
  MockDatabaseState,
  AtomicSalePayload,
} from '../lib/atomic-sale-simulator';
import { Store, MasterProduct, Customer } from '../types/database';

describe('Atomic POS Checkout Engine (create_sale_atomic)', () => {
  let db: MockDatabaseState;

  const mockStore: Store = {
    id: 'store-gulshan',
    organization_id: 'org-apex',
    shop_category_id: 'cat-watch',
    name: 'Apex Gulshan Flagship',
    code: 'GUL01',
    phone: '+8801700000000',
    email: 'gulshan@apex.com',
    address: 'Gulshan 2, Dhaka',
    currency: 'BDT',
    currency_symbol: '৳',
    currency_position: 'BEFORE',
    timezone: 'Asia/Dhaka',
    locale: 'en-US',
    date_format: 'YYYY-MM-DD',
    number_format: 'STANDARD',
    tax_mode: 'TAX_EXCLUSIVE',
    tax_label: 'VAT',
    tax_rate: 5.0, // 5% VAT
    tax_number: 'BIN-123456789',
    receipt_header: 'Apex Luxury Retail',
    receipt_footer: 'Thank you!',
    receipt_template: 'thermal_80mm',
    logo_url: null,
    enabled_modules: ['mod_pos', 'mod_inventory', 'mod_serial_imei', 'mod_warranty'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockStoreBanani: Store = {
    ...mockStore,
    id: 'store-banani',
    name: 'Apex Banani Branch',
    code: 'BAN01',
  };

  const mockMasterProductWatch: MasterProduct = {
    id: 'prod-rolex',
    organization_id: 'org-apex',
    category_id: null,
    name: 'Rolex Submariner 41mm',
    brand: 'Rolex',
    model: '126610LN',
    master_sku: 'ROL-126610',
    master_barcode: '7613291112223',
    unit: 'pcs',
    default_buy_price: 8000,
    default_sell_price: 11000,
    tax_rate: null,
    min_stock_alert: 2,
    dynamic_attributes: { movement: 'Automatic', strap: 'Oystersteel' },
    has_variants: false,
    has_serials: true,
    has_batches: false,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockMasterProductPerfume: MasterProduct = {
    id: 'prod-perfume',
    organization_id: 'org-apex',
    category_id: null,
    name: 'Chanel Bleu de Chanel EDP 100ml',
    brand: 'Chanel',
    model: 'Bleu',
    master_sku: 'CH-BLEU-100',
    master_barcode: '3145891073607',
    unit: 'pcs',
    default_buy_price: 120,
    default_sell_price: 180,
    tax_rate: null,
    min_stock_alert: 5,
    dynamic_attributes: { volume: '100ml', gender: 'Men' },
    has_variants: false,
    has_serials: false,
    has_batches: true,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockCustomer: Customer = {
    id: 'cust-mr-rahman',
    organization_id: 'org-apex',
    name: 'Mr. Rahman',
    phone: '+8801811112222',
    email: 'rahman@gmail.com',
    address: 'Banani, Dhaka',
    current_balance: 0,
    loyalty_points: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    db = {
      stores: new Map([
        [mockStore.id, mockStore],
        [mockStoreBanani.id, mockStoreBanani],
      ]),
      master_products: new Map([
        [mockMasterProductWatch.id, mockMasterProductWatch],
        [mockMasterProductPerfume.id, mockMasterProductPerfume],
      ]),
      store_products: new Map([
        [
          `${mockStore.id}:${mockMasterProductWatch.id}`,
          {
            id: 'sp-gul-watch',
            store_id: mockStore.id,
            product_id: mockMasterProductWatch.id,
            store_sku: 'ROL-126610',
            store_barcode: '7613291112223',
            sell_price: 11000,
            cost_price: 8000,
            current_stock: 3,
            reorder_level: 1,
            tax_rate_override: null,
            is_available_for_sale: true,
            updated_at: new Date().toISOString(),
          },
        ],
        [
          `${mockStore.id}:${mockMasterProductPerfume.id}`,
          {
            id: 'sp-gul-perfume',
            store_id: mockStore.id,
            product_id: mockMasterProductPerfume.id,
            store_sku: 'CH-BLEU-100',
            store_barcode: '3145891073607',
            sell_price: 180,
            cost_price: 120,
            current_stock: 10,
            reorder_level: 2,
            tax_rate_override: null,
            is_available_for_sale: true,
            updated_at: new Date().toISOString(),
          },
        ],
      ]),
      store_product_variants: new Map(),
      product_serials: new Map([
        [
          `${mockStore.id}:SN-ROL-001`,
          {
            id: 'sn-001',
            store_id: mockStore.id,
            product_id: mockMasterProductWatch.id,
            variant_id: null,
            serial_number: 'SN-ROL-001',
            imei_2: null,
            warranty_months: 24,
            status: 'IN_STOCK',
            sale_id: null,
            warranty_expires_at: null,
            created_at: new Date().toISOString(),
          },
        ],
        [
          `${mockStore.id}:SN-ROL-002`,
          {
            id: 'sn-002',
            store_id: mockStore.id,
            product_id: mockMasterProductWatch.id,
            variant_id: null,
            serial_number: 'SN-ROL-002',
            imei_2: null,
            warranty_months: 24,
            status: 'IN_STOCK',
            sale_id: null,
            warranty_expires_at: null,
            created_at: new Date().toISOString(),
          },
        ],
      ]),
      product_batches: new Map([
        [
          `${mockStore.id}:${mockMasterProductPerfume.id}:BATCH-2026A`,
          {
            id: 'batch-001',
            store_id: mockStore.id,
            product_id: mockMasterProductPerfume.id,
            batch_number: 'BATCH-2026A',
            manufacturing_date: '2026-01-01',
            expiry_date: '2028-01-01',
            unit_cost: 120,
            current_stock: 10,
            created_at: new Date().toISOString(),
          },
        ],
      ]),
      customers: new Map([[mockCustomer.id, { ...mockCustomer }]]),
      sales: new Map(),
      sale_items: [],
      payments: [],
      stock_movements: [],
      locked_rows: new Set(),
    };
  });

  // Scenario 1: Successful Standard Sale
  it('Scenario 1: Executes successful sale, updates stock, logs movement, and sets serial to SOLD', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      customer_id: 'cust-mr-rahman',
      discount_amount: 0,
      items: [
        {
          product_id: 'prod-rolex',
          quantity: 1,
          serial_numbers: ['SN-ROL-001'],
        },
      ],
      payments: [
        {
          payment_method: 'CASH',
          amount: 11550, // 11000 + 5% VAT (550) = 11550
        },
      ],
    };

    const result = executeCreateSaleAtomic(payload, db);

    expect(result.success).toBe(true);
    expect(result.total).toBe(11550);
    expect(result.tax_amount).toBe(550);
    expect(result.payment_status).toBe('PAID');
    expect(result.invoice_no).toContain('INV-GUL01-');

    // Verify stock deducted
    const updatedStoreProduct = db.store_products.get('store-gulshan:prod-rolex');
    expect(updatedStoreProduct?.current_stock).toBe(2); // Was 3, now 2

    // Verify stock movement logged
    expect(db.stock_movements.length).toBe(1);
    expect(db.stock_movements[0].movement_type).toBe('SALE');
    expect(db.stock_movements[0].quantity).toBe(-1);

    // Verify serial updated to SOLD
    const serial = db.product_serials.get('store-gulshan:SN-ROL-001');
    expect(serial?.status).toBe('SOLD');
    expect(serial?.sale_id).toBe(result.sale_id);
    expect(serial?.warranty_expires_at).toBeDefined();
  });

  // Scenario 2: Insufficient Stock
  it('Scenario 2: Fails when requested quantity exceeds available stock and modifies zero state', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-rolex',
          quantity: 10, // Only 3 in stock!
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 100000 }],
    };

    const result = executeCreateSaleAtomic(payload, db);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient stock');

    // Verify stock remains untouched
    const storeProduct = db.store_products.get('store-gulshan:prod-rolex');
    expect(storeProduct?.current_stock).toBe(3);
    expect(db.sales.size).toBe(0);
    expect(db.stock_movements.length).toBe(0);
  });

  // Scenario 3: Concurrent Checkout Row Lock Simulation
  it('Scenario 3: Fails cleanly if inventory row is already locked by another transaction', () => {
    // Simulate active lock
    db.locked_rows.add('store_products:store-gulshan:prod-rolex');

    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-rolex',
          quantity: 1,
          serial_numbers: ['SN-ROL-001'],
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 11550 }],
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Concurrent transaction lock timeout');
  });

  // Scenario 4: Invalid Product
  it('Scenario 4: Rejects checkout if product does not exist in store', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-non-existent',
          quantity: 1,
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 500 }],
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not stocked in store');
  });

  // Scenario 5: Invalid Client Price Attempt
  it('Scenario 5: Discards client-provided pricing attempt and enforces verified server price', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-rolex',
          quantity: 1,
          serial_numbers: ['SN-ROL-001'],
          client_price_attempt: 1.0, // Attacker tries to pay 1 BDT instead of 11,000!
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 11550 }],
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(true);
    // Verified server price must be 11,000 + 5% tax = 11,550
    expect(result.subtotal).toBe(11000);
    expect(result.total).toBe(11550);
  });

  // Scenario 6: Cross-Store Security Attempt
  it('Scenario 6: Rejects attempt to sell products across organizations or wrong store context', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-OTHER-TENANT', // Wrong Org!
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [{ product_id: 'prod-rolex', quantity: 1, serial_numbers: ['SN-ROL-001'] }],
      payments: [{ payment_method: 'CASH', amount: 11550 }],
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not belong to organization');
  });

  // Scenario 7: Serial / IMEI Validation
  it('Scenario 7: Rejects checkout if serialized product is missing serial or has duplicate serial', () => {
    const payloadMissing: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-rolex',
          quantity: 2,
          serial_numbers: ['SN-ROL-001'], // Requires 2, only 1 provided!
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 23100 }],
    };

    const result = executeCreateSaleAtomic(payloadMissing, db);
    expect(result.success).toBe(false);
    expect(result.error).toContain('requires 2 serial(s), but 1 provided');
  });

  // Scenario 8: Batch / Expiry Validation & Depletion
  it('Scenario 8: Validates batch existence and depletes batch stock upon checkout', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-perfume',
          quantity: 3,
          batch_number: 'BATCH-2026A',
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 567 }], // (180 * 3) + 5% = 567
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(true);

    const batch = db.product_batches.get('store-gulshan:prod-perfume:BATCH-2026A');
    expect(batch?.current_stock).toBe(7); // Was 10, now 7
  });

  // Scenario 9: Customer Due / Credit Sale
  it('Scenario 9: Records credit sale due amount and increments customer balance', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      customer_id: 'cust-mr-rahman',
      items: [
        {
          product_id: 'prod-perfume',
          quantity: 1,
        },
      ],
      payments: [
        { payment_method: 'CASH', amount: 100 }, // Total is 189 (180 + 5% tax), paid 100, due 89
      ],
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(true);
    expect(result.total).toBe(189);
    expect(result.paid_amount).toBe(100);
    expect(result.due_amount).toBe(89);
    expect(result.payment_status).toBe('PARTIAL');

    const customer = db.customers.get('cust-mr-rahman');
    expect(customer?.current_balance).toBe(89);
  });

  // Scenario 10: Atomic Rollback on Mid-Flight Failure
  it('Scenario 10: Rolls back all database mutations if payment or secondary item fails', () => {
    const payload: AtomicSalePayload = {
      organization_id: 'org-apex',
      store_id: 'store-gulshan',
      cashier_id: 'cashier-001',
      items: [
        {
          product_id: 'prod-perfume',
          quantity: 2, // Valid item
        },
        {
          product_id: 'prod-rolex',
          quantity: 1,
          serial_numbers: ['INVALID-SERIAL-XYZ'], // Invalid serial causes mid-transaction failure!
        },
      ],
      payments: [{ payment_method: 'CASH', amount: 50000 }],
    };

    const result = executeCreateSaleAtomic(payload, db);
    expect(result.success).toBe(false);
    expect(result.error).toContain('is not in stock or invalid');

    // Crucial: Perfume stock must NOT have changed because of rollback
    const perfumeStock = db.store_products.get('store-gulshan:prod-perfume');
    expect(perfumeStock?.current_stock).toBe(10); // Still 10!
    expect(db.sales.size).toBe(0);
    expect(db.stock_movements.length).toBe(0);
  });
});
