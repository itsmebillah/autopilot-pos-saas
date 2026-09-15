import { StoreProduct, StoreProductVariant, PaymentMethod } from '@/types/database';

export interface CartItem {
  product: StoreProduct;
  variant?: StoreProductVariant;
  quantity: number;
  serial_numbers?: string[];
  batch_number?: string;
  custom_price?: number;
}

export interface PaymentTender {
  payment_method: PaymentMethod;
  amount: number;
  transaction_ref?: string;
}

export interface CheckoutCalculationResult {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  due_amount: number;
  total_cost: number;
  total_profit: number;
  payment_status: 'PAID' | 'PARTIAL' | 'DUE';
}

/**
 * Calculates authoritative financial breakdown for a cart
 */
export function calculateCheckoutFinancials(
  items: CartItem[],
  payments: PaymentTender[],
  discountAmount: number = 0,
  taxMode: 'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE' = 'TAX_EXCLUSIVE',
  taxRate: number = 0
): CheckoutCalculationResult {
  let subtotal = 0;
  let totalCost = 0;
  let totalTax = 0;

  for (const item of items) {
    const unitPrice = item.custom_price ?? item.variant?.sell_price ?? item.product.sell_price;
    const unitCost = item.variant?.cost_price ?? item.product.cost_price;
    const lineSubtotal = unitPrice * item.quantity;
    const lineCost = unitCost * item.quantity;

    subtotal += lineSubtotal;
    totalCost += lineCost;

    if (taxMode === 'TAX_EXCLUSIVE' && taxRate > 0) {
      const lineTax = Number(((lineSubtotal * taxRate) / 100).toFixed(2));
      totalTax += lineTax;
    }
  }

  const safeDiscount = Math.max(0, discountAmount);
  let total = Number((subtotal + totalTax - safeDiscount).toFixed(2));
  if (total < 0) total = 0;

  let paidAmount = 0;
  for (const p of payments) {
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

  const totalProfit = Number((subtotal - totalCost - safeDiscount).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax_amount: Number(totalTax.toFixed(2)),
    discount_amount: safeDiscount,
    total,
    paid_amount: paidAmount,
    change_amount: changeAmount,
    due_amount: dueAmount,
    total_cost: Number(totalCost.toFixed(2)),
    total_profit: totalProfit,
    payment_status: paymentStatus,
  };
}

/**
 * Validates serialized items in a cart
 */
export function validateCartSerials(items: CartItem[]): { valid: boolean; error?: string } {
  for (const item of items) {
    if (item.product.master_product?.has_serials) {
      const serials = item.serial_numbers || [];
      if (serials.length !== item.quantity) {
        return {
          valid: false,
          error: `Product "${item.product.master_product.name}" requires exactly ${item.quantity} serial number(s), but ${serials.length} provided.`,
        };
      }
      // Check for duplicates in the same line item
      const uniqueSerials = new Set(serials);
      if (uniqueSerials.size !== serials.length) {
        return {
          valid: false,
          error: `Duplicate serial numbers provided for "${item.product.master_product.name}".`,
        };
      }
    }
  }
  return { valid: true };
}
