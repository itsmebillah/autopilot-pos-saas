export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ShopCategoryKey =
  | 'WATCHES'
  | 'ELECTRONICS'
  | 'MOBILE'
  | 'COSMETICS'
  | 'FASHION'
  | 'GROCERY'
  | 'HARDWARE'
  | 'JEWELRY'
  | 'GENERAL';

export type PlanTier = 'tier_free' | 'tier_starter' | 'tier_pro' | 'tier_enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended';
export type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory';
export type SerialStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';
export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'RETURN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'DAMAGE';
export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BKASH'
  | 'NAGAD'
  | 'ROCKET'
  | 'BANK_TRANSFER'
  | 'STORE_CREDIT';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'DUE' | 'REFUNDED';
export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'RETURNED';

export interface ShopCategory {
  id: string;
  key: ShopCategoryKey;
  name: string;
  description: string | null;
  default_attributes: Json;
  default_modules: string[];
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  billing_provider: string | null;
  billing_customer_id: string | null;
  subscription_id: string | null;
  current_period_end: string | null;
  max_stores: number;
  max_users: number;
  max_products: number;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  organization_id: string;
  shop_category_id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  currency_symbol: string;
  currency_position: 'BEFORE' | 'AFTER';
  timezone: string;
  locale: string;
  date_format: string;
  number_format: string;
  tax_mode: 'TAX_EXCLUSIVE' | 'TAX_INCLUSIVE';
  tax_label: string;
  tax_rate: number;
  tax_number: string | null;
  receipt_header: string | null;
  receipt_footer: string | null;
  receipt_template: string;
  logo_url: string | null;
  enabled_modules: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopAttributeDefinition {
  id: string;
  store_id: string;
  name: string;
  label: string;
  data_type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  options: string[];
  is_required: boolean;
  show_in_pos: boolean;
  show_on_receipt: boolean;
  is_filterable: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  category: string;
  purchase_cost: number;
  additional_cost: number;
  cost_breakdown?: Record<string, number>;
  buy_price: number; // Canonical Landed Cost
  sell_price: number;
  stock: number;
  min_stock?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterProduct {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  master_sku: string | null;
  master_barcode: string | null;
  unit: string;
  default_purchase_cost?: number;
  default_additional_cost?: number;
  cost_breakdown?: Record<string, number>;
  default_buy_price: number;
  default_sell_price: number;
  tax_rate: number | null;
  min_stock_alert: number;
  dynamic_attributes: Record<string, any>;
  has_variants: boolean;
  has_serials: boolean;
  has_batches: boolean;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreProduct {
  id: string;
  store_id: string;
  product_id: string;
  store_sku: string | null;
  store_barcode: string | null;
  sell_price: number;
  cost_price: number;
  purchase_cost?: number;
  additional_cost?: number;
  cost_breakdown?: Record<string, number>;
  current_stock: number;
  reorder_level: number;
  tax_rate_override: number | null;
  is_available_for_sale: boolean;
  updated_at: string;
  // Join fields
  master_product?: MasterProduct;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  variant_attributes: Record<string, string>;
  default_buy_price: number | null;
  default_sell_price: number;
  created_at: string;
}

export interface StoreProductVariant {
  id: string;
  store_id: string;
  variant_id: string;
  sell_price: number;
  cost_price: number;
  current_stock: number;
  updated_at: string;
}

export interface ProductSerial {
  id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  serial_number: string;
  imei_2: string | null;
  warranty_months: number;
  status: SerialStatus;
  sale_id: string | null;
  warranty_expires_at: string | null;
  created_at: string;
}

export interface ProductBatch {
  id: string;
  store_id: string;
  product_id: string;
  batch_number: string;
  manufacturing_date: string | null;
  expiry_date: string;
  unit_cost: number;
  current_stock: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  store_id: string;
  product_id: string;
  variant_id: string | null;
  movement_type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  current_balance: number;
  loyalty_points: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerPayment {
  id: string;
  organization_id: string;
  store_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  notes: string | null;
  received_by: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  organization_id: string;
  store_id: string;
  cashier_id: string;
  customer_id: string | null;
  invoice_no: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  due_amount: number;
  total_cost: number;
  total_profit: number;
  payment_status: PaymentStatus;
  sale_status: SaleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Join fields
  items?: SaleItem[];
  payments?: Payment[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  serial_numbers: string[];
  batch_number: string | null;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  profit: number;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  payment_method: PaymentMethod;
  amount: number;
  transaction_ref: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  store_id: string;
  category: string;
  amount: number;
  description: string | null;
  recorded_by: string;
  expense_date: string;
  created_at: string;
}

export interface CashRegisterShift {
  id: string;
  organization_id: string;
  store_id: string;
  cashier_id: string;
  opening_cash: number;
  expected_closing_cash: number;
  actual_closing_cash: number | null;
  cash_discrepancy: number | null;
  total_sales_amount: number;
  total_refunds_amount: number;
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}
