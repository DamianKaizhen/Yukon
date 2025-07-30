-- Cabinet Quoting System - Consolidate Cabinet Types Migration
-- Migration 003: Add consolidation fields and migrate cabinet type data
-- Created: 2025-07-28
-- Author: Database Architect Agent
-- Purpose: Consolidate cabinet types by size and add dimension extraction

-- Set search path for this migration
SET search_path TO cabinet_system, public;

-- ===========================================
-- 1. ADD NEW CONSOLIDATION FIELDS
-- ===========================================

-- Add new fields to products table
ALTER TABLE cabinet_system.products 
ADD COLUMN IF NOT EXISTS base_cabinet_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS width_inches_extracted DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN cabinet_system.products.base_cabinet_type IS 'Consolidated cabinet type (e.g., BFD, B-LR, W, 2DB)';
COMMENT ON COLUMN cabinet_system.products.display_name IS 'User-friendly display name (e.g., Base Cabinet Full Door)';
COMMENT ON COLUMN cabinet_system.products.width_inches_extracted IS 'Width extracted from item code (B30FD → 30.00)';

-- ===========================================
-- 2. CREATE CABINET TYPE MAPPING FUNCTION
-- ===========================================

-- Function to extract dimensions and consolidate cabinet types
CREATE OR REPLACE FUNCTION cabinet_system.analyze_and_consolidate_cabinet_type(item_code TEXT)
RETURNS TABLE(
    base_type VARCHAR(50),
    display_name VARCHAR(200),
    width_inches DECIMAL(5,2),
    height_inches DECIMAL(5,2),
    depth_inches DECIMAL(5,2),
    door_count INTEGER,
    drawer_count INTEGER,
    is_left_right BOOLEAN
) AS $$
DECLARE
    clean_code TEXT;
    numeric_part TEXT;
    width_val DECIMAL(5,2);
    height_val DECIMAL(5,2);
    depth_val DECIMAL(5,2);
