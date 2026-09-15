-- Seed Master Shop Categories with Attribute Schemas & Default Modules

INSERT INTO shop_categories (key, name, description, default_attributes, default_modules)
VALUES
(
    'WATCHES',
    'Watches & Timepieces',
    'Luxury timepieces, smartwatches, and fashion watches requiring serial tracking, warranty, and strap types.',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "model", "label": "Model / Reference", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "movement_type", "label": "Movement Type", "data_type": "select", "options": ["Automatic", "Quartz", "Manual", "Solar", "Smart"], "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "strap_type", "label": "Strap Type", "data_type": "select", "options": ["Leather", "Stainless Steel", "Rubber", "Titanium", "Nylon / NATO"], "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "dial_color", "label": "Dial Color", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "water_resistance", "label": "Water Resistance", "data_type": "text", "is_required": false, "show_in_pos": false, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_serial_imei", "mod_warranty", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'ELECTRONICS',
    'Electronics & Gadgets',
    'Consumer electronics, home appliances, and gadgets with serial numbers, technical specs, and warranties.',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "model", "label": "Model", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "warranty_months", "label": "Warranty (Months)", "data_type": "number", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "color", "label": "Color", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "voltage", "label": "Voltage / Power", "data_type": "text", "is_required": false, "show_in_pos": false, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_serial_imei", "mod_warranty", "mod_variants", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'MOBILE',
    'Mobile Phones & Accessories',
    'Smartphones, tablets, and phone accessories requiring dual IMEI tracking, battery health, and color/storage variants.',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "model", "label": "Model", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "storage", "label": "Storage Capacity", "data_type": "select", "options": ["64GB", "128GB", "256GB", "512GB", "1TB"], "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "ram", "label": "RAM", "data_type": "select", "options": ["4GB", "6GB", "8GB", "12GB", "16GB"], "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "color", "label": "Color", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "warranty_months", "label": "Warranty (Months)", "data_type": "number", "is_required": true, "show_in_pos": true, "show_on_receipt": true}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_serial_imei", "mod_warranty", "mod_variants", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'COSMETICS',
    'Cosmetics & Beauty',
    'Makeup, skincare, and fragrances with shades, sizes, batch tracking, and expiry date management.',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "shade", "label": "Shade / Tone", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": true},
        {"name": "volume_weight", "label": "Volume / Size (ml/g)", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "skin_type", "label": "Skin Type", "data_type": "select", "options": ["All Skin Types", "Oily", "Dry", "Combination", "Sensitive"], "is_required": false, "show_in_pos": false, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_batch", "mod_expiry", "mod_variants", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'FASHION',
    'Fashion & Apparel',
    'Clothing, footwear, and accessories supporting multi-dimensional matrix variants (Size x Color x Material).',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": true, "show_in_pos": true, "show_on_receipt": true},
        {"name": "gender", "label": "Gender / Department", "data_type": "select", "options": ["Men", "Women", "Unisex", "Kids", "Baby"], "is_required": false, "show_in_pos": true, "show_on_receipt": false},
        {"name": "material", "label": "Fabric / Material", "data_type": "text", "is_required": false, "show_in_pos": false, "show_on_receipt": false},
        {"name": "season", "label": "Season / Collection", "data_type": "select", "options": ["Summer", "Winter", "Spring/Fall", "All-Season"], "is_required": false, "show_in_pos": false, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_variants", "mod_returns", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'GROCERY',
    'Grocery & Supermarket',
    'Packaged goods and fresh produce with weighing scale support, barcode scanning, batches, and expiration tracking.',
    '[
        {"name": "brand", "label": "Brand / Producer", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": true},
        {"name": "pack_size", "label": "Pack Size", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": true},
        {"name": "origin", "label": "Country of Origin", "data_type": "text", "is_required": false, "show_in_pos": false, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_scale_weight", "mod_batch", "mod_expiry", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'HARDWARE',
    'Hardware & Building Materials',
    'Tools, fasteners, electrical and plumbing supplies with dimensions, materials, and fractional units.',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": true},
        {"name": "dimensions", "label": "Dimensions / Size", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": true},
        {"name": "material", "label": "Material Grade", "data_type": "text", "is_required": false, "show_in_pos": false, "show_on_receipt": false},
        {"name": "package_qty", "label": "Package Quantity", "data_type": "number", "is_required": false, "show_in_pos": true, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_scale_weight", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
),
(
    'GENERAL',
    'General Retail',
    'Standard retail stores with barcode inventory, categories, cash management, and customer dues.',
    '[
        {"name": "brand", "label": "Brand", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": true},
        {"name": "model", "label": "Model / Specification", "data_type": "text", "is_required": false, "show_in_pos": true, "show_on_receipt": false}
    ]'::jsonb,
    '["mod_pos", "mod_products", "mod_inventory", "mod_sales", "mod_customers", "mod_suppliers", "mod_expenses", "mod_reports"]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_attributes = EXCLUDED.default_attributes,
    default_modules = EXCLUDED.default_modules;
