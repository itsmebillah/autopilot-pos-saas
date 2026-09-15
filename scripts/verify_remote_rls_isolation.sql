-- Phase 1.8 Real Remote RLS Multi-Tenant Isolation Verification
DO $$
DECLARE
  v_shop_cat_id UUID;

  v_org_a_id UUID := '10000000-0000-0000-0000-00000000000a';
  v_store_a_id UUID := '10000000-0000-0000-0000-00000000001a';
  v_user_a_id UUID := '10000000-0000-0000-0000-00000000002a';

  v_org_b_id UUID := '10000000-0000-0000-0000-00000000000b';
  v_store_b_id UUID := '10000000-0000-0000-0000-00000000001b';
  v_user_b_id UUID := '10000000-0000-0000-0000-00000000002b';

  v_cust_a UUID := '10000000-0000-0000-0000-00000000003a';
  v_cust_b UUID := '10000000-0000-0000-0000-00000000003b';

  v_master_prod_a UUID := '10000000-0000-0000-0000-00000000004a';
  v_master_prod_b UUID := '10000000-0000-0000-0000-00000000004b';

  v_store_prod_a UUID := '10000000-0000-0000-0000-00000000005a';
  v_store_prod_b UUID := '10000000-0000-0000-0000-00000000005b';

  v_visible_count INT;
BEGIN
  RAISE NOTICE '=== STARTING REAL REMOTE RLS ISOLATION TESTS ===';

  SELECT id INTO v_shop_cat_id FROM shop_categories LIMIT 1;

  -- Cleanup previous test runs
  DELETE FROM organizations WHERE id IN (v_org_a_id, v_org_b_id);
  DELETE FROM auth.users WHERE id IN (v_user_a_id, v_user_b_id);

  -- 1. Create Auth Users
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    (v_user_a_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls_alpha@autopilotpos.com', 'hash', NOW(), '{"provider":"email"}', '{}', NOW(), NOW()),
    (v_user_b_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls_beta@autopilotpos.com', 'hash', NOW(), '{"provider":"email"}', '{}', NOW(), NOW());

  -- 2. Create Organizations & Stores
  INSERT INTO organizations (id, name, slug) VALUES 
    (v_org_a_id, 'RLS Org Alpha', 'rls-org-alpha'),
    (v_org_b_id, 'RLS Org Beta', 'rls-org-beta');

  INSERT INTO stores (id, organization_id, shop_category_id, name, code) VALUES
    (v_store_a_id, v_org_a_id, v_shop_cat_id, 'RLS Store Alpha', 'RLS-STA'),
    (v_store_b_id, v_org_b_id, v_shop_cat_id, 'RLS Store Beta', 'RLS-STB');

  INSERT INTO user_profiles (id, full_name) VALUES
    (v_user_a_id, 'RLS User Alpha'),
    (v_user_b_id, 'RLS User Beta');

  INSERT INTO organization_members (organization_id, user_id, role) VALUES
    (v_org_a_id, v_user_a_id, 'cashier'),
    (v_org_b_id, v_user_b_id, 'cashier');

  INSERT INTO store_members (store_id, user_id) VALUES
    (v_store_a_id, v_user_a_id),
    (v_store_b_id, v_user_b_id);

  -- 3. Create Customers in Org A and Org B
  INSERT INTO customers (id, organization_id, name, phone) VALUES
    (v_cust_a, v_org_a_id, 'Customer Alpha', '+880170000001'),
    (v_cust_b, v_org_b_id, 'Customer Beta', '+880170000002');

  -- 4. Create Master & Store Products in Org/Store A and B
  INSERT INTO master_products (id, organization_id, name, master_sku, master_barcode, default_sell_price) VALUES
    (v_master_prod_a, v_org_a_id, 'Alpha Product', 'RLS-SKU-A', 'RLS-BAR-A', 100),
    (v_master_prod_b, v_org_b_id, 'Beta Product', 'RLS-SKU-B', 'RLS-BAR-B', 200);

  INSERT INTO store_products (id, store_id, product_id, sell_price, cost_price, current_stock) VALUES
    (v_store_prod_a, v_store_a_id, v_master_prod_a, 100, 50, 20),
    (v_store_prod_b, v_store_b_id, v_master_prod_b, 200, 100, 30);

  RAISE NOTICE '✅ RLS Test Fixtures Created';

  -- 5. Test Store Access Helper Functions with auth.uid() context
  PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

  IF NOT user_has_store_access(v_store_a_id) THEN
    RAISE EXCEPTION 'user_has_store_access failed for Store A and User A';
  END IF;

  IF user_has_store_access(v_store_b_id) THEN
    RAISE EXCEPTION 'CRITICAL: User A has illegal access to Store B!';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_b_id::text, true);

  IF NOT user_has_store_access(v_store_b_id) THEN
    RAISE EXCEPTION 'user_has_store_access failed for Store B and User B';
  END IF;

  IF user_has_store_access(v_store_a_id) THEN
    RAISE EXCEPTION 'CRITICAL: User B has illegal access to Store A!';
  END IF;

  RAISE NOTICE '✅ Store Security Membership Functions Verified';

  -- 6. Cleanup RLS Test Fixtures
  DELETE FROM organizations WHERE id IN (v_org_a_id, v_org_b_id);
  DELETE FROM auth.users WHERE id IN (v_user_a_id, v_user_b_id);

  RAISE NOTICE '✅ RLS Clean Up Completed Successfully';
  RAISE NOTICE '=== ALL REMOTE RLS VERIFICATION TESTS PASSED ===';
END $$;
