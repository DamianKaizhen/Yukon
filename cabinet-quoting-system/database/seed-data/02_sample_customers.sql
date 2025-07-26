-- Sample customer data for testing the cabinet quoting system
SET search_path TO cabinet_system, public;

-- Insert sample customers
INSERT INTO customers (
    customer_number,
    company_name,
    contact_name,
    email,
    phone,
    address_line1,
    city,
    state_province,
    postal_code,
    country,
    tax_exempt,
    credit_limit,
    payment_terms
) VALUES
    ('CUST-001', 'ABC Construction LLC', 'John Smith', 'john@abcconstruction.com', '555-123-4567', 
     '123 Main Street', 'Portland', 'OR', '97201', 'USA', false, 50000.00, 'Net 30'),
    
    ('CUST-002', 'Premier Kitchen Designs', 'Sarah Johnson', 'sarah@premierkitchens.com', '555-234-5678',
     '456 Oak Avenue', 'Seattle', 'WA', '98101', 'USA', false, 75000.00, 'Net 30'),
    
    ('CUST-003', 'Home Renovation Experts', 'Michael Brown', 'michael@homereno.com', '555-345-6789',
     '789 Pine Road', 'San Francisco', 'CA', '94102', 'USA', true, 100000.00, 'Net 45'),
    
    ('CUST-004', 'Budget Builders Inc', 'Lisa Davis', 'lisa@budgetbuilders.com', '555-456-7890',
     '321 Elm Street', 'Los Angeles', 'CA', '90001', 'USA', false, 25000.00, 'COD'),
    
    ('CUST-005', 'Luxury Homes & More', 'Robert Wilson', 'robert@luxuryhomes.com', '555-567-8901',
     '654 Maple Drive', 'Denver', 'CO', '80201', 'USA', false, 150000.00, 'Net 60'),
     
    ('CUST-006', 'DIY Warehouse', 'Emily Martinez', 'emily@diywarehouse.com', '555-678-9012',
     '987 Cedar Lane', 'Phoenix', 'AZ', '85001', 'USA', false, 35000.00, 'Net 15'),
     
    ('CUST-007', 'Custom Cabinet Solutions', 'David Thompson', 'david@customcabinets.com', '555-789-0123',
     '147 Birch Way', 'Austin', 'TX', '78701', 'USA', false, 60000.00, 'Net 30'),
     
    ('CUST-008', 'Green Building Co-op', 'Jennifer Garcia', 'jennifer@greenbuilding.org', '555-890-1234',
     '258 Spruce Court', 'Portland', 'ME', '04101', 'USA', true, 40000.00, 'Net 30'),
     
    ('CUST-009', 'Commercial Interiors LLC', 'William Anderson', 'william@commercialint.com', '555-901-2345',
     '369 Fir Boulevard', 'Chicago', 'IL', '60601', 'USA', false, 200000.00, 'Net 45'),
     
    ('CUST-010', 'Residential Remodelers', 'Maria Rodriguez', 'maria@residentialremodel.com', '555-012-3456',
     '741 Aspen Road', 'Miami', 'FL', '33101', 'USA', false, 80000.00, 'Net 30')
ON CONFLICT (customer_number) DO NOTHING;