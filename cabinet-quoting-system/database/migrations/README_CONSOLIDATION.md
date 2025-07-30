# Cabinet Type Consolidation Migration

## Overview

This migration (003_consolidate_cabinet_types.sql) consolidates cabinet types by size and extracts dimensional information from item codes. It analyzes the existing cabinet data and groups similar products into base cabinet types for better organization and filtering.

## What This Migration Does

### 1. **Adds New Fields to Products Table**
- `base_cabinet_type` VARCHAR(50) - Consolidated type grouping (e.g., "BFD", "B-LR", "W", "2DB")
- `display_name` VARCHAR(200) - User-friendly display name (e.g., "Base Cabinet Full Door")
- `width_inches_extracted` DECIMAL(5,2) - Width extracted directly from item code

### 2. **Pattern Analysis & Consolidation**
The migration recognizes and consolidates these cabinet patterns:

#### Base Cabinets
- **BFD / BFD-LR**: Full door base cabinets (B24FD, B30FD, B24FD-L/R, etc.)
- **B / B-LR**: Base cabinets with doors and drawers (B24, B30, B18-L/R, etc.)
- **B12**: 12" deep base cabinets (B1212, B1512, etc.)
- **2DB, 3DB, 4DB**: Multi-drawer base cabinets (2DB24, 3DB30, etc.)
- **BC**: Blind corner base cabinets (BC39R, BC42L)
- **BLS**: Lazy Susan base cabinets (BLS36)
- **SB**: Sink base cabinets (SB24, SB30, etc.)

#### Vanity Cabinets
- **VSB**: Vanity sink base (VSB2421, VSB3021, etc.)
- **VB**: Vanity base with door and drawer (VB24, VB30, etc.)
- **V2DB, V3DB**: Vanity multi-drawer base (V2DB1521, V3DB2421, etc.)
- **VD**: Vanity floating drawers (VD621, VD630, etc.)
- **VDB**: Vanity floating drawer base (VDB2421, VDB3021, etc.)

#### ADA Compliant
- **ADA-VSB**: ADA vanity sink base (ADA-VSB2421, ADA-VSB3021, etc.)
- **ADA-SB**: ADA sink base (ADA-SB2421, ADA-SB3024, etc.)

#### Wall Cabinets
- **W / W-LR**: Wall cabinets with height designation (W3018, W2412, W1218-L/R, etc.)

#### Tall Cabinets
- **PC / PC-LR**: Pantry cabinets (PC2484, PC1584-L/R, etc.)
- **LC / LC-LR**: Linen cabinets (LC1884, LC2484-L/R, etc.)

#### Accessories & Panels
- **F**: Filler strips (F3, F6, etc.)
- **PNL**: Decorative panels (PNL1434, etc.)
- **WP**: Wall panels (WP1330, etc.)
- **BP**: Base panels (BP2434, etc.)
- **RP**: Refrigerator panels (RP2496, etc.)
- **DWP**: Dishwasher panels (DWP2434, etc.)
- **CF**: Crown/Frieze (CF96, etc.)
- **TK**: Toe kick (TK96, etc.)

#### Specialty Items
- **MOC**: Microwave/Oven cabinets (MOC3012, etc.)
- **D**: Single level floating drawers (D627, D630, etc.)

### 3. **Dimension Extraction**
- Automatically extracts width from item codes (B30FD → 30.00 inches)
- Assigns standard heights and depths based on cabinet type
- Identifies left/right variants (items ending in -L/R)

### 4. **Door & Drawer Count Assignment**
- Automatically determines door and drawer counts based on cabinet type
- Accounts for left/right variants (single door vs double door)

### 5. **Creates New Views**
- `consolidated_product_groups`: Summary of base types with size ranges
- `product_catalog_consolidated`: Enhanced product catalog with consolidation data

## How to Run the Migration

### Prerequisites
1. Initial schema migration (001_initial_schema.sql) must be completed
2. Cabinet data must be imported into the products table
3. PostgreSQL database must be accessible

### Option 1: Using the Python Runner (Recommended)
```bash
cd database/scripts
python run_consolidation_migration.py
```

### Option 2: Direct SQL Execution
```bash
psql -h localhost -U cabinet_user -d cabinet_quoting -f migrations/003_consolidate_cabinet_types.sql
```

