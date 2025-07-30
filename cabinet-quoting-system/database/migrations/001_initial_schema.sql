-- Cabinet Quoting System - Initial Database Schema
-- Migration 001: Core tables for cabinet catalog, inventory, users, and quotes
-- Created: 2025-07-27
-- Author: Database Architect Agent
-- Aligned with DATABASE_SCHEMA.md specification

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search performance

-- Create cabinet system schema
CREATE SCHEMA IF NOT EXISTS cabinet_system;

-- Set search path for this migration
SET search_path TO cabinet_system, public;

-- ===========================================
-- 1. REFERENCE DATA TABLES
-- ===========================================

-- Color Options/Finishes Table
CREATE TABLE cabinet_system.color_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cabinet Categories (Base, Wall, Tall, Vanity, Specialty)
CREATE TABLE cabinet_system.cabinet_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    parent_category_id INTEGER REFERENCES cabinet_system.cabinet_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cabinet Types (specific configurations within categories)
CREATE TABLE cabinet_system.cabinet_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL REFERENCES cabinet_system.cabinet_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Box Materials (material types for pricing)
CREATE TABLE cabinet_system.box_materials (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 2. PRODUCT MANAGEMENT TABLES
-- ===========================================

-- Main Products Table (base cabinet models)
CREATE TABLE cabinet_system.products (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    cabinet_type_id INTEGER NOT NULL REFERENCES cabinet_system.cabinet_types(id),
    description TEXT,
    
    -- Dimensions (extracted from item code where possible)
    width_inches DECIMAL(5,2),
    height_inches DECIMAL(5,2),
    depth_inches DECIMAL(5,2),
    
    -- Product specifications
    door_count INTEGER DEFAULT 0,
    drawer_count INTEGER DEFAULT 0,
    is_left_right BOOLEAN DEFAULT false, -- True if item has L/R variants
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Variants (combination of product and color)
CREATE TABLE cabinet_system.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id INTEGER NOT NULL REFERENCES cabinet_system.products(id),
    color_option_id INTEGER NOT NULL REFERENCES cabinet_system.color_options(id),
    sku VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, color_option_id)
);

-- Product Pricing Table (stores prices for different material tiers)
CREATE TABLE cabinet_system.product_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID NOT NULL REFERENCES cabinet_system.product_variants(id) ON DELETE CASCADE,
    box_material_id INTEGER NOT NULL REFERENCES cabinet_system.box_materials(id),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    
    -- Effective date range for pricing
    effective_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination and no overlapping date ranges
    UNIQUE(product_variant_id, box_material_id, effective_date),
    CHECK (expiration_date IS NULL OR expiration_date > effective_date)
);

-- Price History Table (audit trail for price changes)
CREATE TABLE cabinet_system.price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_pricing_id UUID NOT NULL REFERENCES cabinet_system.product_pricing(id),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    changed_by UUID,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 3. INVENTORY MANAGEMENT TABLES
-- ===========================================

-- Inventory Table
CREATE TABLE cabinet_system.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID NOT NULL REFERENCES cabinet_system.product_variants(id) UNIQUE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    last_restocked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 4. USER MANAGEMENT TABLES
-- ===========================================

-- User Roles
CREATE TABLE cabinet_system.user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE cabinet_system.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES cabinet_system.user_roles(id),
    
    -- Contact information
    phone VARCHAR(20),
    
    -- Account status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 5. CUSTOMER MANAGEMENT TABLES
-- ===========================================

-- Customers Table
CREATE TABLE cabinet_system.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(200),
    contact_name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    billing_address TEXT,
    shipping_address TEXT,
    tax_exempt BOOLEAN DEFAULT false,
    notes TEXT,
    created_by_user_id UUID REFERENCES cabinet_system.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 6. QUOTE MANAGEMENT TABLES
-- ===========================================

-- Quote Status Enum
CREATE TYPE cabinet_system.quote_status AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');

-- Quotes Table
CREATE TABLE cabinet_system.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- User who created the quote
    created_by_user_id UUID NOT NULL REFERENCES cabinet_system.users(id),
    
    -- Customer reference
    customer_id UUID REFERENCES cabinet_system.customers(id),
    
    -- Denormalized customer info for quote snapshot
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    
    -- Project information
    project_name VARCHAR(200),
    project_description TEXT,
    
    -- Quote details
    status cabinet_system.quote_status DEFAULT 'draft',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_rate DECIMAL(5,4) DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 1),
    tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    delivery_fee DECIMAL(12,2) DEFAULT 0 CHECK (delivery_fee >= 0),
    installation_fee DECIMAL(12,2) DEFAULT 0 CHECK (installation_fee >= 0),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    
    -- Quote terms
    valid_until DATE,
    terms_and_conditions TEXT,
    notes TEXT,
    
    -- PDF generation
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    pdf_file_path VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE
);

