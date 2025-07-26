-- Cabinet Quoting System Database Schema
-- Migration: 001_create_schema.sql
-- Description: Creates the core database schema for the cabinet quoting system

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS cabinet_system;

-- Set search path
SET search_path TO cabinet_system, public;

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- LOOKUP TABLES
-- =====================================================

-- Color Options / Finish Types
CREATE TABLE color_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Box Material Types
CREATE TABLE box_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cabinet Categories
CREATE TABLE cabinet_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES cabinet_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cabinet Types (Base, Wall, Vanity, etc.)
CREATE TABLE cabinet_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category_id UUID REFERENCES cabinet_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CORE PRODUCT TABLES
-- =====================================================

-- Products (Cabinet Models)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cabinet_type_id UUID REFERENCES cabinet_types(id),
    
    -- Dimensions (stored in inches)
    width DECIMAL(5,2),
    height DECIMAL(5,2),
    depth DECIMAL(5,2),
    
    -- Features
    door_count INTEGER DEFAULT 0,
    drawer_count INTEGER DEFAULT 0,
    is_left_right BOOLEAN DEFAULT false, -- For L/R variants
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    discontinued_date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for search
    CONSTRAINT valid_dimensions CHECK (
        (width IS NULL OR width > 0) AND
        (height IS NULL OR height > 0) AND
        (depth IS NULL OR depth > 0)
    )
);

-- Product Variants (Color Option + Product combinations)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    color_option_id UUID NOT NULL REFERENCES color_options(id),
    sku VARCHAR(100) NOT NULL UNIQUE, -- Concatenated identifier
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, color_option_id)
);

-- =====================================================
-- PRICING TABLES
-- =====================================================

-- Product Pricing (Current prices by material)
CREATE TABLE product_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID NOT NULL REFERENCES product_variants(id),
    box_material_id UUID NOT NULL REFERENCES box_materials(id),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2), -- Optional cost tracking
    
    -- Validity
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one active price per variant/material combination
    UNIQUE(product_variant_id, box_material_id, effective_date),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_cost CHECK (cost IS NULL OR cost >= 0),
    CONSTRAINT valid_dates CHECK (expiration_date IS NULL OR expiration_date > effective_date)
);

-- Price History (Audit trail of price changes)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID NOT NULL REFERENCES product_variants(id),
    box_material_id UUID NOT NULL REFERENCES box_materials(id),
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    change_reason TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INVENTORY TABLES
-- =====================================================

-- Inventory Tracking
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID NOT NULL REFERENCES product_variants(id),
    
    -- Stock levels
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    
    -- Reorder points
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    
    -- Location
    warehouse_location VARCHAR(50),
    
    -- Metadata
    last_counted_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_variant_id),
    CONSTRAINT valid_quantities CHECK (
        quantity_on_hand >= 0 AND
        quantity_reserved >= 0 AND
        quantity_reserved <= quantity_on_hand
    )
);

-- =====================================================
-- QUOTE MANAGEMENT TABLES
-- =====================================================

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_number VARCHAR(50) UNIQUE,
    company_name VARCHAR(200),
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state_province VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    
    -- Business info
    tax_exempt BOOLEAN DEFAULT false,
    tax_id VARCHAR(50),
    credit_limit DECIMAL(10,2),
    payment_terms VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotes
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    
    -- Quote details
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    -- Totals (denormalized for performance)
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Notes
    internal_notes TEXT,
    customer_notes TEXT,
    
    -- Metadata
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
    CONSTRAINT valid_amounts CHECK (
        subtotal >= 0 AND
        discount_amount >= 0 AND
        tax_amount >= 0 AND
        total_amount >= 0
    )
);

