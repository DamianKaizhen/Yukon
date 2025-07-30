-- Cabinet Quoting System - Sample Quote Data
-- Seed Script 002: Create sample quotes and quote items for testing
-- Created: 2025-07-27
-- Author: Database Architect Agent

SET search_path TO cabinet_system, public;

-- ===========================================
-- SAMPLE QUOTES FOR TESTING
-- ===========================================

-- Create sample quotes (these will be populated after CSV import when products exist)
-- For now, create the quote structure without items

-- Quote 1: Modern Kitchen Project
INSERT INTO cabinet_system.quotes (
    quote_number, created_by_user_id, customer_id,
    customer_name, customer_email, customer_phone, customer_address,
    project_name, project_description, status,
    tax_rate, delivery_fee, installation_fee,
    valid_until, terms_and_conditions, notes
) VALUES (
    'Q-2025-0001',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com'),
    (SELECT id FROM cabinet_system.customers WHERE contact_name = 'Sarah Johnson'),
    'Sarah Johnson - Modern Kitchen Designs Inc.',
    'sarah@modernkitchendesigns.com',
    '(555) 123-4567',
    '123 Design Street, Suite 100, Toronto, ON M5V 3A5',
    'Downtown Condo Kitchen Renovation',
    'Complete kitchen renovation for luxury downtown condominium. Modern design with clean lines, premium finishes, and efficient storage solutions.',
    'draft',
    0.13, -- 13% HST for Ontario
    250.00, -- Delivery fee
    1500.00, -- Installation fee
    CURRENT_DATE + INTERVAL '30 days',
    'Quote valid for 30 days. 50% deposit required upon acceptance. Balance due upon completion. Installation includes cabinet assembly and basic plumbing/electrical connections.',
    'Customer prefers "A Touch of Nature" finish. Requires soft-close hinges and full-extension drawer slides.'
);