BEGIN
    -- Initialize defaults
    width_inches := NULL;
    height_inches := NULL;
    depth_inches := NULL;
    door_count := 0;
    drawer_count := 0;
    is_left_right := FALSE;
    
    -- Clean the item code
    clean_code := UPPER(TRIM(item_code));
    
    -- Check for L/R variants
    IF clean_code ~ '-L/R$' THEN
        is_left_right := TRUE;
        clean_code := REGEXP_REPLACE(clean_code, '-L/R$', '');
    END IF;
    
    -- Extract numeric parts for dimensions
    -- Pattern: Extract first number sequence
    numeric_part := REGEXP_REPLACE(clean_code, '^[A-Z]*([0-9]+).*', '\1');
    IF numeric_part ~ '^[0-9]+$' THEN
        width_val := CAST(numeric_part AS DECIMAL(5,2));
    END IF;
    
    -- Base Cabinet Patterns
    IF clean_code ~ '^B[0-9]+FD' THEN
        base_type := CASE WHEN is_left_right THEN 'BFD-LR' ELSE 'BFD' END;
        display_name := CASE 
            WHEN is_left_right THEN 'Base Cabinet Full Door (Left/Right)'
            ELSE 'Base Cabinet Full Door'
        END;
        door_count := CASE WHEN is_left_right THEN 1 ELSE 2 END;
        width_inches := width_val;
        height_inches := 34.5; -- Standard base cabinet height
        depth_inches := 24.0;  -- Standard base cabinet depth
        
    ELSIF clean_code ~ '^B[0-9]+$' THEN
        base_type := CASE WHEN is_left_right THEN 'B-LR' ELSE 'B' END;
        display_name := CASE 
            WHEN is_left_right THEN 'Base Cabinet 1 Door 1 Drawer (Left/Right)'
            ELSE 'Base Cabinet 2 Door 1 Drawer'
        END;
        door_count := CASE WHEN is_left_right THEN 1 ELSE 2 END;
        drawer_count := 1;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^B[0-9]+[0-9]+' AND clean_code ~ '12$' THEN
        -- 12" Deep Base Cabinets (B1212, B1512, etc.)
        base_type := 'B12';
        display_name := '12" Deep Base Cabinet - 2 Door';
        door_count := 2;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := 12.0;
        
    ELSIF clean_code ~ '^BC[0-9]+[LR]' THEN
        -- Blind Corner Base Cabinets
        base_type := 'BC';
        display_name := 'Blind Corner Base Cabinet';
        door_count := 1;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^BLS[0-9]+' THEN
        -- Lazy Susan Base
        base_type := 'BLS';
        display_name := 'Lazy Susan Base Cabinet';
        door_count := 2;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^[0-9]+DB[0-9]+' THEN
        -- Multi-Drawer Base Cabinets
        drawer_count := CAST(REGEXP_REPLACE(clean_code, '^([0-9]+)DB.*', '\1') AS INTEGER);
        base_type := drawer_count || 'DB';
        display_name := drawer_count || ' Drawer Base Cabinet';
        door_count := 0;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^D[0-9]+' THEN
        -- Single Level Drawers Floating
        base_type := 'D';
        display_name := 'Single Level Drawer Floating';
        drawer_count := 1;
        width_inches := width_val;
        height_inches := 6.0; -- Drawer box height
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^SB[0-9]+' THEN
        -- Sink Base Cabinets
        base_type := 'SB';
        display_name := 'Sink Base Cabinet';
        door_count := 2;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := 24.0;
        
    -- Vanity Cabinets
    ELSIF clean_code ~ '^VSB[0-9]+' THEN
        base_type := 'VSB';
        display_name := 'Vanity Sink Base';
        door_count := 2;
        width_inches := width_val;
        height_inches := 31.0; -- Standard vanity height
        depth_inches := 21.0;  -- Standard vanity depth
        
    ELSIF clean_code ~ '^VB[0-9]+' THEN
        base_type := 'VB';
        display_name := 'Vanity Base - 2 Door 1 Drawer';
        door_count := 2;
        drawer_count := 1;
        width_inches := width_val;
        height_inches := 31.0;
        depth_inches := 21.0;
        
    ELSIF clean_code ~ '^V[0-9]+DB[0-9]+' THEN
        drawer_count := CAST(REGEXP_REPLACE(clean_code, '^V([0-9]+)DB.*', '\1') AS INTEGER);
        base_type := 'V' || drawer_count || 'DB';
        display_name := 'Vanity ' || drawer_count || ' Drawer Base';
        door_count := 0;
        width_inches := width_val;
        height_inches := 31.0;
        depth_inches := 21.0;
        
    ELSIF clean_code ~ '^VD[0-9]+' THEN
        base_type := 'VD';
        display_name := 'Vanity Single Drawer Floating';
        drawer_count := 1;
        width_inches := width_val;
        height_inches := 6.0;
        depth_inches := 21.0;
        
    ELSIF clean_code ~ '^VDB[0-9]+' THEN
        base_type := 'VDB';
        display_name := 'Vanity Floating Drawer Base';
        drawer_count := 2;
        width_inches := width_val;
        height_inches := 31.0;
        depth_inches := 21.0;
        
    ELSIF clean_code ~ '^ADA-VSB[0-9]+' THEN
        base_type := 'ADA-VSB';
        display_name := 'ADA Vanity Sink Base';
        door_count := 2;
        width_inches := width_val;
        height_inches := 31.0;
        depth_inches := CASE WHEN clean_code ~ '21$' THEN 21.0 ELSE 24.0 END;
        
    ELSIF clean_code ~ '^ADA-SB[0-9]+' THEN
        base_type := 'ADA-SB';
        display_name := 'ADA Sink Base';
        door_count := 2;
        width_inches := width_val;
        height_inches := 34.5;
        depth_inches := CASE WHEN clean_code ~ '21$' THEN 21.0 ELSE 24.0 END;
        
    -- Wall Cabinets
    ELSIF clean_code ~ '^W[0-9]+[0-9]+' THEN
        -- Extract height from second number
        height_val := CAST(REGEXP_REPLACE(clean_code, '^W[0-9]+([0-9]+)', '\1') AS DECIMAL(5,2));
        base_type := CASE WHEN is_left_right THEN 'W-LR' ELSE 'W' END;
        display_name := CASE 
            WHEN is_left_right THEN 'Wall Cabinet ' || height_val || 'H - Single Door'
            ELSE 'Wall Cabinet ' || height_val || 'H - Double Door'
        END;
        door_count := CASE WHEN is_left_right THEN 1 ELSE 2 END;
        width_inches := width_val;
        height_inches := height_val;
        depth_inches := 12.0; -- Standard wall cabinet depth
        
    -- Panel and Specialty Items
    ELSIF clean_code ~ '^PNL' THEN
        base_type := 'PNL';
        display_name := 'Decorative Panel';
        door_count := 0;
        
    ELSIF clean_code ~ '^PC' THEN
        base_type := CASE WHEN is_left_right THEN 'PC-LR' ELSE 'PC' END;
        display_name := 'Pantry Cabinet';
        door_count := CASE WHEN is_left_right THEN 1 ELSE 2 END;
        width_inches := width_val;
        height_inches := 84.0; -- Standard pantry height
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^LC' THEN
        base_type := CASE WHEN is_left_right THEN 'LC-LR' ELSE 'LC' END;
        display_name := 'Linen Cabinet';
        door_count := CASE WHEN is_left_right THEN 1 ELSE 2 END;
        width_inches := width_val;
        height_inches := 84.0;
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^F[0-9]+' THEN
        base_type := 'F';
        display_name := 'Filler Strip';
        door_count := 0;
        width_inches := width_val;
        
    ELSIF clean_code ~ '^MOC' THEN
        base_type := 'MOC';
        display_name := 'Microwave/Oven Cabinet';
        door_count := 2;
        width_inches := width_val;
        height_inches := 30.0;
        depth_inches := 24.0;
        
    ELSIF clean_code ~ '^WP[0-9]+' THEN
        base_type := 'WP';
        display_name := 'Wall Panel';
        door_count := 0;
        width_inches := width_val;
        
    ELSIF clean_code ~ '^BP[0-9]+' THEN
        base_type := 'BP';
        display_name := 'Base Panel';
        door_count := 0;
        width_inches := width_val;
        height_inches := 34.5;
        
    ELSIF clean_code ~ '^RP[0-9]+' THEN
        base_type := 'RP';
        display_name := 'Refrigerator Panel';
        door_count := 0;
        width_inches := width_val;
        
    ELSIF clean_code ~ '^DWP[0-9]+' THEN
        base_type := 'DWP';
        display_name := 'Dishwasher Panel';
        door_count := 0;
        width_inches := width_val;
        height_inches := 34.5;
        
    ELSIF clean_code ~ '^CF[0-9]+' THEN
        base_type := 'CF';
        display_name := 'Crown/Frieze';
        door_count := 0;
        width_inches := width_val;
        
    ELSIF clean_code ~ '^TK[0-9]+' THEN
        base_type := 'TK';
        display_name := 'Toe Kick';
        door_count := 0;
        width_inches := width_val;
        height_inches := 4.5;
        
    ELSE
        -- Default fallback
        base_type := REGEXP_REPLACE(clean_code, '[0-9]+.*', '');
        display_name := 'Cabinet - ' || clean_code;
        width_inches := width_val;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 3. DATA MIGRATION SCRIPT
