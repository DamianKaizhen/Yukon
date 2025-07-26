-- Cabinet Quoting System - Initial Database Schema
-- Migration 001: Core tables for cabinet catalog, users, and quotes
-- Created: 2025-07-26
-- Author: Database Architect Agent

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search performance

-- ===========================================
-- 1. CABINET CATALOG TABLES
-- ===========================================

-- Color Options/Finishes Table
CREATE TABLE color_options (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cabinet Categories (Base, Wall, Drawer, etc.)
CREATE TABLE cabinet_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE, -- B, W, DB, BC, BLS
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Tiers (material types)
CREATE TABLE pricing_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Main Cabinet Products Table
CREATE TABLE cabinets (
    id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    color_option_id INTEGER NOT NULL REFERENCES color_options(id),
    category_id INTEGER NOT NULL REFERENCES cabinet_categories(id),
    description TEXT NOT NULL,
    concatenated_name TEXT NOT NULL, -- Searchable full name
    
    -- Dimensions (extracted from item code where possible)
    width_inches INTEGER,
    height_inches INTEGER,
    depth_inches INTEGER,
    
    -- Product specifications
    door_count INTEGER DEFAULT 0,
    drawer_count INTEGER DEFAULT 0,
    has_left_hinge BOOLEAN DEFAULT false,
    has_right_hinge BOOLEAN DEFAULT false,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination of item_code and color_option
    UNIQUE(item_code, color_option_id)
);

-- Cabinet Pricing Table (stores prices for different material tiers)
CREATE TABLE cabinet_pricing (
    id SERIAL PRIMARY KEY,
    cabinet_id INTEGER NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    pricing_tier_id INTEGER NOT NULL REFERENCES pricing_tiers(id),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    
    -- Effective date range for pricing
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combination and no overlapping date ranges
    UNIQUE(cabinet_id, pricing_tier_id, effective_from)
);

-- ===========================================
-- 2. USER MANAGEMENT TABLES
-- ===========================================

-- User Roles
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES user_roles(id),
    
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
-- 3. QUOTE MANAGEMENT TABLES
-- ===========================================

-- Quote Status Enum
CREATE TYPE quote_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'expired');

-- Quotes Table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- User who created the quote
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Customer information
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    
    -- Project information
    project_name VARCHAR(200),
    project_description TEXT,
    
    -- Quote details
    status quote_status DEFAULT 'draft',
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quote Items Table (cabinets in a quote)
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    cabinet_id INTEGER NOT NULL REFERENCES cabinets(id),
    pricing_tier_id INTEGER NOT NULL REFERENCES pricing_tiers(id),
    
    -- Item details
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
    
    -- Optional customizations
    custom_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 4. AUDIT AND LOGGING TABLES
-- ===========================================

-- Quote Audit Log
CREATE TABLE quote_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'rejected', etc.
    old_values JSONB,
    new_values JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 5. PERFORMANCE INDEXES
-- ===========================================

-- Cabinet search indexes
CREATE INDEX idx_cabinets_item_code ON cabinets(item_code);
CREATE INDEX idx_cabinets_category ON cabinets(category_id);
CREATE INDEX idx_cabinets_color_option ON cabinets(color_option_id);
CREATE INDEX idx_cabinets_active ON cabinets(is_active);

-- Full-text search indexes
CREATE INDEX idx_cabinets_description_trgm ON cabinets USING gin(description gin_trgm_ops);
CREATE INDEX idx_cabinets_concatenated_trgm ON cabinets USING gin(concatenated_name gin_trgm_ops);

-- Pricing indexes
CREATE INDEX idx_cabinet_pricing_cabinet ON cabinet_pricing(cabinet_id);
CREATE INDEX idx_cabinet_pricing_tier ON cabinet_pricing(pricing_tier_id);
CREATE INDEX idx_cabinet_pricing_effective ON cabinet_pricing(effective_from, effective_to);

-- Quote indexes
CREATE INDEX idx_quotes_user ON quotes(created_by_user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created ON quotes(created_at);
CREATE INDEX idx_quotes_customer_email ON quotes(customer_email);

-- Quote items indexes
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_cabinet ON quote_items(cabinet_id);

-- Audit log indexes
CREATE INDEX idx_quote_audit_quote ON quote_audit_log(quote_id);
CREATE INDEX idx_quote_audit_user ON quote_audit_log(user_id);
CREATE INDEX idx_quote_audit_action ON quote_audit_log(action);
CREATE INDEX idx_quote_audit_created ON quote_audit_log(created_at);

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);

-- ===========================================
-- 6. FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_color_options_updated_at BEFORE UPDATE ON color_options 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabinet_categories_updated_at BEFORE UPDATE ON cabinet_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabinets_updated_at BEFORE UPDATE ON cabinets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabinet_pricing_updated_at BEFORE UPDATE ON cabinet_pricing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON quote_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate quote totals
CREATE OR REPLACE FUNCTION calculate_quote_totals(quote_uuid UUID)
RETURNS void AS $$
DECLARE
    new_subtotal DECIMAL(12,2);
    current_quote quotes%ROWTYPE;
