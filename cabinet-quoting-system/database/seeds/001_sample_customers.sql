-- Cabinet Quoting System - Sample Customer Data
-- Seed Script 001: Create sample customers for testing
-- Created: 2025-07-27
-- Author: Database Architect Agent

SET search_path TO cabinet_system, public;

-- ===========================================
-- SAMPLE CUSTOMERS FOR TESTING
-- ===========================================

-- Insert sample customers
INSERT INTO cabinet_system.customers (
    company_name, contact_name, email, phone, 
    billing_address, shipping_address, tax_exempt, notes,
    created_by_user_id
) VALUES 
(
    'Modern Kitchen Designs Inc.',
    'Sarah Johnson',
    'sarah@modernkitchendesigns.com',
    '(555) 123-4567',
    '123 Design Street, Suite 100, Toronto, ON M5V 3A5',
    '123 Design Street, Suite 100, Toronto, ON M5V 3A5',
    false,
    'Premium kitchen design company specializing in contemporary layouts',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Heritage Home Renovations',
    'Michael Chen',
    'michael@heritagehome.ca',
    '(555) 234-5678',
    '456 Renovation Road, Vancouver, BC V6B 1A1',
    '456 Renovation Road, Vancouver, BC V6B 1A1',
    false,
    'Full-service renovation company focused on heritage homes',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Luxury Condos Development',
    'Emma Rodriguez',
    'emma@luxurycondos.com',
    '(555) 345-6789',
    '789 Development Drive, Calgary, AB T2P 2M5',
    '789 Development Drive, Calgary, AB T2P 2M5',
    true,
    'Large-scale condominium development requiring bulk orders',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Coastal Kitchen Solutions',
    'David Wilson',
    'david@coastalkitchen.com',
    '(555) 456-7890',
    '321 Ocean View Lane, Halifax, NS B3H 4R2',
    '321 Ocean View Lane, Halifax, NS B3H 4R2',
    false,
    'Coastal-themed kitchen specialist serving Atlantic Canada',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Urban Loft Interiors',
    'Lisa Thompson',
    'lisa@urbanloft.ca',
    '(555) 567-8901',
    '654 Loft Street, Unit 200, Montreal, QC H3A 2B4',
    '654 Loft Street, Unit 200, Montreal, QC H3A 2B4',
    false,
    'Specializing in modern urban living spaces and loft conversions',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Country Home Builders',
    'Robert Anderson',
    'robert@countryhome.ca',
    '(555) 678-9012',
    '987 Rural Route 3, Winnipeg, MB R3T 2N6',
    '987 Rural Route 3, Winnipeg, MB R3T 2N6',
    false,
    'Custom home builder specializing in country and farmhouse styles',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Elite Property Management',
    'Jennifer Lee',
    'jennifer@eliteproperty.com',
    '(555) 789-0123',
    '147 Property Plaza, Suite 500, Edmonton, AB T5J 3S4',
    '147 Property Plaza, Suite 500, Edmonton, AB T5J 3S4',
    true,
    'Property management company handling multiple rental properties',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Artisan Woodworks',
    'James Martinez',
    'james@artisanwood.ca',
    '(555) 890-1234',
    '258 Craftsman Circle, Saskatoon, SK S7N 2R7',
    '258 Craftsman Circle, Saskatoon, SK S7N 2R7',
    false,
    'Custom woodworking shop specializing in handcrafted cabinets',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'Green Building Solutions',
    'Amanda Taylor',
    'amanda@greenbuilding.ca',
    '(555) 901-2345',
    '369 Eco Street, Victoria, BC V8W 2Y8',
    '369 Eco Street, Victoria, BC V8W 2Y8',
    false,
    'Eco-friendly construction company focused on sustainable materials',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
),
(
    'First-Time Homeowner',
    'Alex Kim',
    'alex.kim@email.com',
    '(555) 012-3456',
    '741 New Home Way, Unit 12, Ottawa, ON K1A 0A9',
    '741 New Home Way, Unit 12, Ottawa, ON K1A 0A9',
    false,
    'Individual customer purchasing cabinets for first home',
    (SELECT id FROM cabinet_system.users WHERE email = 'admin@yudezign.com')
);

-- Add some customer notes and additional details
UPDATE cabinet_system.customers 
SET notes = notes || E'\n\nPreferred contact method: Email during business hours'
WHERE contact_name IN ('Sarah Johnson', 'Emma Rodriguez', 'Jennifer Lee');

UPDATE cabinet_system.customers 
SET notes = notes || E'\n\nRequires detailed specifications and CAD drawings with all quotes'
WHERE contact_name IN ('Michael Chen', 'David Wilson');

UPDATE cabinet_system.customers 
SET notes = notes || E'\n\nBulk discount eligible - minimum order quantity: 50 units'
WHERE contact_name IN ('Emma Rodriguez', 'Jennifer Lee');

UPDATE cabinet_system.customers 
SET notes = notes || E'\n\nPrefers natural wood finishes and traditional styles'
WHERE contact_name IN ('Robert Anderson', 'James Martinez');

UPDATE cabinet_system.customers 
SET notes = notes || E'\n\nFocuses on modern, contemporary designs with clean lines'
WHERE contact_name IN ('Lisa Thompson', 'Alex Kim');

UPDATE cabinet_system.customers 
SET notes = notes || E'\n\nRequires eco-friendly and sustainable cabinet options only'
WHERE contact_name = 'Amanda Taylor';

-- Reset search path
RESET search_path;

-- Display summary
DO $$
BEGIN
    RAISE NOTICE 'Sample customer data created successfully';
    RAISE NOTICE 'Total customers: %', (SELECT COUNT(*) FROM cabinet_system.customers);
    RAISE NOTICE 'Tax-exempt customers: %', (SELECT COUNT(*) FROM cabinet_system.customers WHERE tax_exempt = true);
END $$;