-- ===========================================

-- Update products with consolidated information
DO $$
DECLARE
    product_record RECORD;
    analysis_result RECORD;
    update_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting cabinet type consolidation migration...';
    
    -- Process each product
    FOR product_record IN 
        SELECT id, item_code, name 
        FROM cabinet_system.products 
        WHERE base_cabinet_type IS NULL
        ORDER BY item_code
    LOOP
        -- Get analysis for this item code
        SELECT * INTO analysis_result 
        FROM cabinet_system.analyze_and_consolidate_cabinet_type(product_record.item_code);
        
        -- Update the product with consolidated information
        UPDATE cabinet_system.products 
        SET 
            base_cabinet_type = analysis_result.base_type,
            display_name = analysis_result.display_name,
            width_inches_extracted = analysis_result.width_inches,
            width_inches = COALESCE(width_inches, analysis_result.width_inches),
            height_inches = COALESCE(height_inches, analysis_result.height_inches),
            depth_inches = COALESCE(depth_inches, analysis_result.depth_inches),
            door_count = COALESCE(door_count, analysis_result.door_count),
            drawer_count = COALESCE(drawer_count, analysis_result.drawer_count),
            is_left_right = analysis_result.is_left_right,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = product_record.id;
        
        update_count := update_count + 1;
        
        -- Log progress every 50 products
        IF update_count % 50 = 0 THEN
            RAISE NOTICE 'Processed % products...', update_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Cabinet type consolidation completed. Updated % products.', update_count;
END $$;

-- ===========================================
-- 4. CREATE CONSOLIDATION VIEWS
-- ===========================================

-- View for consolidated product groups
CREATE OR REPLACE VIEW cabinet_system.consolidated_product_groups AS
SELECT 
    base_cabinet_type,
    display_name,
    COUNT(*) as product_count,
    MIN(width_inches_extracted) as min_width,
    MAX(width_inches_extracted) as max_width,
    ARRAY_AGG(DISTINCT width_inches_extracted ORDER BY width_inches_extracted) as available_widths,
    AVG(door_count) as avg_door_count,
    AVG(drawer_count) as avg_drawer_count,
    COUNT(*) FILTER (WHERE is_left_right = true) as left_right_variants,
    ARRAY_AGG(DISTINCT item_code ORDER BY item_code) as item_codes
FROM cabinet_system.products 
WHERE base_cabinet_type IS NOT NULL
GROUP BY base_cabinet_type, display_name
ORDER BY base_cabinet_type;

-- View for product catalog with consolidated types
CREATE OR REPLACE VIEW cabinet_system.product_catalog_consolidated AS
SELECT 
    p.id as product_id,
    p.item_code,
    p.name as product_name,
    p.description,
    p.base_cabinet_type,
    p.display_name,
    p.width_inches_extracted,
    p.width_inches,
    p.height_inches,
    p.depth_inches,
    p.door_count,
    p.drawer_count,
    p.is_left_right,
    ct.code as type_code,
    ct.name as type_name,
    cc.code as category_code,
    cc.name as category_name,
    array_agg(DISTINCT co.name ORDER BY co.name) as available_colors,
    array_agg(DISTINCT bm.name ORDER BY bm.name) as available_materials,
    MIN(pp.price) as min_price,
    MAX(pp.price) as max_price,
    COUNT(DISTINCT pv.id) as variant_count
