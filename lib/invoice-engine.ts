// Canonical Invoice Engine & Types for Autopilot POS SaaS

export interface BusinessInfo {
  name: string;
  store_name: string;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  tax_number?: string | null; // VAT / GST / BIN registration
  tax_label?: string; // 'VAT', 'GST', 'Tax', 'Sales Tax'
}

export interface TransactionInfo {
  invoice_no: string;
  sale_id?: string;
  created_at: string;
  date_formatted: string;
  time_formatted: string;
  cashier_name?: string;
  store_code?: string;
  payment_status: "PAID" | "PARTIAL" | "DUE" | "REFUNDED";
  sale_status: "COMPLETED" | "VOIDED" | "RETURNED";
  notes?: string | null;
}

export interface CustomerInfo {
  id?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  loyalty_points?: number;
}

export interface InvoiceItem {
  id: string;
  product_id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  profit?: number;
  serial_numbers?: string[];
  batch_number?: string | null;
  expiry_date?: string | null;
}

export interface PaymentTender {
  id?: string;
  method: string; // 'CASH', 'CARD', 'MOBILE', 'BKASH', 'NAGAD', 'BANK_TRANSFER', etc.
  amount: number;
  transaction_ref?: string | null;
  created_at?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  due_amount: number;
}

export interface InvoiceConfig {
  currency_code: string; // 'BDT', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR'
  currency_symbol: string; // '৳', '$', '€', '£', etc.
  currency_position: "BEFORE" | "AFTER";
  tax_label: string;
  footer_message: string;
  return_policy: string;
  warranty_note?: string;
  receipt_template: "thermal_58mm" | "thermal_80mm" | "a4_standard";
}

export interface InvoiceData {
  business: BusinessInfo;
  transaction: TransactionInfo;
  customer?: CustomerInfo | null;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  payments: PaymentTender[];
  config: InvoiceConfig;
}

/**
 * Format currency amount according to store configuration
 */
export function formatCurrency(amount: number, config?: Partial<InvoiceConfig>): string {
  const symbol = config?.currency_symbol || "৳";
  const position = config?.currency_position || "BEFORE";
  const num = Number(amount || 0);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formattedNumber = absNum.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (position === "AFTER") {
    return isNegative ? `-${formattedNumber} ${symbol}` : `${formattedNumber} ${symbol}`;
  }
  return isNegative ? `-${symbol} ${formattedNumber}` : `${symbol} ${formattedNumber}`;
}

/**
 * Generate sequential, collision-safe invoice number
 */
