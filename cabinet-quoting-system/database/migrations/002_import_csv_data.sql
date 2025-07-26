-- Cabinet Quoting System Database Schema
-- Migration: 002_import_csv_data.sql
-- Description: Imports data from the CSV file into the normalized database structure

-- Set search path
SET search_path TO cabinet_system, public;

-- =====================================================
-- STEP 1: Create temporary import table
-- =====================================================

CREATE TEMP TABLE csv_import (
    color_option VARCHAR(200),
    item_code VARCHAR(100),
    description TEXT,
    price_particleboard VARCHAR(50),
    price_plywood VARCHAR(50),
    concatenated VARCHAR(300),
    price_uv_birch VARCHAR(50),
    price_white_plywood VARCHAR(50)
);

-- Note: The actual CSV import would be done via COPY command or application code
-- COPY csv_import FROM '/path/to/PricesLists cabinets.csv' DELIMITER ',' CSV HEADER;

-- =====================================================
-- STEP 2: Insert lookup data
-- =====================================================

-- Insert box materials
INSERT INTO box_materials (code, name, sort_order) VALUES
    ('PARTICLEBOARD', 'ParticleBoard Box', 1),
    ('PLYWOOD', 'Plywood Box', 2),
    ('UV_BIRCH', 'UV Birch Plywood', 3),
    ('WHITE_PLYWOOD', 'White Plywood', 4)
ON CONFLICT (code) DO NOTHING;

-- Insert color options from CSV data
INSERT INTO color_options (name, display_name)
SELECT DISTINCT 
    UPPER(REPLACE(color_option, ' ', '_')) as name,
    color_option as display_name
FROM csv_import
WHERE color_option IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- STEP 3: Parse and categorize cabinet types
-- =====================================================

-- Insert main cabinet categories
INSERT INTO cabinet_categories (code, name, sort_order) VALUES
    ('BASE', 'Base Cabinets', 1),
    ('WALL', 'Wall Cabinets', 2),
    ('TALL', 'Tall Cabinets', 3),
    ('VANITY', 'Vanity Cabinets', 4),
    ('SPECIALTY', 'Specialty Cabinets', 5)
ON CONFLICT (code) DO NOTHING;

