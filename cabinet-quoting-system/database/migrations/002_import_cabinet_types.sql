-- Cabinet Quoting System - Cabinet Types Setup
-- Migration 002: Import cabinet types from CSV data analysis
-- Created: 2025-07-27
-- Author: Database Architect Agent

-- This migration populates cabinet types based on CSV data patterns

SET search_path TO cabinet_system, public;

-- ===========================================
-- INSERT CABINET TYPES FOR EACH CATEGORY
-- ===========================================

-- Base Cabinet Types
INSERT INTO cabinet_system.cabinet_types (code, name, category_id, description, sort_order) VALUES
-- Standard Base Cabinets
('B', 'Base Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Standard base cabinet with doors and drawers', 1),
('BFD', 'Base Full Door', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with full height doors', 2),
('BC', 'Blind Corner Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Blind corner base cabinet', 3),
('BLS', 'Lazy Susan Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with lazy susan', 4),
-- Drawer Base Types
('2DB', '2 Drawer Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with 2 drawers', 5),
('3DB', '3 Drawer Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with 3 drawers', 6),
('4DB', '4 Drawer Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with 4 drawers', 7),
('5DB', '5 Drawer Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with 5 drawers', 8),
-- Special Base Types
('SB', 'Sink Base', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet for sink installation', 9),
('BP', 'Base Panel', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Decorative base panel', 10),
('BB', 'Base Bookcase', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with open shelving', 11),
('BSK', 'Base Spice Rack', (SELECT id FROM cabinet_categories WHERE code = 'BASE'), 'Base cabinet with spice rack', 12);

-- Wall Cabinet Types
INSERT INTO cabinet_system.cabinet_types (code, name, category_id, description, sort_order) VALUES
('W', 'Wall Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Standard wall cabinet', 1),
('WDC', 'Wall Diagonal Corner', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Diagonal corner wall cabinet', 2),
('WBC', 'Wall Blind Corner', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Blind corner wall cabinet', 3),
('WMC', 'Wall Magic Corner', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Magic corner wall cabinet', 4),
('WP', 'Wall Panel', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Decorative wall panel', 5),
('WG', 'Wall Glass', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Wall cabinet with glass doors', 6),
('WO', 'Wall Open', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Open wall shelving', 7),
('WS', 'Wall Shelf', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Wall mounted shelf', 8),
('WR', 'Wall Range', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Wall cabinet for range hood', 9),
('WM', 'Wall Microwave', (SELECT id FROM cabinet_categories WHERE code = 'WALL'), 'Wall cabinet for microwave', 10);

-- Tall Cabinet Types
INSERT INTO cabinet_system.cabinet_types (code, name, category_id, description, sort_order) VALUES
('T', 'Tall Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'TALL'), 'Standard tall cabinet', 1),
('PC', 'Pantry Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'TALL'), 'Tall pantry storage cabinet', 2),
('OC', 'Oven Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'TALL'), 'Tall cabinet for oven installation', 3),
('UC', 'Utility Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'TALL'), 'Tall utility storage cabinet', 4),
('LC', 'Linen Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'TALL'), 'Tall linen storage cabinet', 5),
('BR', 'Broom Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'TALL'), 'Tall broom closet cabinet', 6);

-- Vanity Cabinet Types
INSERT INTO cabinet_system.cabinet_types (code, name, category_id, description, sort_order) VALUES
('V', 'Vanity Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Standard vanity cabinet', 1),
('VB', 'Vanity Base', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Vanity base cabinet', 2),
('VD', 'Vanity with Drawers', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Vanity cabinet with drawers', 3),
('VDB', 'Vanity Drawer Base', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Vanity base with drawers', 4),
('VSB', 'Vanity Sink Base', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Vanity sink base cabinet', 5),
('VT', 'Vanity Tower', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Vanity tower cabinet', 6),
('VM', 'Vanity Mirror Cabinet', (SELECT id FROM cabinet_categories WHERE code = 'VANITY'), 'Vanity mirror cabinet', 7);

-- Specialty Cabinet Types
INSERT INTO cabinet_system.cabinet_types (code, name, category_id, description, sort_order) VALUES
('F', 'Filler', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Filler strips and panels', 1),
('CF', 'Crown Filler', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Crown molding filler', 2),
('MOC', 'Molding/Crown', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Decorative molding and crown', 3),
('TK', 'Toe Kick', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Toe kick panels', 4),
('PNL', 'Panel', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Decorative panels', 5),
('D', 'Drawer', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Individual drawer components', 6),
('DWP', 'Dishwasher Panel', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Dishwasher decorative panel', 7),
('RP', 'Refrigerator Panel', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Refrigerator decorative panel', 8),
('ADA', 'ADA Compliant', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'ADA compliant cabinets', 9),
('ISLAND', 'Island Components', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Kitchen island components', 10),
('LEGS', 'Cabinet Legs', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Decorative cabinet legs', 11),
('CORBEL', 'Corbels', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Decorative corbels', 12),
('VALANCE', 'Valances', (SELECT id FROM cabinet_categories WHERE code = 'SPECIALTY'), 'Decorative valances', 13);

-- Add comment about the mapping
COMMENT ON TABLE cabinet_system.cabinet_types IS 'Cabinet types derived from CSV data analysis. Types are grouped by category and represent different cabinet configurations available in the system.';

-- Reset search path
RESET search_path;

-- Migration completion message
DO $$
BEGIN
    RAISE NOTICE 'Cabinet types import completed successfully';
    RAISE NOTICE 'Total cabinet types created: %', (SELECT COUNT(*) FROM cabinet_system.cabinet_types);
END $$;