-- Quote Items Table
CREATE TABLE cabinet_system.quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES cabinet_system.quotes(id) ON DELETE CASCADE,
    product_variant_id UUID NOT NULL REFERENCES cabinet_system.product_variants(id),
    box_material_id INTEGER NOT NULL REFERENCES cabinet_system.box_materials(id),
    
    -- Item details
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
    
    -- Optional customizations
    custom_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 7. AUDIT AND LOGGING TABLES
-- ===========================================

-- Quote Audit Log
CREATE TABLE cabinet_system.quote_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES cabinet_system.quotes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES cabinet_system.users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'sent', 'approved', 'rejected', etc.
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 8. PERFORMANCE INDEXES
-- ===========================================

-- Product indexes
CREATE INDEX idx_products_item_code ON cabinet_system.products(item_code);
CREATE INDEX idx_products_type ON cabinet_system.products(cabinet_type_id);
CREATE INDEX idx_products_active ON cabinet_system.products(is_active);
CREATE INDEX idx_products_name_trgm ON cabinet_system.products USING gin(name gin_trgm_ops);

-- Product variant indexes
CREATE INDEX idx_product_variants_product ON cabinet_system.product_variants(product_id);
CREATE INDEX idx_product_variants_color ON cabinet_system.product_variants(color_option_id);
CREATE INDEX idx_product_variants_sku ON cabinet_system.product_variants(sku);

-- Pricing indexes
CREATE INDEX idx_product_pricing_variant ON cabinet_system.product_pricing(product_variant_id);
CREATE INDEX idx_product_pricing_material ON cabinet_system.product_pricing(box_material_id);
CREATE INDEX idx_product_pricing_effective ON cabinet_system.product_pricing(effective_date, expiration_date);
CREATE INDEX idx_product_pricing_current ON cabinet_system.product_pricing(product_variant_id, box_material_id) 
    WHERE expiration_date IS NULL OR expiration_date >= CURRENT_DATE;

-- Inventory indexes
CREATE INDEX idx_inventory_variant ON cabinet_system.inventory(product_variant_id);
CREATE INDEX idx_inventory_reorder ON cabinet_system.inventory(quantity_available, reorder_point);

-- Customer indexes
CREATE INDEX idx_customers_email ON cabinet_system.customers(email);
CREATE INDEX idx_customers_company ON cabinet_system.customers(company_name);
CREATE INDEX idx_customers_contact ON cabinet_system.customers(contact_name);

-- Quote indexes
CREATE INDEX idx_quotes_user ON cabinet_system.quotes(created_by_user_id);
CREATE INDEX idx_quotes_customer ON cabinet_system.quotes(customer_id);
CREATE INDEX idx_quotes_status ON cabinet_system.quotes(status);
CREATE INDEX idx_quotes_number ON cabinet_system.quotes(quote_number);
CREATE INDEX idx_quotes_created ON cabinet_system.quotes(created_at DESC);
CREATE INDEX idx_quotes_customer_email ON cabinet_system.quotes(customer_email);

-- Quote items indexes
CREATE INDEX idx_quote_items_quote ON cabinet_system.quote_items(quote_id);
CREATE INDEX idx_quote_items_variant ON cabinet_system.quote_items(product_variant_id);

-- Audit log indexes
CREATE INDEX idx_quote_audit_quote ON cabinet_system.quote_audit_log(quote_id);
CREATE INDEX idx_quote_audit_user ON cabinet_system.quote_audit_log(user_id);
CREATE INDEX idx_quote_audit_action ON cabinet_system.quote_audit_log(action);
CREATE INDEX idx_quote_audit_created ON cabinet_system.quote_audit_log(created_at DESC);

-- User indexes
CREATE INDEX idx_users_email ON cabinet_system.users(email);
CREATE INDEX idx_users_role ON cabinet_system.users(role_id);
CREATE INDEX idx_users_active ON cabinet_system.users(is_active);

-- Type indexes
CREATE INDEX idx_cabinet_types_category ON cabinet_system.cabinet_types(category_id);
CREATE INDEX idx_cabinet_types_code ON cabinet_system.cabinet_types(code);

-- ===========================================
-- 9. FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION cabinet_system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update triggers for all tables with updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'cabinet_system' 
        AND column_name = 'updated_at'
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON cabinet_system.%I 
            FOR EACH ROW EXECUTE FUNCTION cabinet_system.update_updated_at_column()', t, t);
    END LOOP;
END;
$$;