-- Insert cabinet types based on patterns in descriptions
INSERT INTO cabinet_types (code, name, category_id)
SELECT DISTINCT ON (code) code, name, category_id
FROM (
    -- Base Cabinets
    SELECT 'BASE_FULL_DOOR' as code, 'Base Cabinet Full Door' as name, 
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%Base Cabinet Full Door%'
    
    UNION
    SELECT 'BASE_STANDARD' as code, 'Base Cabinet' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%Base Cabinet-%' AND description LIKE '%Door%Drawer%'
    
    UNION
    SELECT 'BASE_BLIND_CORNER' as code, 'Blind Corner Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%Blind Corner Base%'
    
    UNION
    SELECT 'BASE_LAZY_SUSAN' as code, 'Lazy Susan Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%Lazy Suzan Base%'
    
    UNION
    SELECT 'BASE_DRAWER' as code, 'Drawer Base Cabinet' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%Drawer Base Cabinet%'
    
    UNION
    SELECT 'BASE_12D' as code, '12" Deep Base Cabinet' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%12"D Base%'
    
    UNION
    SELECT 'SINK_BASE' as code, 'Sink Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%Sink Base%' AND description NOT LIKE '%ADA%' AND description NOT LIKE '%Vanity%'
    
    UNION
    SELECT 'ADA_SINK_BASE' as code, 'ADA Sink Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'BASE') as category_id
    FROM csv_import WHERE description LIKE '%ADA Sink Base%'
    
    -- Wall Cabinets
    UNION
    SELECT 'WALL_STANDARD' as code, 'Wall Cabinet' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'WALL') as category_id
    FROM csv_import WHERE description LIKE '%Wall Cabinet%H%' AND description NOT LIKE '%Flip Up%'
    
    UNION
    SELECT 'WALL_FLIP_UP' as code, 'Wall Cabinet Flip Up' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'WALL') as category_id
    FROM csv_import WHERE description LIKE '%Wall Cabinet - Flip Up%'
    
    UNION
    SELECT 'WALL_FRIDGE' as code, 'Wall Fridge Unit' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'WALL') as category_id
    FROM csv_import WHERE description LIKE '%Wall Fridge Unit%'
    
    -- Vanity Cabinets
    UNION
    SELECT 'VANITY_SINK_BASE' as code, 'Vanity Sink Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'VANITY') as category_id
    FROM csv_import WHERE description LIKE '%Vanity Sink Base%'
    
    UNION
    SELECT 'VANITY_BASE' as code, 'Vanity Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'VANITY') as category_id
    FROM csv_import WHERE description LIKE '%Vanity Base%' AND description NOT LIKE '%Drawer Base%'
    
    UNION
    SELECT 'VANITY_DRAWER_BASE' as code, 'Vanity Drawer Base' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'VANITY') as category_id
    FROM csv_import WHERE description LIKE '%Vanity%Drawer Base%'
    
    UNION
    SELECT 'VANITY_FLOATING' as code, 'Vanity Floating' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'VANITY') as category_id
    FROM csv_import WHERE description LIKE '%Vanity%Floating%'
    
    UNION
    SELECT 'VANITY_HEAD_KNOCKER' as code, 'Vanity Head Knocker' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'WALL') as category_id
    FROM csv_import WHERE description LIKE '%Vanity Head Knocker%'
    
    -- Tall Cabinets
    UNION
    SELECT 'PANTRY' as code, 'Pantry Cabinet' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'TALL') as category_id
    FROM csv_import WHERE description LIKE '%Pantry%'
    
    UNION
    SELECT 'OVEN_CABINET' as code, 'Oven Cabinet' as name,
           (SELECT id FROM cabinet_categories WHERE code = 'TALL') as category_id
    FROM csv_import WHERE description LIKE '%Oven Cabinet%'
) t
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- STEP 4: Import products with dimension parsing
-- =====================================================

-- Function to extract dimensions from item codes
CREATE OR REPLACE FUNCTION parse_dimensions(item_code VARCHAR, description VARCHAR)
RETURNS TABLE(width DECIMAL, height DECIMAL, depth DECIMAL) AS $$
DECLARE
    width_val DECIMAL;
    height_val DECIMAL;
    depth_val DECIMAL;
BEGIN
    -- Extract width (first number in item code after letters)
    width_val := NULLIF(SUBSTRING(item_code FROM '[A-Z]+(\d+)' FOR 2)::DECIMAL, 0);
    
    -- Extract height from description patterns like "36H", "42H", etc.
    height_val := NULLIF(SUBSTRING(description FROM '(\d+)H' FOR 1)::DECIMAL, 0);
    
    -- Extract depth from description patterns like "21"D", "24"D", etc.
    depth_val := NULLIF(SUBSTRING(description FROM '(\d+)"D' FOR 1)::DECIMAL, 0);
    
    -- Default depth for standard cabinets if not specified
    IF depth_val IS NULL AND item_code LIKE 'B%' THEN
        depth_val := 24; -- Standard base cabinet depth
    ELSIF depth_val IS NULL AND item_code LIKE 'W%' THEN
        depth_val := 12; -- Standard wall cabinet depth
    END IF;
    
    RETURN QUERY SELECT width_val, height_val, depth_val;
END;
$$ LANGUAGE plpgsql;