-- Quote Line Items
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Product info
    product_variant_id UUID NOT NULL REFERENCES product_variants(id),
    box_material_id UUID NOT NULL REFERENCES box_materials(id),
    
    -- Quantities and pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(quote_id, line_number),
    CONSTRAINT valid_quantity CHECK (quantity > 0),
    CONSTRAINT valid_pricing CHECK (unit_price >= 0 AND line_total >= 0),
    CONSTRAINT valid_discount CHECK (
        discount_percent >= 0 AND discount_percent <= 100 AND
        discount_amount >= 0
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Product search indexes
CREATE INDEX idx_products_item_code ON products(item_code);
CREATE INDEX idx_products_cabinet_type ON products(cabinet_type_id);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;

-- Product variant indexes
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_color ON product_variants(color_option_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- Pricing indexes
CREATE INDEX idx_pricing_variant_material ON product_pricing(product_variant_id, box_material_id);
CREATE INDEX idx_pricing_active ON product_pricing(is_active, effective_date) WHERE is_active = true;

-- Quote indexes
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_date ON quotes(quote_date);

-- Quote items indexes
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_product ON quote_items(product_variant_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_color_options_updated_at BEFORE UPDATE ON color_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_box_materials_updated_at BEFORE UPDATE ON box_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabinet_categories_updated_at BEFORE UPDATE ON cabinet_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cabinet_types_updated_at BEFORE UPDATE ON cabinet_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_pricing_updated_at BEFORE UPDATE ON product_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Price history trigger
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price != NEW.price THEN
        INSERT INTO price_history (
            product_variant_id,
            box_material_id,
            old_price,
            new_price,
            change_reason,
            changed_by
        ) VALUES (
            NEW.product_variant_id,
            NEW.box_material_id,
            OLD.price,
            NEW.price,
            'Price update',
            current_user
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_pricing_changes AFTER UPDATE ON product_pricing
    FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- Quote totals calculation trigger
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotes
    SET subtotal = (
        SELECT COALESCE(SUM(line_total), 0)
        FROM quote_items
        WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
    ),
    total_amount = subtotal - discount_amount + tax_amount
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quote_totals AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION calculate_quote_totals();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Current prices view
CREATE VIEW current_prices AS
SELECT 
    pv.id as product_variant_id,
    pv.sku,
    p.item_code,
    p.name as product_name,
    p.description as product_description,
    co.name as color_option,
    bm.name as box_material,
    pp.price,
    pp.effective_date
FROM product_pricing pp
JOIN product_variants pv ON pp.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
JOIN color_options co ON pv.color_option_id = co.id
JOIN box_materials bm ON pp.box_material_id = bm.id
WHERE pp.is_active = true
    AND (pp.expiration_date IS NULL OR pp.expiration_date > CURRENT_DATE)
    AND pp.effective_date <= CURRENT_DATE;

-- Product catalog view
CREATE VIEW product_catalog AS
SELECT 
    p.id as product_id,
    p.item_code,
    p.name,
    p.description,
    ct.name as cabinet_type,
    cc.name as cabinet_category,
    p.width,
    p.height,
    p.depth,
    p.door_count,
    p.drawer_count,
    p.is_left_right,
    p.is_active
FROM products p
LEFT JOIN cabinet_types ct ON p.cabinet_type_id = ct.id
LEFT JOIN cabinet_categories cc ON ct.category_id = cc.id;

-- Inventory status view
CREATE VIEW inventory_status AS
SELECT 
    pv.sku,
    p.item_code,
    p.name as product_name,
    co.name as color_option,
    i.quantity_on_hand,
    i.quantity_reserved,
    i.quantity_available,
    i.reorder_point,
    CASE 
        WHEN i.quantity_available <= i.reorder_point THEN 'Reorder Required'
        WHEN i.quantity_available <= i.reorder_point * 1.5 THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM inventory i
JOIN product_variants pv ON i.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
JOIN color_options co ON pv.color_option_id = co.id;

-- =====================================================
-- SECURITY - Row Level Security (RLS) Setup
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create roles
CREATE ROLE cabinet_admin;
CREATE ROLE cabinet_sales;
CREATE ROLE cabinet_viewer;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA cabinet_system TO cabinet_admin;
GRANT SELECT, INSERT, UPDATE ON quotes, quote_items TO cabinet_sales;
GRANT SELECT ON ALL TABLES IN SCHEMA cabinet_system TO cabinet_viewer;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cabinet_system TO cabinet_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA cabinet_system TO cabinet_sales;

COMMENT ON SCHEMA cabinet_system IS 'Cabinet Quoting System - Core database schema for managing cabinet products, pricing, inventory, and quotes';