## Testing & Validation

### 1. Test the Consolidation Function
```bash
cd database/scripts
python test_consolidation_function.py
```

### 2. Analyze Migration Results
```bash
cd database/scripts
python analyze_consolidation_results.py
```

## Expected Results

After running the migration, you should see:

- **High consolidation rate**: 95%+ of products should be successfully consolidated
- **Dimension extraction**: 90%+ of products should have width extracted
- **Base type groups**: 20-30 unique base cabinet types covering all products
- **Proper categorization**: Similar cabinets grouped by function and size

## Example Consolidation Results

| Item Code | Base Type | Display Name | Width | Doors | Drawers |
|-----------|-----------|--------------|-------|-------|---------|
| B30FD | BFD | Base Cabinet Full Door | 30.00 | 2 | 0 |
| B24FD-L/R | BFD-LR | Base Cabinet Full Door (Left/Right) | 24.00 | 1 | 0 |
| B36 | B | Base Cabinet 2 Door 1 Drawer | 36.00 | 2 | 1 |
| B18-L/R | B-LR | Base Cabinet 1 Door 1 Drawer (Left/Right) | 18.00 | 1 | 1 |
| 3DB24 | 3DB | 3 Drawer Base Cabinet | 24.00 | 0 | 3 |
| W3018 | W | Wall Cabinet 18H - Double Door | 30.00 | 2 | 0 |
| VSB3021 | VSB | Vanity Sink Base | 30.00 | 2 | 0 |

## Benefits of Consolidation

### 1. **Improved User Experience**
- Group similar products by base type for easier browsing
- Filter by size ranges within each type
- Show consolidated product families instead of individual SKUs

### 2. **Better Data Organization**
- Consistent categorization across all products
- Standardized dimensions and specifications
- Clear product hierarchies

### 3. **Enhanced Search & Filtering**
- Search by base cabinet type
- Filter by size ranges
- Find all variants of a specific cabinet style

### 4. **Simplified Inventory Management**
- Group inventory by base types
- Track popular size ranges
- Optimize stock levels by category

## Usage Examples

### Query Products by Base Type
```sql
SELECT * FROM cabinet_system.products 
WHERE base_cabinet_type = 'BFD' 
ORDER BY width_inches_extracted;
```

### Get Size Ranges for Each Type
```sql
SELECT * FROM cabinet_system.consolidated_product_groups 
ORDER BY product_count DESC;
```

### Enhanced Product Catalog
```sql
SELECT base_cabinet_type, display_name, min_price, max_price, variant_count
FROM cabinet_system.product_catalog_consolidated
WHERE base_cabinet_type = 'W'
ORDER BY width_inches_extracted;
```

## Troubleshooting

### Common Issues

1. **Low consolidation rate**: Check if item codes follow expected patterns
2. **Missing dimensions**: Verify item codes contain numeric width values
3. **Migration fails**: Ensure all prerequisites are met and database is accessible

### Getting Help

1. Run the test script first to validate the function logic
2. Use the analysis script to identify unconsolidated items
3. Check the migration logs for specific error messages

## Rollback

If you need to rollback this migration:

```sql
-- Remove added columns
ALTER TABLE cabinet_system.products 
DROP COLUMN IF EXISTS base_cabinet_type,
DROP COLUMN IF EXISTS display_name,
DROP COLUMN IF EXISTS width_inches_extracted;

-- Drop created views
DROP VIEW IF EXISTS cabinet_system.consolidated_product_groups;
DROP VIEW IF EXISTS cabinet_system.product_catalog_consolidated;

-- Drop the consolidation function
DROP FUNCTION IF EXISTS cabinet_system.analyze_and_consolidate_cabinet_type(TEXT);
```

## Next Steps

After successful consolidation:

1. **Update Frontend**: Use consolidated fields for product filtering and display
2. **Enhance Search**: Implement search by base cabinet type and size ranges
3. **Improve UX**: Group similar products in the catalog interface
4. **Analytics**: Track popular cabinet types and sizes for inventory planning

## Support

For issues or questions about this migration:

1. Check the test and analysis scripts for validation
2. Review the PostgreSQL logs for detailed error messages
3. Verify the source CSV data contains expected patterns