FROM cabinet_system.products p
JOIN cabinet_system.cabinet_types ct ON p.cabinet_type_id = ct.id
JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
LEFT JOIN cabinet_system.product_variants pv ON p.id = pv.product_id AND pv.is_active = true
LEFT JOIN cabinet_system.color_options co ON pv.color_option_id = co.id AND co.is_active = true
LEFT JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id 
    AND pp.effective_date <= CURRENT_DATE 
    AND (pp.expiration_date IS NULL OR pp.expiration_date >= CURRENT_DATE)
LEFT JOIN cabinet_system.box_materials bm ON pp.box_material_id = bm.id AND bm.is_active = true
WHERE p.is_active = true AND ct.is_active = true AND cc.is_active = true
GROUP BY p.id, p.item_code, p.name, p.description, p.base_cabinet_type, p.display_name,
         p.width_inches_extracted, p.width_inches, p.height_inches, p.depth_inches,
         p.door_count, p.drawer_count, p.is_left_right, ct.code, ct.name, 
         cc.code, cc.name
ORDER BY p.base_cabinet_type, p.width_inches_extracted;

-- ===========================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ===========================================

-- Index on new consolidation fields
CREATE INDEX IF NOT EXISTS idx_products_base_cabinet_type 
    ON cabinet_system.products(base_cabinet_type);
    
CREATE INDEX IF NOT EXISTS idx_products_width_extracted 
    ON cabinet_system.products(width_inches_extracted);
    
CREATE INDEX IF NOT EXISTS idx_products_dimensions 
    ON cabinet_system.products(width_inches_extracted, height_inches, depth_inches);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_products_base_type_width 
    ON cabinet_system.products(base_cabinet_type, width_inches_extracted);

-- ===========================================
-- 6. UPDATE TABLE CONSTRAINTS
-- ===========================================

-- Add constraint to ensure base_cabinet_type is populated for active products
-- Note: We'll make this a soft constraint initially, can be made stricter later
-- ALTER TABLE cabinet_system.products 
-- ADD CONSTRAINT chk_base_cabinet_type_required 
-- CHECK (NOT is_active OR base_cabinet_type IS NOT NULL);

-- ===========================================
-- 7. VALIDATION AND REPORTING
-- ===========================================

-- Generate consolidation report
DO $$
DECLARE
    total_products INTEGER;
    consolidated_products INTEGER;
    unique_base_types INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_products FROM cabinet_system.products;
    SELECT COUNT(*) INTO consolidated_products FROM cabinet_system.products WHERE base_cabinet_type IS NOT NULL;
    SELECT COUNT(DISTINCT base_cabinet_type) INTO unique_base_types FROM cabinet_system.products WHERE base_cabinet_type IS NOT NULL;
    
    RAISE NOTICE '=== CABINET TYPE CONSOLIDATION REPORT ===';
    RAISE NOTICE 'Total products: %', total_products;
    RAISE NOTICE 'Products consolidated: %', consolidated_products;
    RAISE NOTICE 'Unique base cabinet types: %', unique_base_types;
    RAISE NOTICE 'Consolidation success rate: %%%', ROUND((consolidated_products * 100.0 / total_products), 2);
    RAISE NOTICE '';
    RAISE NOTICE 'Top 10 Base Cabinet Types:';
    
    -- Show top base types
    FOR record IN 
        SELECT base_cabinet_type, display_name, COUNT(*) as count
        FROM cabinet_system.products 
        WHERE base_cabinet_type IS NOT NULL
        GROUP BY base_cabinet_type, display_name
        ORDER BY COUNT(*) DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '  % (%) - % products', record.base_cabinet_type, record.display_name, record.count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Use these views to explore the consolidated data:';
    RAISE NOTICE '  - cabinet_system.consolidated_product_groups';
    RAISE NOTICE '  - cabinet_system.product_catalog_consolidated';
END $$;

-- Migration completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION 003 COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Cabinet type consolidation migration finished';
    RAISE NOTICE 'New fields added to products table:';
    RAISE NOTICE '  - base_cabinet_type: Consolidated cabinet type grouping';
    RAISE NOTICE '  - display_name: User-friendly display name';  
    RAISE NOTICE '  - width_inches_extracted: Width extracted from item code';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review the consolidation results using the views';
    RAISE NOTICE '2. Update frontend to use consolidated types for filtering';
    RAISE NOTICE '3. Consider creating size-based product variants for better UX';
END $$;

-- Reset search path
RESET search_path;