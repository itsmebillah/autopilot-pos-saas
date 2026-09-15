-- Atomic POS Checkout Stored Procedure
CREATE OR REPLACE FUNCTION create_sale_atomic(
    p_organization_id UUID,
    p_store_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID,
    p_discount_amount NUMERIC,
    p_items JSONB, -- Array of [{ "product_id": "...", "variant_id": null, "quantity": 2, "serial_numbers": ["..."], "batch_number": "..." }]
    p_payments JSONB, -- Array of [{ "payment_method": "CASH", "amount": 1000, "transaction_ref": "" }]
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_payment JSONB;
    v_sale_id UUID;
    v_invoice_no VARCHAR(100);
    v_store_record RECORD;
    v_prod_record RECORD;
    v_variant_record RECORD;
    
    v_subtotal NUMERIC(12,2) := 0.00;
    v_tax_amount NUMERIC(12,2) := 0.00;
    v_discount_amount NUMERIC(12,2) := COALESCE(p_discount_amount, 0.00);
    v_total NUMERIC(12,2) := 0.00;
    v_paid_amount NUMERIC(12,2) := 0.00;
    v_change_amount NUMERIC(12,2) := 0.00;
    v_due_amount NUMERIC(12,2) := 0.00;
    v_total_cost NUMERIC(12,2) := 0.00;
    v_total_profit NUMERIC(12,2) := 0.00;
    
    v_item_product_id UUID;
    v_item_variant_id UUID;
    v_item_quantity NUMERIC(12,2);
    v_item_unit_price NUMERIC(12,2);
    v_item_unit_cost NUMERIC(12,2);
    v_item_subtotal NUMERIC(12,2);
    v_item_tax NUMERIC(12,2);
    v_item_total NUMERIC(12,2);
    v_item_profit NUMERIC(12,2);
    v_item_serials JSONB;
    v_item_batch VARCHAR(100);
    v_serial_str TEXT;
    v_serial_record RECORD;
    v_payment_status VARCHAR(50);
    v_now TIMESTAMPTZ := NOW();
    v_seq_num BIGINT;
    v_date_prefix VARCHAR(20);
BEGIN
    -- 1. Fetch Store Configuration
    SELECT * INTO v_store_record FROM stores WHERE id = p_store_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Store not found: %', p_store_id;
    END IF;

    -- 2. Generate Sequential Invoice Number: INV-{STORE_CODE}-{YYYYMMDD}-{0001}
    v_date_prefix := to_char(v_now, 'YYYYMMDD');
    SELECT COUNT(id) + 1 INTO v_seq_num FROM sales 
    WHERE store_id = p_store_id AND to_char(created_at, 'YYYYMMDD') = v_date_prefix;
    
    v_invoice_no := 'INV-' || v_store_record.code || '-' || v_date_prefix || '-' || LPAD(v_seq_num::TEXT, 4, '0');

    -- 3. Calculate Item Prices, Validate Stock & Serials (Pessimistic Row Locking)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_product_id := (v_item->>'product_id')::UUID;
        v_item_variant_id := NULLIF(v_item->>'variant_id', '')::UUID;
        v_item_quantity := (v_item->>'quantity')::NUMERIC;
        v_item_serials := COALESCE(v_item->'serial_numbers', '[]'::jsonb);
        v_item_batch := v_item->>'batch_number';

        IF v_item_quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than 0';
        END IF;

        -- Lock and fetch store_product
        SELECT sp.*, mp.name as product_name, mp.tax_rate as master_tax_rate, mp.has_serials, mp.has_batches
        INTO v_prod_record
        FROM store_products sp
        JOIN master_products mp ON mp.id = sp.product_id
        WHERE sp.store_id = p_store_id AND sp.product_id = v_item_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % is not available in store %', v_item_product_id, p_store_id;
        END IF;

        IF NOT v_prod_record.is_available_for_sale THEN
            RAISE EXCEPTION 'Product % is disabled for sale', v_prod_record.product_name;
        END IF;

        -- Variant Pricing vs Base Pricing
        IF v_item_variant_id IS NOT NULL THEN
            SELECT * INTO v_variant_record 
            FROM store_product_variants 
            WHERE store_id = p_store_id AND variant_id = v_item_variant_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variant % not found for store %', v_item_variant_id, p_store_id;
            END IF;

            v_item_unit_price := v_variant_record.sell_price;
            v_item_unit_cost := v_variant_record.cost_price;

            IF v_variant_record.current_stock < v_item_quantity THEN
                RAISE EXCEPTION 'Insufficient variant stock for %. Available: %, Requested: %', 
                    v_prod_record.product_name, v_variant_record.current_stock, v_item_quantity;
            END IF;
        ELSE
            v_item_unit_price := v_prod_record.sell_price;
            v_item_unit_cost := v_prod_record.cost_price;

            IF v_prod_record.current_stock < v_item_quantity THEN
                RAISE EXCEPTION 'Insufficient stock for %. Available: %, Requested: %', 
                    v_prod_record.product_name, v_prod_record.current_stock, v_item_quantity;
            END IF;
        END IF;

        -- Serials Verification
        IF v_prod_record.has_serials THEN
            IF jsonb_array_length(v_item_serials) != v_item_quantity::INT THEN
                RAISE EXCEPTION 'Product % requires % serial number(s), but % provided', 
                    v_prod_record.product_name, v_item_quantity, jsonb_array_length(v_item_serials);
            END IF;

            FOR v_serial_str IN SELECT jsonb_array_elements_text(v_item_serials)
            LOOP
                SELECT * INTO v_serial_record FROM product_serials
                WHERE store_id = p_store_id AND serial_number = v_serial_str AND status = 'IN_STOCK'
                FOR UPDATE;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Serial number % is not in stock or invalid for product %', 
                        v_serial_str, v_prod_record.product_name;
                END IF;
            END LOOP;
        END IF;

        -- Line Totals
        v_item_subtotal := v_item_unit_price * v_item_quantity;
        v_item_tax := 0.00;
        
        -- Tax Calculation
        IF v_store_record.tax_mode = 'TAX_EXCLUSIVE' AND v_store_record.tax_rate > 0 THEN
            v_item_tax := ROUND((v_item_subtotal * (v_store_record.tax_rate / 100.0)), 2);
        END IF;

        v_item_total := v_item_subtotal + v_item_tax;
        v_item_profit := (v_item_unit_price - v_item_unit_cost) * v_item_quantity;

        v_subtotal := v_subtotal + v_item_subtotal;
        v_tax_amount := v_tax_amount + v_item_tax;
        v_total_cost := v_total_cost + (v_item_unit_cost * v_item_quantity);
        v_total_profit := v_total_profit + v_item_profit;
    END LOOP;

    -- 4. Calculate Final Financials
    v_total := v_subtotal + v_tax_amount - v_discount_amount;
    IF v_total < 0 THEN v_total := 0.00; END IF;

    -- Calculate Payments
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_paid_amount := v_paid_amount + (v_payment->>'amount')::NUMERIC;
    END LOOP;

    IF v_paid_amount >= v_total THEN
        v_change_amount := v_paid_amount - v_total;
        v_due_amount := 0.00;
        v_payment_status := 'PAID';
    ELSE
        v_change_amount := 0.00;
        v_due_amount := v_total - v_paid_amount;
        v_payment_status := CASE WHEN v_paid_amount > 0 THEN 'PARTIAL' ELSE 'DUE' END;
    END IF;

    -- 5. Insert Primary Sale Record
    INSERT INTO sales (
        organization_id, store_id, cashier_id, customer_id, invoice_no,
        subtotal, discount_amount, tax_amount, total, paid_amount, change_amount, due_amount,
        total_cost, total_profit, payment_status, sale_status, notes, created_at, updated_at
    ) VALUES (
        p_organization_id, p_store_id, p_cashier_id, p_customer_id, v_invoice_no,
        v_subtotal, v_discount_amount, v_tax_amount, v_total, v_paid_amount, v_change_amount, v_due_amount,
        v_total_cost, v_total_profit, v_payment_status, 'COMPLETED', p_notes, v_now, v_now
    ) RETURNING id INTO v_sale_id;

    -- 6. Insert Sale Items, Decrement Inventory & Append Stock Movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_product_id := (v_item->>'product_id')::UUID;
        v_item_variant_id := NULLIF(v_item->>'variant_id', '')::UUID;
        v_item_quantity := (v_item->>'quantity')::NUMERIC;
        v_item_serials := COALESCE(v_item->'serial_numbers', '[]'::jsonb);
        v_item_batch := v_item->>'batch_number';

        SELECT sp.*, mp.name as product_name INTO v_prod_record
        FROM store_products sp
        JOIN master_products mp ON mp.id = sp.product_id
        WHERE sp.store_id = p_store_id AND sp.product_id = v_item_product_id;

        IF v_item_variant_id IS NOT NULL THEN
            SELECT * INTO v_variant_record FROM store_product_variants
            WHERE store_id = p_store_id AND variant_id = v_item_variant_id;
            v_item_unit_price := v_variant_record.sell_price;
            v_item_unit_cost := v_variant_record.cost_price;

            -- Decrement variant stock
            UPDATE store_product_variants 
            SET current_stock = current_stock - v_item_quantity, updated_at = v_now
            WHERE store_id = p_store_id AND variant_id = v_item_variant_id;
        ELSE
            v_item_unit_price := v_prod_record.sell_price;
            v_item_unit_cost := v_prod_record.cost_price;
        END IF;

        -- Decrement store_product stock
        UPDATE store_products 
        SET current_stock = current_stock - v_item_quantity, updated_at = v_now
        WHERE store_id = p_store_id AND product_id = v_item_product_id;

        -- Insert Sale Line Item
        INSERT INTO sale_items (
            sale_id, product_id, variant_id, product_name, serial_numbers, batch_number,
            unit_price, unit_cost, quantity, subtotal, discount_amount, tax_amount, total, profit, created_at
        ) VALUES (
            v_sale_id, v_item_product_id, v_item_variant_id, v_prod_record.product_name, v_item_serials, v_item_batch,
            v_item_unit_price, v_item_unit_cost, v_item_quantity, (v_item_unit_price * v_item_quantity),
            0.00, 0.00, (v_item_unit_price * v_item_quantity), ((v_item_unit_price - v_item_unit_cost) * v_item_quantity), v_now
        );

        -- Record Immutable Stock Movement (Negative quantity for sale)
        INSERT INTO stock_movements (
            organization_id, store_id, product_id, variant_id, movement_type,
            quantity, previous_stock, new_stock, unit_cost, reference_id, reference_type, notes, created_by, created_at
        ) VALUES (
            p_organization_id, p_store_id, v_item_product_id, v_item_variant_id, 'SALE',
            (-1 * v_item_quantity), v_prod_record.current_stock, (v_prod_record.current_stock - v_item_quantity),
            v_item_unit_cost, v_sale_id, 'SALE', 'POS Sale: ' || v_invoice_no, p_cashier_id, v_now
        );

        -- Update Serial Numbers status to SOLD
        IF jsonb_array_length(v_item_serials) > 0 THEN
            FOR v_serial_str IN SELECT jsonb_array_elements_text(v_item_serials)
            LOOP
                UPDATE product_serials
                SET status = 'SOLD',
                    sale_id = v_sale_id,
                    warranty_expires_at = (v_now + (warranty_months || ' months')::interval)
                WHERE store_id = p_store_id AND serial_number = v_serial_str;
            END LOOP;
        END IF;

        -- Deplete Batch if batch specified
        IF v_item_batch IS NOT NULL AND v_item_batch != '' THEN
            UPDATE product_batches
            SET current_stock = current_stock - v_item_quantity
            WHERE store_id = p_store_id AND product_id = v_item_product_id AND batch_number = v_item_batch;
        END IF;
    END LOOP;

    -- 7. Insert Payment Tender Records
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO payments (
            sale_id, payment_method, amount, transaction_ref, created_at
        ) VALUES (
            v_sale_id,
            v_payment->>'payment_method',
            (v_payment->>'amount')::NUMERIC,
            v_payment->>'transaction_ref',
            v_now
        );
    END LOOP;

    -- 8. Customer Due Adjustment (Credit Sales)
    IF p_customer_id IS NOT NULL AND v_due_amount > 0 THEN
        UPDATE customers
        SET current_balance = current_balance + v_due_amount, updated_at = v_now
        WHERE id = p_customer_id;
    END IF;

    -- 9. Return Structured Checkout Result
    RETURN jsonb_build_object(
        'success', TRUE,
        'sale_id', v_sale_id,
        'invoice_no', v_invoice_no,
        'subtotal', v_subtotal,
        'tax_amount', v_tax_amount,
        'discount_amount', v_discount_amount,
        'total', v_total,
        'paid_amount', v_paid_amount,
        'change_amount', v_change_amount,
        'due_amount', v_due_amount,
        'payment_status', v_payment_status,
        'created_at', v_now
    );
END;
$$;
