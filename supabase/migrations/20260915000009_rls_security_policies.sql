-- Enable Row Level Security (RLS) on all tables

ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_shifts ENABLE ROW LEVEL SECURITY;

-- 1. shop_categories: Everyone authenticated can view taxonomy; super admin can modify
CREATE POLICY "Anyone can view shop categories"
ON shop_categories FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Super admins can manage shop categories"
ON shop_categories FOR ALL
TO authenticated
USING (is_platform_super_admin());

-- 2. organizations: Members can view their own organization
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (is_platform_super_admin() OR id IN (SELECT get_user_organizations()));

CREATE POLICY "Org owners can update organization"
ON organizations FOR UPDATE
TO authenticated
USING (
    is_platform_super_admin() OR id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role = 'owner' AND is_active = TRUE
    )
);

-- 3. stores: Accessible by assigned store members or org admins
CREATE POLICY "Users can view accessible stores"
ON stores FOR SELECT
TO authenticated
USING (user_has_store_access(id));

CREATE POLICY "Org owners and managers can update store"
ON stores FOR UPDATE
TO authenticated
USING (
    is_platform_super_admin() OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = TRUE
    )
);

-- 4. user_profiles: Users can view & edit their own profile; super admin can view all
CREATE POLICY "Users can manage own profile"
ON user_profiles FOR ALL
TO authenticated
USING (id = auth.uid() OR is_platform_super_admin());

-- 5. master_products & categories: Org members can view
CREATE POLICY "Org members can view master products"
ON master_products FOR SELECT
TO authenticated
USING (is_platform_super_admin() OR organization_id IN (SELECT get_user_organizations()));

CREATE POLICY "Managers and owners can mutate master products"
ON master_products FOR ALL
TO authenticated
USING (
    is_platform_super_admin() OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = TRUE
    )
);

CREATE POLICY "Org members can view categories"
ON categories FOR SELECT
TO authenticated
USING (is_platform_super_admin() OR organization_id IN (SELECT get_user_organizations()));

CREATE POLICY "Managers and owners can mutate categories"
ON categories FOR ALL
TO authenticated
USING (
    is_platform_super_admin() OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = TRUE
    )
);

-- 6. store_products: Users with store access can view
CREATE POLICY "Store staff can view store products"
ON store_products FOR SELECT
TO authenticated
USING (user_has_store_access(store_id));

CREATE POLICY "Managers and owners can mutate store products"
ON store_products FOR ALL
TO authenticated
USING (
    is_platform_super_admin() OR store_id IN (
        SELECT s.id FROM stores s
        JOIN organization_members om ON om.organization_id = s.organization_id
        WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'manager') AND om.is_active = TRUE
    )
);

-- 7. sales, sale_items, payments: Store staff can view and insert
CREATE POLICY "Store staff can view sales"
ON sales FOR SELECT
TO authenticated
USING (user_has_store_access(store_id));

CREATE POLICY "Store staff can insert sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (user_has_store_access(store_id));

CREATE POLICY "Store staff can view sale items"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id AND user_has_store_access(s.store_id)
    )
);

CREATE POLICY "Store staff can insert sale items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id AND user_has_store_access(s.store_id)
    )
);

CREATE POLICY "Store staff can view payments"
ON payments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = payments.sale_id AND user_has_store_access(s.store_id)
    )
);

CREATE POLICY "Store staff can insert payments"
ON payments FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = payments.sale_id AND user_has_store_access(s.store_id)
    )
);

-- 8. customers, customer_payments & suppliers
CREATE POLICY "Org members can view customers"
ON customers FOR SELECT
TO authenticated
USING (is_platform_super_admin() OR organization_id IN (SELECT get_user_organizations()));

CREATE POLICY "Org members can mutate customers"
ON customers FOR ALL
TO authenticated
USING (is_platform_super_admin() OR organization_id IN (SELECT get_user_organizations()));

CREATE POLICY "Org members can view suppliers"
ON suppliers FOR SELECT
TO authenticated
USING (is_platform_super_admin() OR organization_id IN (SELECT get_user_organizations()));

CREATE POLICY "Org members can mutate suppliers"
ON suppliers FOR ALL
TO authenticated
USING (
    is_platform_super_admin() OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager') AND is_active = TRUE
    )
);

-- 9. stock_movements & serials & batches
CREATE POLICY "Store staff can view stock movements"
ON stock_movements FOR SELECT
TO authenticated
USING (user_has_store_access(store_id));

CREATE POLICY "Store staff can view product serials"
ON product_serials FOR SELECT
TO authenticated
USING (user_has_store_access(store_id));

CREATE POLICY "Store staff can view product batches"
ON product_batches FOR SELECT
TO authenticated
USING (user_has_store_access(store_id));
