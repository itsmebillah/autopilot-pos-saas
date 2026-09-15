-- Phase 1.8 Real Remote Database Verification Script
DO $$
DECLARE
  v_shop_cat_id UUID;

  v_org_a_id UUID := '00000000-0000-0000-0000-00000000000a';
  v_store_a_id UUID := '00000000-0000-0000-0000-00000000001a';
  v_user_a_id UUID := '00000000-0000-0000-0000-00000000002a';

  v_org_b_id UUID := '00000000-0000-0000-0000-00000000000b';
  v_store_b_id UUID := '00000000-0000-0000-0000-00000000001b';
  v_user_b_id UUID := '00000000-0000-0000-0000-00000000002b';

  v_master_prod_a UUID := '00000000-0000-0000-0000-00000000003a';
  v_store_prod_a UUID := '00000000-0000-0000-0000-00000000004a';

  v_master_prod_b UUID := '00000000-0000-0000-0000-00000000003b';
  v_store_prod_b UUID := '00000000-0000-0000-0000-00000000004b';

  v_checkout_res JSONB;
  v_sale_id UUID;
  v_final_stock NUMERIC;
  v_movement_count INT;
  v_insufficient_caught BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== STARTING PHASE 1.8 REMOTE DB VERIFICATION ===';

  SELECT id INTO v_shop_cat_id FROM shop_categories LIMIT 1;
  IF v_shop_cat_id IS NULL THEN
    RAISE EXCEPTION 'No shop_categories found in database';
  END IF;

  -- 1. Setup Isolated Test Tenants (Clean any previous run)
  DELETE FROM organizations WHERE id IN (v_org_a_id, v_org_b_id);
  DELETE FROM auth.users WHERE id IN (v_user_a_id, v_user_b_id);

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
    (v_user_a_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_alpha@autopilotpos.com', 'testpasshash', NOW(), '{"provider":"email"}', '{}', NOW(), NOW()),
    (v_user_b_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_beta@autopilotpos.com', 'testpasshash', NOW(), '{"provider":"email"}', '{}', NOW(), NOW());

  INSERT INTO organizations (id, name, slug) VALUES 
    (v_org_a_id, 'Test Org Alpha', 'test-org-alpha'),
    (v_org_b_id, 'Test Org Beta', 'test-org-beta');

  INSERT INTO stores (id, organization_id, shop_category_id, name, code) VALUES
    (v_store_a_id, v_org_a_id, v_shop_cat_id, 'Store Alpha Main', 'STA-01'),
    (v_store_b_id, v_org_b_id, v_shop_cat_id, 'Store Beta Main', 'STB-01');

  INSERT INTO user_profiles (id, full_name) VALUES
    (v_user_a_id, 'Cashier Alpha'),
    (v_user_b_id, 'Cashier Beta');

  INSERT INTO organization_members (organization_id, user_id, role) VALUES
    (v_org_a_id, v_user_a_id, 'cashier'),
    (v_org_b_id, v_user_b_id, 'cashier');

  INSERT INTO store_members (store_id, user_id) VALUES
    (v_store_a_id, v_user_a_id),
    (v_store_b_id, v_user_b_id);

  INSERT INTO master_products (id, organization_id, name, master_sku, master_barcode, default_sell_price, default_buy_price) VALUES
    (v_master_prod_a, v_org_a_id, 'Alpha Luxury Watch', 'ALPH-001', 'BAR-ALPH-01', 150.00, 80.00),
    (v_master_prod_b, v_org_b_id, 'Beta Wireless Headphone', 'BETA-001', 'BAR-BETA-01', 90.00, 45.00);

  INSERT INTO store_products (id, store_id, product_id, sell_price, cost_price, current_stock) VALUES
    (v_store_prod_a, v_store_a_id, v_master_prod_a, 150.00, 80.00, 10),
    (v_store_prod_b, v_store_b_id, v_master_prod_b, 90.00, 45.00, 20);

  RAISE NOTICE '✅ Isolated Test Data Setup Succeeded';

  -- 2. Test Atomic Checkout RPC Success Flow
  v_checkout_res := create_sale_atomic(
    p_organization_id := v_org_a_id,
    p_store_id := v_store_a_id,
    p_cashier_id := v_user_a_id,
    p_customer_id := NULL,
    p_discount_amount := 0,
    p_items := jsonb_build_array(
      jsonb_build_object(
        'product_id', v_master_prod_a,
        'quantity', 3
      )
    ),
    p_payments := jsonb_build_array(
      jsonb_build_object(
        'payment_method', 'CASH',
        'amount', 450.00
      )
    ),
    p_notes := 'Remote test sale checkout'
  );

  v_sale_id := (v_checkout_res->>'sale_id')::UUID;
  IF v_sale_id IS NULL THEN
    RAISE EXCEPTION 'Atomic checkout failed to return sale_id: %', v_checkout_res;
  END IF;

  SELECT current_stock INTO v_final_stock FROM store_products WHERE id = v_store_prod_a;
  IF v_final_stock <> 7 THEN
    RAISE EXCEPTION 'Expected stock after 3 units sold to be 7, found %', v_final_stock;
  END IF;

  SELECT count(*) INTO v_movement_count FROM stock_movements WHERE product_id = v_master_prod_a AND quantity = -3;
  IF v_movement_count <> 1 THEN
    RAISE EXCEPTION 'Expected 1 stock movement record with quantity = -3, found %', v_movement_count;
  END IF;

  RAISE NOTICE '✅ Atomic Checkout RPC Succeeded (Stock 10 -> 7, Movement Logged, Sale ID: %)', v_sale_id;

  -- 3. Test Insufficient Stock Rollback Flow
  BEGIN
    PERFORM create_sale_atomic(
      p_organization_id := v_org_a_id,
      p_store_id := v_store_a_id,
      p_cashier_id := v_user_a_id,
      p_customer_id := NULL,
      p_discount_amount := 0,
      p_items := jsonb_build_array(
        jsonb_build_object(
          'product_id', v_master_prod_a,
          'quantity', 50 -- only 7 available
        )
      ),
      p_payments := jsonb_build_array(
        jsonb_build_object('payment_method', 'CASH', 'amount', 7500.00)
      ),
      p_notes := 'Should fail due to insufficient stock'
    );
  EXCEPTION WHEN OTHERS THEN
    v_insufficient_caught := TRUE;
    RAISE NOTICE '✅ Expected Exception Caught on Oversell: %', SQLERRM;
  END;

  IF NOT v_insufficient_caught THEN
    RAISE EXCEPTION 'Failed: Atomic checkout did not reject overselling 50 units with only 7 in stock';
  END IF;

  -- Verify stock was not changed after failed transaction
  SELECT current_stock INTO v_final_stock FROM store_products WHERE id = v_store_prod_a;
  IF v_final_stock <> 7 THEN
    RAISE EXCEPTION 'Stock corrupted after rollback: expected 7, found %', v_final_stock;
  END IF;

  -- 4. Clean up Test Data Safely
  DELETE FROM organizations WHERE id IN (v_org_a_id, v_org_b_id);
  DELETE FROM auth.users WHERE id IN (v_user_a_id, v_user_b_id);

  RAISE NOTICE '✅ Test Data Cleanup Completed Successfully';
  RAISE NOTICE '=== ALL PHASE 1.8 REMOTE DB VERIFICATION CHECKS PASSED ===';
END $$;
