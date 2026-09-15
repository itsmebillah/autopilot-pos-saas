import { describe, it, expect } from 'vitest';
import { calculateCheckoutFinancials, validateCartSerials, CartItem, PaymentTender } from '../lib/pos-engine';
import { StoreProduct, MasterProduct } from '../types/database';

describe('Universal POS Financial Engine', () => {
  const mockMasterProduct: MasterProduct = {
    id: 'prod-001',
    organization_id: 'org-001',
    category_id: null,
    name: 'Rolex Submariner Date',
    brand: 'Rolex',
    model: '126610LN',
    master_sku: 'ROL-SUB-126610',
    master_barcode: '7613291234567',
    unit: 'pcs',
    default_buy_price: 8000,
    default_sell_price: 10500,
    tax_rate: null,
    min_stock_alert: 2,
    dynamic_attributes: { strap: 'Oystersteel', movement: 'Automatic' },
    has_variants: false,
    has_serials: true,
    has_batches: false,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockStoreProduct: StoreProduct = {
    id: 'sp-001',
    store_id: 'store-001',
    product_id: 'prod-001',
    store_sku: 'ROL-SUB-126610',
    store_barcode: '7613291234567',
    sell_price: 10500,
    cost_price: 8000,
    current_stock: 5,
    reorder_level: 2,
    tax_rate_override: null,
    is_available_for_sale: true,
    updated_at: new Date().toISOString(),
    master_product: mockMasterProduct,
  };

  it('calculates standard cash sale with exact payment', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 1,
        serial_numbers: ['ROL-SN-998811'],
      },
    ];

    const payments: PaymentTender[] = [
      {
        payment_method: 'CASH',
        amount: 10500,
      },
    ];

    const result = calculateCheckoutFinancials(items, payments, 0, 'TAX_EXCLUSIVE', 0);

    expect(result.subtotal).toBe(10500);
    expect(result.tax_amount).toBe(0);
    expect(result.discount_amount).toBe(0);
    expect(result.total).toBe(10500);
    expect(result.paid_amount).toBe(10500);
    expect(result.change_amount).toBe(0);
    expect(result.due_amount).toBe(0);
    expect(result.total_cost).toBe(8000);
    expect(result.total_profit).toBe(2500);
    expect(result.payment_status).toBe('PAID');
  });

  it('calculates sale with cash payment requiring change', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 2,
      },
    ];

    const payments: PaymentTender[] = [
      {
        payment_method: 'CASH',
        amount: 22000,
      },
    ];

    const result = calculateCheckoutFinancials(items, payments, 0, 'TAX_EXCLUSIVE', 0);

    expect(result.subtotal).toBe(21000);
    expect(result.total).toBe(21000);
    expect(result.paid_amount).toBe(22000);
    expect(result.change_amount).toBe(1000);
    expect(result.due_amount).toBe(0);
    expect(result.payment_status).toBe('PAID');
  });

  it('calculates partial payment / credit sale with customer due balance', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 1,
      },
    ];

    const payments: PaymentTender[] = [
      {
        payment_method: 'CASH',
        amount: 5000,
      },
    ];

    const result = calculateCheckoutFinancials(items, payments, 0, 'TAX_EXCLUSIVE', 0);

    expect(result.total).toBe(10500);
    expect(result.paid_amount).toBe(5000);
    expect(result.change_amount).toBe(0);
    expect(result.due_amount).toBe(5500);
    expect(result.payment_status).toBe('PARTIAL');
  });

  it('calculates zero-payment credit sale with full due balance', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 1,
      },
    ];

    const payments: PaymentTender[] = [];

    const result = calculateCheckoutFinancials(items, payments, 0, 'TAX_EXCLUSIVE', 0);

    expect(result.total).toBe(10500);
    expect(result.paid_amount).toBe(0);
    expect(result.due_amount).toBe(10500);
    expect(result.payment_status).toBe('DUE');
  });

  it('calculates tax-exclusive VAT correctly', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 1, // 10500
      },
    ];

    const payments: PaymentTender[] = [
      { payment_method: 'CARD', amount: 11287.5 },
    ];

    // 7.5% Tax
    const result = calculateCheckoutFinancials(items, payments, 0, 'TAX_EXCLUSIVE', 7.5);

    expect(result.subtotal).toBe(10500);
    expect(result.tax_amount).toBe(787.5);
    expect(result.total).toBe(11287.5);
    expect(result.paid_amount).toBe(11287.5);
    expect(result.payment_status).toBe('PAID');
  });

  it('calculates discounts and enforces non-negative totals', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 1, // 10500
      },
    ];

    const payments: PaymentTender[] = [
      { payment_method: 'CASH', amount: 10000 },
    ];

    // 500 Discount
    const result = calculateCheckoutFinancials(items, payments, 500, 'TAX_EXCLUSIVE', 0);

    expect(result.subtotal).toBe(10500);
    expect(result.discount_amount).toBe(500);
    expect(result.total).toBe(10000);
    expect(result.total_profit).toBe(2000); // 2500 - 500 discount
    expect(result.payment_status).toBe('PAID');
  });

  it('supports split payment multi-tender checkout', () => {
    const items: CartItem[] = [
      {
        product: mockStoreProduct,
        quantity: 2, // 21,000 total
      },
    ];

    const payments: PaymentTender[] = [
      { payment_method: 'CASH', amount: 10000 },
      { payment_method: 'CARD', amount: 6000, transaction_ref: 'TXN-9988' },
      { payment_method: 'BKASH', amount: 5000, transaction_ref: 'BKASH-7711' },
    ];

    const result = calculateCheckoutFinancials(items, payments, 0, 'TAX_EXCLUSIVE', 0);

    expect(result.total).toBe(21000);
    expect(result.paid_amount).toBe(21000);
    expect(result.change_amount).toBe(0);
    expect(result.due_amount).toBe(0);
    expect(result.payment_status).toBe('PAID');
  });
});