-- Insert products
INSERT INTO products (
    item_code, 
    name, 
    description,
    cabinet_type_id,
    width,
    height,
    depth,
    door_count,
    drawer_count,
    is_left_right
)
SELECT DISTINCT ON (item_code)
    item_code,
    description as name,
    description,
    CASE
        -- Base Cabinets
        WHEN description LIKE '%Base Cabinet Full Door%' THEN 
            (SELECT id FROM cabinet_types WHERE code = 'BASE_FULL_DOOR')
        WHEN description LIKE '%Base Cabinet-%' AND description LIKE '%Door%Drawer%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'BASE_STANDARD')
        WHEN description LIKE '%Blind Corner Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'BASE_BLIND_CORNER')
        WHEN description LIKE '%Lazy Suzan Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'BASE_LAZY_SUSAN')
        WHEN description LIKE '%Drawer Base Cabinet%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'BASE_DRAWER')
        WHEN description LIKE '%12"D Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'BASE_12D')
        WHEN description LIKE '%ADA Sink Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'ADA_SINK_BASE')
        WHEN description LIKE '%Sink Base%' AND description NOT LIKE '%Vanity%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'SINK_BASE')
            
        -- Wall Cabinets
        WHEN description LIKE '%Wall Cabinet%' AND description LIKE '%Flip Up%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'WALL_FLIP_UP')
        WHEN description LIKE '%Wall Cabinet%H%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'WALL_STANDARD')
        WHEN description LIKE '%Wall Fridge Unit%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'WALL_FRIDGE')
        WHEN description LIKE '%Vanity Head Knocker%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'VANITY_HEAD_KNOCKER')
            
        -- Vanity Cabinets
        WHEN description LIKE '%Vanity Sink Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'VANITY_SINK_BASE')
        WHEN description LIKE '%Vanity%Drawer Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'VANITY_DRAWER_BASE')
        WHEN description LIKE '%Vanity Base%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'VANITY_BASE')
        WHEN description LIKE '%Vanity%Floating%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'VANITY_FLOATING')
            
        -- Tall Cabinets
        WHEN description LIKE '%Pantry%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'PANTRY')
        WHEN description LIKE '%Oven Cabinet%' THEN
            (SELECT id FROM cabinet_types WHERE code = 'OVEN_CABINET')
            
        ELSE NULL
    END as cabinet_type_id,
    (parse_dimensions(item_code, description)).width,
    (parse_dimensions(item_code, description)).height,
    (parse_dimensions(item_code, description)).depth,
    CASE
        WHEN description LIKE '%2 Door%' OR description LIKE '%2Door%' OR description LIKE '%Double Door%' THEN 2
        WHEN description LIKE '%1 Door%' OR description LIKE '%1Door%' OR description LIKE '%Single Door%' THEN 1
        ELSE 0
    END as door_count,
    CASE
        WHEN description LIKE '%3 Drawer%' OR description LIKE '%3Drawer%' THEN 3
        WHEN description LIKE '%2 Drawer%' OR description LIKE '%2Drawer%' THEN 2
        WHEN description LIKE '%1 Drawer%' OR description LIKE '%1Drawer%' OR description LIKE '%Single Drawer%' THEN 1
        ELSE 0
    END as drawer_count,
    item_code LIKE '%-L/R' as is_left_right
FROM csv_import
WHERE item_code IS NOT NULL
ON CONFLICT (item_code) DO NOTHING;

-- =====================================================
-- STEP 5: Create product variants
-- =====================================================

INSERT INTO product_variants (product_id, color_option_id, sku)
SELECT 
    p.id as product_id,
    co.id as color_option_id,
    ci.concatenated as sku
FROM csv_import ci
JOIN products p ON ci.item_code = p.item_code
JOIN color_options co ON UPPER(REPLACE(ci.color_option, ' ', '_')) = co.name
WHERE ci.concatenated IS NOT NULL
ON CONFLICT (product_id, color_option_id) DO NOTHING;

-- =====================================================
-- STEP 6: Import pricing data
-- =====================================================

-- Function to clean price strings
CREATE OR REPLACE FUNCTION clean_price(price_str VARCHAR)
RETURNS DECIMAL AS $$
BEGIN
    -- Remove dollar signs, commas, and spaces
    RETURN NULLIF(REGEXP_REPLACE(price_str, '[$,\s]', '', 'g'), '')::DECIMAL;
END;
$$ LANGUAGE plpgsql;