export function generateInvoiceNumber(storeCode = "STA", prefix = "INV"): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${storeCode}-${dateStr}-${randomSuffix}`;
}

/**
 * Construct canonical InvoiceData snapshot from raw sale, items, payments, and settings records
 */
export function buildInvoiceData(
  sale: any,
  rawItems: any[] = [],
  rawPayments: any[] = [],
  settings: any = {}
): InvoiceData {
  const createdAt = sale?.created_at ? new Date(sale.created_at) : new Date();

  // 1. Business Info
  const business: BusinessInfo = {
    name: settings?.store_name || "Autopilot POS Retail",
    store_name: settings?.store_name || "Main Outlet",
    logo_url: settings?.logo_url || null,
    address: settings?.address || "Universal Retail Outlet",
    phone: settings?.phone || null,
    email: settings?.email || null,
    website: settings?.website || null,
    tax_number: settings?.tax_number || null,
    tax_label: settings?.tax_label || "VAT",
  };

  // 2. Transaction Info
  const transaction: TransactionInfo = {
    invoice_no: sale?.invoice_no || `INV-${Date.now()}`,
    sale_id: sale?.id,
    created_at: createdAt.toISOString(),
    date_formatted: createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
    time_formatted: createdAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    cashier_name: sale?.cashier_name || sale?.user_profiles?.full_name || "Cashier",
    store_code: sale?.store_code || "POS-1",
    payment_status: (sale?.payment_status as any) || "PAID",
    sale_status: (sale?.sale_status as any) || "COMPLETED",
    notes: sale?.notes || null,
  };

  // 3. Customer Info
  const customer: CustomerInfo | null = sale?.customer_name || sale?.customer_phone || sale?.customers?.name
    ? {
        id: sale?.customer_id || null,
        name: sale?.customer_name || sale?.customers?.name || "Walk-in Customer",
        phone: sale?.customer_phone || sale?.customers?.phone || null,
        email: sale?.customer_email || sale?.customers?.email || null,
        address: sale?.customer_address || sale?.customers?.address || null,
        loyalty_points: sale?.customers?.loyalty_points || 0,
      }
    : null;

  // 4. Line Items (Historical snapshot preserved)
  const items: InvoiceItem[] = rawItems.map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price ?? item.price ?? item.sell_price ?? 0);
    const cost = Number(item.unit_cost ?? item.cost ?? item.buy_price ?? 0);
    const itemDiscount = Number(item.discount_amount || 0);
    const itemTax = Number(item.tax_amount || 0);
    const subtotal = qty * price;
    const total = Number(item.total ?? subtotal - itemDiscount + itemTax);
    const profit = Number(item.profit ?? (price - cost) * qty);

    let serials: string[] = [];
    if (Array.isArray(item.serial_numbers)) {
      serials = item.serial_numbers;
    } else if (typeof item.serial_numbers === "string" && item.serial_numbers.startsWith("[")) {
      try {
        serials = JSON.parse(item.serial_numbers);
      } catch {
        serials = [];
      }
    }

    return {
      id: item.id || `item-${idx}`,
      product_id: item.product_id,
      name: item.product_name || item.name || "Product Item",
      sku: item.sku || item.master_sku || null,
      barcode: item.barcode || item.master_barcode || item.store_barcode || null,
      variant_title: item.variant_title || null,
      quantity: qty,
      unit_price: price,
      unit_cost: cost,
      subtotal,
      discount_amount: itemDiscount,
      tax_amount: itemTax,
      total,
      profit,
      serial_numbers: serials,
      batch_number: item.batch_number || null,
      expiry_date: item.expiry_date || null,
    };
  });

  // 5. Totals
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountTotal = Number(sale?.discount_amount ?? items.reduce((sum, i) => sum + i.discount_amount, 0));
  const taxTotal = Number(sale?.tax_amount ?? items.reduce((sum, i) => sum + i.tax_amount, 0));
  const grandTotal = Number(sale?.total ?? (subtotal - discountTotal + taxTotal));
  const paidAmount = Number(sale?.paid_amount ?? (rawPayments.length > 0 ? rawPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) : grandTotal));
  const changeAmount = Number(sale?.change_amount ?? Math.max(0, paidAmount - grandTotal));
  const dueAmount = Number(sale?.due_amount ?? Math.max(0, grandTotal - paidAmount));

  const totals: InvoiceTotals = {
    subtotal: subtotal > 0 ? subtotal : grandTotal,
    discount_total: discountTotal,
    tax_total: taxTotal,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    change_amount: changeAmount,
    due_amount: dueAmount,
  };

  // 6. Payments
  const payments: PaymentTender[] = rawPayments.length > 0
    ? rawPayments.map((p) => ({
        id: p.id,
        method: p.payment_method || p.method || "CASH",
        amount: Number(p.amount || 0),
        transaction_ref: p.transaction_ref || null,
        created_at: p.created_at || createdAt.toISOString(),
      }))
    : [
        {
          method: sale?.payment_method || "CASH",
          amount: paidAmount,
        },
      ];

  // 7. Store / Invoice Config
  const config: InvoiceConfig = {
    currency_code: settings?.currency_code || "BDT",
    currency_symbol: settings?.currency || settings?.currency_symbol || "৳",
    currency_position: (settings?.currency_position as any) || "BEFORE",
    tax_label: settings?.tax_label || "VAT",
    footer_message: settings?.receipt_footer || "Thank you for shopping with us! Please come again.",
    return_policy: settings?.return_policy || "Exchange available within 7 days with original receipt.",
    warranty_note: settings?.warranty_note || undefined,
    receipt_template: (settings?.receipt_template as any) || "thermal_80mm",
  };

  return {
    business,
    transaction,
    customer,
    items,
    totals,
    payments,
    config,
  };
}