describe('Serial & IMEI Validation Engine', () => {
  const serializedMasterProduct: MasterProduct = {
    id: 'prod-002',
    organization_id: 'org-001',
    category_id: null,
    name: 'iPhone 15 Pro Max 256GB',
    brand: 'Apple',
    model: 'A3106',
    master_sku: 'APL-IP15PM-256',
    master_barcode: '195949012345',
    unit: 'pcs',
    default_buy_price: 1100,
    default_sell_price: 1299,
    tax_rate: null,
    min_stock_alert: 3,
    dynamic_attributes: { color: 'Natural Titanium', storage: '256GB' },
    has_variants: false,
    has_serials: true,
    has_batches: false,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const serializedStoreProduct: StoreProduct = {
    id: 'sp-002',
    store_id: 'store-001',
    product_id: 'prod-002',
    store_sku: 'APL-IP15PM-256',
    store_barcode: '195949012345',
    sell_price: 1299,
    cost_price: 1100,
    current_stock: 10,
    reorder_level: 3,
    tax_rate_override: null,
    is_available_for_sale: true,
    updated_at: new Date().toISOString(),
    master_product: serializedMasterProduct,
  };

  it('validates serial numbers when exact quantity match is provided', () => {
    const items: CartItem[] = [
      {
        product: serializedStoreProduct,
        quantity: 2,
        serial_numbers: ['356789012345678', '356789012345679'],
      },
    ];

    const result = validateCartSerials(items);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('flags error when serial numbers count is less than item quantity', () => {
    const items: CartItem[] = [
      {
        product: serializedStoreProduct,
        quantity: 2,
        serial_numbers: ['356789012345678'], // Only 1 provided for 2 items
      },
    ];

    const result = validateCartSerials(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('requires exactly 2 serial number(s), but 1 provided');
  });

  it('flags error when duplicate serial numbers are scanned for the same item', () => {
    const items: CartItem[] = [
      {
        product: serializedStoreProduct,
        quantity: 2,
        serial_numbers: ['356789012345678', '356789012345678'], // Duplicate!
      },
    ];

    const result = validateCartSerials(items);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Duplicate serial numbers provided');
  });
});
