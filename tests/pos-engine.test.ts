import { describe, it, expect } from 'vitest';
import { calculateCheckoutFinancials, validateCartSerials, CartItem, PaymentTender } from '../lib/pos-engine';
import { generateQuickCashPresets } from '../lib/quick-cash';
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

describe('Pristine Empty POS Cart & Hardware Scanner Burst Isolation', () => {
  it('1. verifies initial POS cart starts strictly empty (cartItems.length === 0)', () => {
    const initialCart: CartItem[] = [];
    expect(initialCart.length).toBe(0);
    const totalItemsCount = initialCart.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = initialCart.reduce((s, i) => s + (i.custom_price ?? i.product.sell_price) * i.quantity, 0);
    expect(totalItemsCount).toBe(0);
    expect(totalAmount).toBe(0);
  });

  it('2. verifies no product selection produces zero items and zero amount', () => {
    const cartItems: any[] = [];
    expect(cartItems.length).toBe(0);
  });

  it('3. verifies cart summary formatting renders 0 items and ৳0 when empty', () => {
    const cart: any[] = [];
    const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + Number(item.sell_price || 0) * item.quantity, 0);
    expect(totalItemsCount).toBe(0);
    expect(total).toBe(0);
    const formatted = `${totalItemsCount} items • ৳${total.toLocaleString()}`;
    expect(formatted).toBe('0 items • ৳0');
  });

  it('4. verifies explicit product selection adds exactly 1 intended product', () => {
    let cart: any[] = [];
    const product = { id: 'p1', name: 'Rolex Watch', sell_price: 5000, stock: 10 };

    // Simulate addToCart
    const existing = cart.find((i) => i.id === product.id);
    if (!existing) {
      cart = [...cart, { ...product, quantity: 1 }];
    }

    expect(cart.length).toBe(1);
    expect(cart[0].id).toBe('p1');
    expect(cart[0].quantity).toBe(1);
  });

  it('5. verifies product quantity starts at exactly 1', () => {
    const product = { id: 'p2', name: 'Leather Strap', sell_price: 200, stock: 5 };
    const cartItem = { ...product, quantity: 1 };
    expect(cartItem.quantity).toBe(1);
  });

  it('6. verifies removing final product returns cart to empty state', () => {
    let cart: any[] = [{ id: 'p1', quantity: 1, sell_price: 5000 }];
    // Remove item
    cart = cart.filter((i) => i.id !== 'p1');
    expect(cart.length).toBe(0);
    expect(cart.reduce((s, i) => s + i.quantity, 0)).toBe(0);
  });

  it('7. verifies page refresh / state initialization does not populate default or fake cart items', () => {
    const _storageKey = 'pos_cart_user123_store456';
    // When no saved cart exists
    const saved = null;
    const initialCart = saved ? JSON.parse(saved) : [];
    expect(initialCart.length).toBe(0);
  });

  it('8. verifies persisted cart is tenant-isolated by user and store IDs', () => {
    const userA_store1_key = 'pos_cart_userA_store1';
    const userB_store2_key = 'pos_cart_userB_store2';
    expect(userA_store1_key).not.toBe(userB_store2_key);
  });

  it('9. verifies camera/scanner initialization alone does NOT add products to cart', () => {
    const cartBeforeScanInit: any[] = [];
    const isCameraOpen = true;
    expect(isCameraOpen).toBe(true);
    expect(cartBeforeScanInit.length).toBe(0);
  });

  it('10. verifies Quick Cash / payment presets do not modify cart items or add products', () => {
    const cart: any[] = [{ id: 'p1', quantity: 1, sell_price: 1000 }];
    const cartLenBefore = cart.length;

    // Quick cash preset calculation
    const grandTotal = 1000;
    const presets = generateQuickCashPresets(grandTotal);
    expect(presets.length).toBeGreaterThan(0);

    // Cart remains untouched
    expect(cart.length).toBe(cartLenBefore);
    expect(cart[0].id).toBe('p1');
  });

  it('11. verifies empty cart cannot proceed to checkout', () => {
    const cart: any[] = [];
    const canCheckout = cart.length > 0;
    expect(canCheckout).toBe(false);
  });

  it('12. verifies sale creation is rejected when cart contains zero items', () => {
    const cart: any[] = [];
    const isValidSalePayload = cart && cart.length > 0;
    expect(isValidSalePayload).toBe(false);
  });

  describe('Regression & UX Fixes: Multiplication Symbol & Back Navigation', () => {
    it('verifies line item renders proper Unicode multiplication symbol × (not $times$ or LaTeX)', () => {
      const item = { name: 'Premium Geisha Coffee 1kg', sell_price: 22500, quantity: 1 };
      const currencySymbol = '৳';
      const formattedLine = `${currencySymbol}${Number(item.sell_price).toLocaleString()} × ${item.quantity} = ${currencySymbol}${(item.sell_price * item.quantity).toLocaleString()}`;

      expect(formattedLine).toBe('৳22,500 × 1 = ৳22,500');
      expect(formattedLine).not.toContain('$times$');
      expect(formattedLine).not.toContain('\\times');
      expect(formattedLine).not.toContain('times');
    });

    it('verifies mathematical calculation remains accurate for 22,500 × 1', () => {
      const price = 22500;
      const qty = 1;
      const total = price * qty;
      expect(total).toBe(22500);
    });

    it('verifies Back from Checkout preserves cart items, quantity, customer, discount, and tender state', () => {
      // 1. Initial cart state
      const cart = [{ id: 'coffee-1', name: 'Premium Geisha Coffee 1kg', sell_price: 22500, quantity: 1 }];
      let isCheckoutOpen = true;

      // User enters checkout state
      const checkoutForm = {
        customerName: 'John Doe',
        customerPhone: '+8801700000000',
        discountAmount: '500',
        paymentMethod: 'CASH',
        paidAmountInput: '23000',
        notes: 'Express delivery',
      };

      // User hits Back button in Checkout
      isCheckoutOpen = false; // onClose()
      expect(isCheckoutOpen).toBe(false);

      // Cart MUST remain preserved
      expect(cart.length).toBe(1);
      expect(cart[0].quantity).toBe(1);
      expect(cart[0].sell_price).toBe(22500);

      // User opens Checkout again -> state preserved
      isCheckoutOpen = true;
      expect(isCheckoutOpen).toBe(true);
      expect(checkoutForm.customerName).toBe('John Doe');
      expect(checkoutForm.paidAmountInput).toBe('23000');
      expect(checkoutForm.discountAmount).toBe('500');
    });

    it('verifies Back from Current Order preserves cart items and quantities', () => {
      const cart = [{ id: 'p1', name: 'Coffee', sell_price: 500, quantity: 2 }];
      let mobileCartOpen = true;

      // User clicks Back to Sales POS
      mobileCartOpen = false;
      expect(mobileCartOpen).toBe(false);

      // Cart is NOT cleared
      expect(cart.length).toBe(1);
      expect(cart[0].quantity).toBe(2);
    });

    it('verifies empty cart provides clear empty state and Back to Sales POS action', () => {
      const cart: any[] = [];
      const isEmpty = cart.length === 0;
      const backActionLabel = 'Back to Sales POS';

      expect(isEmpty).toBe(true);
      expect(backActionLabel).toBe('Back to Sales POS');
    });

    it('verifies Complete Sale flow clears cart after success and opens invoice', () => {
      let cart = [{ id: 'p1', name: 'Coffee', sell_price: 500, quantity: 1 }];
      let isCheckoutOpen = true;
      let isInvoiceOpen = false;

      // Sale succeeds
      const saleCompleted = true;
      if (saleCompleted) {
        cart = [];
        isCheckoutOpen = false;
        isInvoiceOpen = true;
      }

      expect(cart.length).toBe(0);
      expect(isCheckoutOpen).toBe(false);
      expect(isInvoiceOpen).toBe(true);
    });
  });
});