-- Import ParticleBoard prices
INSERT INTO product_pricing (product_variant_id, box_material_id, price)
SELECT 
    pv.id,
    (SELECT id FROM box_materials WHERE code = 'PARTICLEBOARD'),
    clean_price(ci.price_particleboard)
FROM csv_import ci
JOIN products p ON ci.item_code = p.item_code
JOIN color_options co ON UPPER(REPLACE(ci.color_option, ' ', '_')) = co.name
JOIN product_variants pv ON pv.product_id = p.id AND pv.color_option_id = co.id
WHERE clean_price(ci.price_particleboard) IS NOT NULL
ON CONFLICT (product_variant_id, box_material_id, effective_date) DO NOTHING;

-- Import Plywood prices
INSERT INTO product_pricing (product_variant_id, box_material_id, price)
SELECT 
    pv.id,
    (SELECT id FROM box_materials WHERE code = 'PLYWOOD'),
    clean_price(ci.price_plywood)
FROM csv_import ci
JOIN products p ON ci.item_code = p.item_code
JOIN color_options co ON UPPER(REPLACE(ci.color_option, ' ', '_')) = co.name
JOIN product_variants pv ON pv.product_id = p.id AND pv.color_option_id = co.id
WHERE clean_price(ci.price_plywood) IS NOT NULL
ON CONFLICT (product_variant_id, box_material_id, effective_date) DO NOTHING;

-- Import UV Birch prices
INSERT INTO product_pricing (product_variant_id, box_material_id, price)
SELECT 
    pv.id,
    (SELECT id FROM box_materials WHERE code = 'UV_BIRCH'),
    clean_price(ci.price_uv_birch)
FROM csv_import ci
JOIN products p ON ci.item_code = p.item_code
JOIN color_options co ON UPPER(REPLACE(ci.color_option, ' ', '_')) = co.name
JOIN product_variants pv ON pv.product_id = p.id AND pv.color_option_id = co.id
WHERE clean_price(ci.price_uv_birch) IS NOT NULL
ON CONFLICT (product_variant_id, box_material_id, effective_date) DO NOTHING;

-- Import White Plywood prices
INSERT INTO product_pricing (product_variant_id, box_material_id, price)
SELECT 
    pv.id,
    (SELECT id FROM box_materials WHERE code = 'WHITE_PLYWOOD'),
    clean_price(ci.price_white_plywood)
FROM csv_import ci
JOIN products p ON ci.item_code = p.item_code
JOIN color_options co ON UPPER(REPLACE(ci.color_option, ' ', '_')) = co.name
JOIN product_variants pv ON pv.product_id = p.id AND pv.color_option_id = co.id
WHERE clean_price(ci.price_white_plywood) IS NOT NULL
ON CONFLICT (product_variant_id, box_material_id, effective_date) DO NOTHING;

-- =====================================================
-- STEP 7: Initialize inventory records
-- =====================================================

-- Create inventory records for all product variants (with zero stock initially)
INSERT INTO inventory (product_variant_id, quantity_on_hand, quantity_reserved)
SELECT id, 0, 0
FROM product_variants
ON CONFLICT (product_variant_id) DO NOTHING;

-- =====================================================
-- STEP 8: Clean up
-- =====================================================

DROP FUNCTION IF EXISTS parse_dimensions(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS clean_price(VARCHAR);

-- =====================================================
-- STEP 9: Verification queries
-- =====================================================

-- Show import statistics
DO $$
DECLARE
    color_count INTEGER;
    product_count INTEGER;
    variant_count INTEGER;
    price_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO color_count FROM color_options;
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO variant_count FROM product_variants;
    SELECT COUNT(*) INTO price_count FROM product_pricing;
    
    RAISE NOTICE 'Import completed:';
    RAISE NOTICE '  Color options: %', color_count;
    RAISE NOTICE '  Products: %', product_count;
    RAISE NOTICE '  Product variants: %', variant_count;
    RAISE NOTICE '  Prices: %', price_count;
END $$;