-- Quote 2: Heritage Home Restoration
INSERT INTO cabinet_system.quotes (
    quote_number, created_by_user_id, customer_id,
    customer_name, customer_email, customer_phone, customer_address,
    project_name, project_description, status,
    tax_rate, delivery_fee, installation_fee,
    valid_until, terms_and_conditions, notes
) VALUES (
    'Q-2025-0002',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com'),
    (SELECT id FROM cabinet_system.customers WHERE contact_name = 'Michael Chen'),
    'Michael Chen - Heritage Home Renovations',
    'michael@heritagehome.ca',
    '(555) 234-5678',
    '456 Renovation Road, Vancouver, BC V6B 1A1',
    'Victorian Home Kitchen Restoration',
    'Restoration of kitchen in 1920s Victorian home. Period-appropriate styling with modern functionality. Focus on preserving historical character.',
    'sent',
    0.12, -- 12% PST for BC
    300.00, -- Delivery fee
    2000.00, -- Installation fee
    CURRENT_DATE + INTERVAL '21 days',
    'Quote valid for 21 days. Custom millwork requires 6-8 week lead time. Payment terms: 40% deposit, 40% at delivery, 20% upon completion.',
    'Requires "Classics Limited" finish to match existing millwork. Custom heights needed for period authenticity.',
    sent_at
) VALUES (
    -- (previous values),
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Quote 3: Bulk Condo Development
INSERT INTO cabinet_system.quotes (
    quote_number, created_by_user_id, customer_id,
    customer_name, customer_email, customer_phone, customer_address,
    project_name, project_description, status,
    tax_rate, delivery_fee, installation_fee,
    valid_until, terms_and_conditions, notes
) VALUES (
    'Q-2025-0003',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com'),
    (SELECT id FROM cabinet_system.customers WHERE contact_name = 'Emma Rodriguez'),
    'Emma Rodriguez - Luxury Condos Development',
    'emma@luxurycondos.com',
    '(555) 345-6789',
    '789 Development Drive, Calgary, AB T2P 2M5',
    'Luxury Tower Phase 2 - Kitchen Packages',
    'Kitchen cabinet packages for 48 luxury condominium units. Three different layout configurations (A, B, C) with premium finishes throughout.',
    'approved',
    0.05, -- 5% GST only (tax exempt customer)
    0.00, -- No delivery fee for bulk orders
    0.00, -- Installation not included
    CURRENT_DATE + INTERVAL '45 days',
    'Volume pricing applied. Delivery scheduled in 3 phases over 8 weeks. Customer responsible for installation. 30% deposit, 50% at first delivery, 20% final payment.',
    'Bulk order discount applied. Standardized configurations with "Painted Shaker MDF" finish in white. Quality control inspection required.',
    sent_at,
    approved_at
) VALUES (
    -- (previous values),
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

-- Quote 4: Small Renovation
INSERT INTO cabinet_system.quotes (
    quote_number, created_by_user_id, customer_id,
    customer_name, customer_email, customer_phone, customer_address,
    project_name, project_description, status,
    tax_rate, delivery_fee, installation_fee,
    valid_until, terms_and_conditions, notes
) VALUES (
    'Q-2025-0004',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com'),
    (SELECT id FROM cabinet_system.customers WHERE contact_name = 'Alex Kim'),
    'Alex Kim',
    'alex.kim@email.com',
    '(555) 012-3456',
    '741 New Home Way, Unit 12, Ottawa, ON K1A 0A9',
    'First Home Kitchen Update',
    'Budget-friendly kitchen update for first-time homeowner. Focus on maximizing storage while keeping costs reasonable.',
    'draft',
    0.13, -- 13% HST for Ontario
    150.00, -- Delivery fee
    800.00, -- Installation fee
    CURRENT_DATE + INTERVAL '14 days',
    'Quote valid for 14 days. Payment options available. Basic installation included.',
    'Budget-conscious customer. Prefer particleboard construction. "A Touch of Nature" finish requested.'
);

-- Quote 5: Expired Quote
INSERT INTO cabinet_system.quotes (
    quote_number, created_by_user_id, customer_id,
    customer_name, customer_email, customer_phone, customer_address,
    project_name, project_description, status,
    tax_rate, delivery_fee, installation_fee,
    valid_until, terms_and_conditions, notes
) VALUES (
    'Q-2025-0005',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com'),
    (SELECT id FROM cabinet_system.customers WHERE contact_name = 'David Wilson'),
    'David Wilson - Coastal Kitchen Solutions',
    'david@coastalkitchen.com',
    '(555) 456-7890',
    '321 Ocean View Lane, Halifax, NS B3H 4R2',
    'Seaside Cottage Kitchen',
    'Coastal-themed kitchen for vacation rental property. Durable finishes that can withstand humidity and salt air.',
    'expired',
    0.15, -- 15% HST for Nova Scotia
    200.00, -- Delivery fee
    1200.00, -- Installation fee
    CURRENT_DATE - INTERVAL '5 days',
    'Quote expired. Please contact for updated pricing.',
    'Customer requested marine-grade finishes. Quote expired due to no response.'
);

-- Update quote totals (will be recalculated when items are added)
UPDATE cabinet_system.quotes SET 
    subtotal = 0,
    tax_amount = 0,
    total_amount = delivery_fee + installation_fee
WHERE id IN (
    SELECT id FROM cabinet_system.quotes 
    WHERE quote_number IN ('Q-2025-0001', 'Q-2025-0002', 'Q-2025-0003', 'Q-2025-0004', 'Q-2025-0005')
);

-- Add audit log entries for quote status changes
INSERT INTO cabinet_system.quote_audit_log (quote_id, user_id, action, notes) 
SELECT 
    id,
    created_by_user_id,
    'created',
    'Quote created'
FROM cabinet_system.quotes 
WHERE quote_number IN ('Q-2025-0001', 'Q-2025-0002', 'Q-2025-0003', 'Q-2025-0004', 'Q-2025-0005');

-- Add sent audit log
INSERT INTO cabinet_system.quote_audit_log (quote_id, user_id, action, notes, created_at) 
SELECT 
    id,
    created_by_user_id,
    'sent',
    'Quote sent to customer',
    sent_at
FROM cabinet_system.quotes 
WHERE status IN ('sent', 'approved', 'expired') AND sent_at IS NOT NULL;

-- Add approval audit log
INSERT INTO cabinet_system.quote_audit_log (quote_id, user_id, action, notes, created_at) 
SELECT 
    id,
    created_by_user_id,
    'approved',
    'Quote approved by customer',
    approved_at
FROM cabinet_system.quotes 
WHERE status = 'approved' AND approved_at IS NOT NULL;

-- Add expiration audit log
INSERT INTO cabinet_system.quote_audit_log (quote_id, user_id, action, notes) 
SELECT 
    id,
    created_by_user_id,
    'expired',
    'Quote expired due to no customer response'
FROM cabinet_system.quotes 
WHERE status = 'expired';

-- Reset search path
RESET search_path;

-- Display summary
DO $$
BEGIN
    RAISE NOTICE 'Sample quote data created successfully';
    RAISE NOTICE 'Total quotes: %', (SELECT COUNT(*) FROM cabinet_system.quotes);
    RAISE NOTICE 'Draft quotes: %', (SELECT COUNT(*) FROM cabinet_system.quotes WHERE status = 'draft');
    RAISE NOTICE 'Sent quotes: %', (SELECT COUNT(*) FROM cabinet_system.quotes WHERE status = 'sent');
    RAISE NOTICE 'Approved quotes: %', (SELECT COUNT(*) FROM cabinet_system.quotes WHERE status = 'approved');
    RAISE NOTICE 'Expired quotes: %', (SELECT COUNT(*) FROM cabinet_system.quotes WHERE status = 'expired');
    RAISE NOTICE 'Audit log entries: %', (SELECT COUNT(*) FROM cabinet_system.quote_audit_log);
END $$;

COMMENT ON TABLE cabinet_system.quotes IS 'Sample quotes created for testing. Quote items will be added after CSV data import when products are available.';