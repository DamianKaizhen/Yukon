-- Sample quotes for testing the cabinet quoting system
SET search_path TO cabinet_system, public;

-- Create a function to generate sample quotes
CREATE OR REPLACE FUNCTION generate_sample_quotes()
RETURNS void AS $$
DECLARE
    quote_id UUID;
    customer_rec RECORD;
    product_rec RECORD;
    line_num INTEGER;
    quote_num INTEGER := 1000;
BEGIN
    -- Loop through some customers and create quotes
    FOR customer_rec IN (SELECT id, customer_number FROM customers LIMIT 5) LOOP
        -- Create a draft quote
        INSERT INTO quotes (
            quote_number,
            customer_id,
            quote_date,
            expiration_date,
            status,
            customer_notes,
            created_by
        ) VALUES (
            'Q-' || quote_num,
            customer_rec.id,
            CURRENT_DATE - INTERVAL '7 days',
            CURRENT_DATE + INTERVAL '23 days',
            'draft',
            'Sample quote for customer ' || customer_rec.customer_number,
            'system'
        ) RETURNING id INTO quote_id;
        
        line_num := 1;
        
        -- Add some random items to the quote
        FOR product_rec IN (
            SELECT DISTINCT 
                pv.id as variant_id,
                bm.id as material_id,
                pp.price
            FROM product_variants pv
            JOIN product_pricing pp ON pv.id = pp.product_variant_id
            JOIN box_materials bm ON pp.box_material_id = bm.id
            WHERE pp.is_active = true
            ORDER BY RANDOM()
            LIMIT 3 + (RANDOM() * 5)::INTEGER
        ) LOOP
            INSERT INTO quote_items (
                quote_id,
                line_number,
                product_variant_id,
                box_material_id,
                quantity,
                unit_price,
                line_total
            ) VALUES (
                quote_id,
                line_num,
                product_rec.variant_id,
                product_rec.material_id,
                1 + (RANDOM() * 5)::INTEGER,
                product_rec.price,
                product_rec.price * (1 + (RANDOM() * 5)::INTEGER)
            );
            
            line_num := line_num + 1;
        END LOOP;
        
        quote_num := quote_num + 1;
        
        -- Create a sent quote
        INSERT INTO quotes (
            quote_number,
            customer_id,
            quote_date,
            expiration_date,
            status,
            customer_notes,
            created_by
        ) VALUES (
            'Q-' || quote_num,
            customer_rec.id,
            CURRENT_DATE - INTERVAL '14 days',
            CURRENT_DATE + INTERVAL '16 days',
            'sent',
            'Follow-up quote for customer ' || customer_rec.customer_number,
            'system'
        ) RETURNING id INTO quote_id;
        
        line_num := 1;
        
        -- Add items to the sent quote
        FOR product_rec IN (
            SELECT DISTINCT 
                pv.id as variant_id,
                bm.id as material_id,
                pp.price
            FROM product_variants pv
            JOIN product_pricing pp ON pv.id = pp.product_variant_id
            JOIN box_materials bm ON pp.box_material_id = bm.id
            WHERE pp.is_active = true
            ORDER BY RANDOM()
            LIMIT 5 + (RANDOM() * 7)::INTEGER
        ) LOOP
            INSERT INTO quote_items (
                quote_id,
                line_number,
                product_variant_id,
                box_material_id,
                quantity,
                unit_price,
                discount_percent,
                line_total
            ) VALUES (
                quote_id,
                line_num,
                product_rec.variant_id,
                product_rec.material_id,
                1 + (RANDOM() * 3)::INTEGER,
                product_rec.price,
                CASE WHEN RANDOM() > 0.7 THEN 5 ELSE 0 END,
                product_rec.price * (1 + (RANDOM() * 3)::INTEGER) * 
                    CASE WHEN RANDOM() > 0.7 THEN 0.95 ELSE 1 END
            );
            
            line_num := line_num + 1;
        END LOOP;
        
        quote_num := quote_num + 1;
    END LOOP;
    
    -- Create some approved quotes
    UPDATE quotes 
    SET status = 'approved',
        approved_by = 'manager',
        approved_date = quote_date + INTERVAL '3 days'
    WHERE quote_number IN ('Q-1001', 'Q-1003', 'Q-1005');
    
    -- Create one expired quote
    UPDATE quotes
    SET status = 'expired'
    WHERE quote_number = 'Q-1007';
    
END;
$$ LANGUAGE plpgsql;

-- Execute the function to generate sample quotes
SELECT generate_sample_quotes();

-- Clean up
DROP FUNCTION generate_sample_quotes();

-- Display sample quote summary
SELECT 
    q.quote_number,
    c.company_name,
    q.status,
    q.quote_date,
    q.expiration_date,
    COUNT(qi.id) as line_items,
    q.subtotal,
    q.total_amount
FROM quotes q
JOIN customers c ON q.customer_id = c.id
LEFT JOIN quote_items qi ON q.id = qi.quote_id
GROUP BY q.id, q.quote_number, c.company_name, q.status, 
         q.quote_date, q.expiration_date, q.subtotal, q.total_amount
ORDER BY q.quote_number;