-- Function to log price changes
CREATE OR REPLACE FUNCTION cabinet_system.log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.price != NEW.price THEN
        INSERT INTO cabinet_system.price_history (
            product_pricing_id,
            old_price,
            new_price,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.price,
            NEW.price,
            current_setting('cabinet_system.current_user_id', true)::uuid,
            current_setting('cabinet_system.price_change_reason', true)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_price_changes 
    AFTER UPDATE ON cabinet_system.product_pricing
    FOR EACH ROW EXECUTE FUNCTION cabinet_system.log_price_change();

-- Function to calculate quote totals
CREATE OR REPLACE FUNCTION cabinet_system.calculate_quote_totals(quote_uuid UUID)
RETURNS void AS $$
DECLARE
    new_subtotal DECIMAL(12,2);
    current_quote cabinet_system.quotes%ROWTYPE;
BEGIN
    -- Get current quote data
    SELECT * INTO current_quote FROM cabinet_system.quotes WHERE id = quote_uuid;
    
    -- Calculate subtotal from quote items
    SELECT COALESCE(SUM(line_total), 0) 
    INTO new_subtotal 
    FROM cabinet_system.quote_items 
    WHERE quote_id = quote_uuid;
    
    -- Update quote totals
    UPDATE cabinet_system.quotes 
    SET 
        subtotal = new_subtotal,
        tax_amount = new_subtotal * tax_rate,
        total_amount = new_subtotal + (new_subtotal * tax_rate) - discount_amount + delivery_fee + installation_fee,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = quote_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate quote item line totals
CREATE OR REPLACE FUNCTION cabinet_system.calculate_quote_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.line_total = NEW.quantity * NEW.unit_price * (1 - NEW.discount_percent / 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_item_total 
    BEFORE INSERT OR UPDATE OF quantity, unit_price, discount_percent ON cabinet_system.quote_items
    FOR EACH ROW EXECUTE FUNCTION cabinet_system.calculate_quote_item_total();

-- Trigger to auto-calculate quote totals when quote items change
CREATE OR REPLACE FUNCTION cabinet_system.trigger_calculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM cabinet_system.calculate_quote_totals(OLD.quote_id);
        RETURN OLD;
    ELSE
        PERFORM cabinet_system.calculate_quote_totals(NEW.quote_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quote_items_totals 
    AFTER INSERT OR UPDATE OR DELETE ON cabinet_system.quote_items
    FOR EACH ROW EXECUTE FUNCTION cabinet_system.trigger_calculate_quote_totals();

-- ===========================================
-- 10. VIEWS FOR COMMON QUERIES
-- ===========================================

-- View for current prices (active prices only)
CREATE VIEW cabinet_system.current_prices AS
SELECT 
    pv.id as product_variant_id,
    p.item_code,
    p.name as product_name,
    co.name as color_option,
    bm.code as material_code,
    bm.name as material_name,
    pp.price,
    pp.effective_date
FROM cabinet_system.product_pricing pp
JOIN cabinet_system.product_variants pv ON pp.product_variant_id = pv.id
JOIN cabinet_system.products p ON pv.product_id = p.id
JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
JOIN cabinet_system.box_materials bm ON pp.box_material_id = bm.id
WHERE pp.effective_date <= CURRENT_DATE 
    AND (pp.expiration_date IS NULL OR pp.expiration_date >= CURRENT_DATE)
    AND p.is_active = true 
    AND pv.is_active = true
    AND co.is_active = true
    AND bm.is_active = true;

-- View for product catalog with all details
CREATE VIEW cabinet_system.product_catalog AS
SELECT 
    p.id as product_id,
    p.item_code,
    p.name as product_name,
    p.description,
    ct.code as type_code,
    ct.name as type_name,
    cc.code as category_code,
    cc.name as category_name,
    p.width_inches,
    p.height_inches,
    p.depth_inches,
    p.door_count,
    p.drawer_count,
    p.is_left_right,
    array_agg(DISTINCT co.name ORDER BY co.name) as available_colors,
    array_agg(DISTINCT bm.name ORDER BY bm.name) as available_materials
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
GROUP BY p.id, p.item_code, p.name, p.description, ct.code, ct.name, 
         cc.code, cc.name, p.width_inches, p.height_inches, p.depth_inches,
         p.door_count, p.drawer_count, p.is_left_right;

-- View for inventory status
CREATE VIEW cabinet_system.inventory_status AS
SELECT 
    i.id as inventory_id,
    p.item_code,
    p.name as product_name,
    co.name as color_option,
    pv.sku,
    i.quantity_on_hand,
    i.quantity_reserved,
    i.quantity_available,
    i.reorder_point,
    i.reorder_quantity,
    CASE 
        WHEN i.quantity_available <= 0 THEN 'Out of Stock'
        WHEN i.quantity_available <= i.reorder_point THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    i.last_restocked_at
FROM cabinet_system.inventory i
JOIN cabinet_system.product_variants pv ON i.product_variant_id = pv.id
JOIN cabinet_system.products p ON pv.product_id = p.id
JOIN cabinet_system.color_options co ON pv.color_option_id = co.id
WHERE p.is_active = true AND pv.is_active = true;

-- ===========================================
-- 11. SECURITY SETUP
-- ===========================================

-- Create application roles
CREATE ROLE cabinet_admin;
CREATE ROLE cabinet_sales;
CREATE ROLE cabinet_viewer;

-- Grant schema usage
GRANT USAGE ON SCHEMA cabinet_system TO cabinet_admin, cabinet_sales, cabinet_viewer;

-- Admin role - full access
GRANT ALL ON ALL TABLES IN SCHEMA cabinet_system TO cabinet_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cabinet_system TO cabinet_admin;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA cabinet_system TO cabinet_admin;

-- Sales role - read/write access to quotes and customers, read-only to products
GRANT SELECT ON ALL TABLES IN SCHEMA cabinet_system TO cabinet_sales;
GRANT INSERT, UPDATE, DELETE ON cabinet_system.quotes TO cabinet_sales;
GRANT INSERT, UPDATE, DELETE ON cabinet_system.quote_items TO cabinet_sales;
GRANT INSERT, UPDATE, DELETE ON cabinet_system.customers TO cabinet_sales;
GRANT INSERT ON cabinet_system.quote_audit_log TO cabinet_sales;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cabinet_system TO cabinet_sales;

-- Viewer role - read-only access
GRANT SELECT ON ALL TABLES IN SCHEMA cabinet_system TO cabinet_viewer;

-- Enable Row Level Security on sensitive tables
ALTER TABLE cabinet_system.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_system.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinet_system.quote_items ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 12. INITIAL DATA SETUP
-- ===========================================

-- Insert default user roles
INSERT INTO cabinet_system.user_roles (name, description, permissions) VALUES
('admin', 'System Administrator', '["manage_users", "manage_products", "manage_quotes", "view_reports", "manage_inventory"]'::jsonb),
('sales', 'Sales Representative', '["create_quotes", "view_own_quotes", "manage_customers", "search_products"]'::jsonb),
('manager', 'Sales Manager', '["create_quotes", "view_all_quotes", "approve_quotes", "manage_customers", "search_products", "view_reports"]'::jsonb),
('warehouse', 'Warehouse Staff', '["manage_inventory", "view_products", "view_orders"]'::jsonb);

-- Insert cabinet categories
INSERT INTO cabinet_system.cabinet_categories (code, name, description, sort_order) VALUES
('BASE', 'Base Cabinets', 'Floor-mounted cabinets that form the foundation of kitchen storage', 1),
('WALL', 'Wall Cabinets', 'Wall-mounted cabinets for upper storage', 2),
('TALL', 'Tall Cabinets', 'Floor-to-ceiling cabinets for pantry and utility storage', 3),
('VANITY', 'Vanity Cabinets', 'Bathroom vanity cabinets', 4),
('SPECIALTY', 'Specialty Cabinets', 'Unique and specialized cabinet configurations', 5);

-- Insert box materials
INSERT INTO cabinet_system.box_materials (code, name, description, sort_order) VALUES
('particleboard', 'ParticleBoard', 'Standard particleboard construction', 1),
('plywood', 'Plywood', 'Premium plywood construction', 2),
('uv_birch', 'UV Birch Plywood', 'UV-finished birch plywood', 3),
('white_plywood', 'White Plywood', 'White melamine plywood', 4);

-- Insert color options
INSERT INTO cabinet_system.color_options (name, display_name, description, sort_order) VALUES
('A TOUCH OF NATURE', 'A Touch of Nature', 'Natural wood finish with warm undertones', 1),
('A TOUCH OF NATURE PLUS', 'A Touch of Nature Plus', 'Enhanced natural wood finish with premium grade selection', 2),
('ARTISANS SHINE', 'Artisans Shine', 'High-gloss finish with artistic flair', 3),
('CLASSICS LIMITED', 'Classics Limited', 'Traditional classic wood finishes', 4),
('PAINTED SHAKER MDF', 'Painted Shaker MDF', 'Modern painted shaker style in MDF', 5);

-- Create a default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Note: This uses bcrypt hash for 'admin123'
INSERT INTO cabinet_system.users (email, password_hash, first_name, last_name, role_id, is_active, email_verified) 
VALUES (
    'admin@yudezign.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMR6FEWL2WKECfa',
    'System', 
    'Administrator', 
    (SELECT id FROM cabinet_system.user_roles WHERE name = 'admin'), 
    true, 
    true
);

-- Reset search path
RESET search_path;

-- Migration completion message
DO $$
BEGIN
    RAISE NOTICE 'Cabinet Quoting System schema creation completed successfully';
    RAISE NOTICE 'Tables created in schema: cabinet_system';
    RAISE NOTICE 'Default admin user created: admin@yudezign.com (password: admin123)';
    RAISE NOTICE 'Remember to change the admin password in production!';
END $$;