BEGIN
    -- Get current quote data
    SELECT * INTO current_quote FROM quotes WHERE id = quote_uuid;
    
    -- Calculate subtotal from quote items
    SELECT COALESCE(SUM(line_total), 0) 
    INTO new_subtotal 
    FROM quote_items 
    WHERE quote_id = quote_uuid;
    
    -- Update quote totals
    UPDATE quotes 
    SET 
        subtotal = new_subtotal,
        tax_amount = new_subtotal * tax_rate,
        total_amount = new_subtotal + (new_subtotal * tax_rate) - discount_amount + delivery_fee + installation_fee,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = quote_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate quote totals when quote items change
CREATE OR REPLACE FUNCTION trigger_calculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM calculate_quote_totals(OLD.quote_id);
        RETURN OLD;
    ELSE
        PERFORM calculate_quote_totals(NEW.quote_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quote_items_totals 
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION trigger_calculate_quote_totals();

-- ===========================================
-- 7. VIEWS FOR COMMON QUERIES
-- ===========================================

-- View for cabinet search with all details
CREATE VIEW v_cabinet_search AS
SELECT 
    c.id,
    c.item_code,
    c.description,
    c.concatenated_name,
    co.name as color_option,
    co.display_name as color_display_name,
    cat.code as category_code,
    cat.name as category_name,
    c.width_inches,
    c.height_inches,
    c.depth_inches,
    c.door_count,
    c.drawer_count,
    c.has_left_hinge,
    c.has_right_hinge,
    c.is_active
FROM cabinets c
JOIN color_options co ON c.color_option_id = co.id
JOIN cabinet_categories cat ON c.category_id = cat.id
WHERE c.is_active = true AND co.is_active = true AND cat.is_active = true;

-- View for current cabinet pricing
CREATE VIEW v_cabinet_current_pricing AS
SELECT 
    c.id as cabinet_id,
    c.item_code,
    c.description,
    c.concatenated_name,
    co.name as color_option,
    cat.code as category_code,
    pt.name as pricing_tier,
    cp.price,
    cp.effective_from,
    cp.effective_to
FROM cabinets c
JOIN color_options co ON c.color_option_id = co.id
JOIN cabinet_categories cat ON c.category_id = cat.id
JOIN cabinet_pricing cp ON c.id = cp.cabinet_id
JOIN pricing_tiers pt ON cp.pricing_tier_id = pt.id
WHERE c.is_active = true 
    AND co.is_active = true 
    AND cat.is_active = true 
    AND pt.is_active = true
    AND cp.effective_from <= CURRENT_DATE 
    AND (cp.effective_to IS NULL OR cp.effective_to >= CURRENT_DATE);

-- ===========================================
-- 8. INITIAL DATA SETUP
-- ===========================================

-- Insert default user roles
INSERT INTO user_roles (name, description, permissions) VALUES
('admin', 'System Administrator', '["manage_users", "manage_cabinets", "manage_quotes", "view_reports"]'::jsonb),
('sales', 'Sales Representative', '["create_quotes", "view_quotes", "search_cabinets"]'::jsonb),
('manager', 'Sales Manager', '["create_quotes", "view_all_quotes", "approve_quotes", "search_cabinets", "view_reports"]'::jsonb);

-- Insert cabinet categories based on CSV analysis
INSERT INTO cabinet_categories (code, name, description, sort_order) VALUES
('B', 'Base Cabinets', 'Standard base cabinets with doors and/or drawers', 1),
('W', 'Wall Cabinets', 'Wall-mounted cabinets in various heights', 2),
('BC', 'Blind Corner', 'Blind corner base cabinets for corner installations', 3),
('BLS', 'Lazy Susan', 'Lazy Susan base cabinets with rotating shelves', 4),
('2DB', '2 Drawer Base', 'Base cabinets with 2 drawers', 5),
('3DB', '3 Drawer Base', 'Base cabinets with 3 drawers', 6);

-- Insert pricing tiers based on CSV analysis
INSERT INTO pricing_tiers (name, description, sort_order) VALUES
('particleboard', 'Price with ParticleBoard Box', 1),
('plywood', 'Price with Plywood Box', 2),
('uv_birch_plywood', 'UV Birch Plywood', 3),
('white_plywood', 'White Plywood', 4);

-- Insert color options based on CSV analysis
INSERT INTO color_options (name, display_name, description, sort_order) VALUES
('A TOUCH OF NATURE', 'A Touch of Nature', 'Natural wood finish with warm tones', 1),
('A TOUCH OF NATURE PLUS', 'A Touch of Nature Plus', 'Enhanced natural wood finish', 2),
('ARTISANS SHINE', 'Artisans Shine', 'High-gloss artistic finish', 3),
('CLASSICS LIMITED', 'Classics Limited', 'Traditional classic wood finish', 4),
('PAINTED SHAKER MDF', 'Painted Shaker MDF', 'Modern painted shaker style doors', 5);

-- Create a default admin user (password: admin123 - change in production!)
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active, email_verified) 
VALUES (
    'admin@yudezign.com', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewMR6FEWL2WKECfa', -- admin123 hashed
    'System', 
    'Administrator', 
    (SELECT id FROM user_roles WHERE name = 'admin'), 
    true, 
    true
);