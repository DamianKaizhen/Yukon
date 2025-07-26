# Cabinet Quoting System Database Schema Documentation

## Overview

The Cabinet Quoting System database is designed to manage cabinet products, pricing, inventory, and customer quotes. The schema follows PostgreSQL best practices with a normalized structure that ensures data integrity while maintaining query performance.

## Design Decisions

### 1. **Schema Organization**
- Uses a dedicated schema `cabinet_system` to isolate application tables
- Leverages PostgreSQL extensions (uuid-ossp) for better ID generation
- Implements Row Level Security (RLS) on sensitive tables

### 2. **Normalization Strategy**
- Achieved 3rd Normal Form (3NF) to eliminate data redundancy
- Separated concerns: products, variants, pricing, and inventory
- Used lookup tables for maintainable reference data

### 3. **Key Design Patterns**

#### Product-Variant Pattern
- **Products**: Base cabinet models (e.g., "B24FD - Base Cabinet Full Door")
- **Product Variants**: Combinations of products with color options
- **Rationale**: Allows flexible pricing by finish type without duplicating product data

#### Temporal Pricing
- Prices have effective and expiration dates
- Price history table maintains audit trail
- Supports future price changes and historical quote accuracy

#### Flexible Categorization
- Hierarchical category structure with self-referencing foreign key
- Cabinet types linked to categories for organized product browsing

### 4. **Performance Optimizations**
- Strategic indexes on frequently queried columns
- Materialized views for complex queries (can be added as needed)
- Denormalized totals in quotes table with triggers for consistency

## Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│ COLOR_OPTIONS   │         │ BOX_MATERIALS    │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │         │ id (PK)          │
│ name            │         │ code             │
│ display_name    │         │ name             │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │                           │
    ┌────┴─────────────────┐        │
    │ PRODUCT_VARIANTS     │        │
    ├──────────────────────┤        │
    │ id (PK)              │        │
    │ product_id (FK)      │        │
    │ color_option_id (FK) │        │
    │ sku                  │        │
    └────────┬─────────────┘        │
             │                       │
             │    ┌──────────────────┴──────┐
             │    │ PRODUCT_PRICING         │
             │    ├─────────────────────────┤
             │    │ id (PK)                 │
             └────┤ product_variant_id (FK) │
                  │ box_material_id (FK)    │
                  │ price                   │
                  │ effective_date          │
                  └─────────────────────────┘

┌─────────────────┐         ┌──────────────────┐
│ PRODUCTS        │         │ CABINET_TYPES    │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │◄────────┤ id (PK)          │
│ item_code       │         │ code             │
│ name            │         │ name             │
│ cabinet_type_id │         │ category_id (FK) │
│ width/height/   │         └──────────────────┘
│ depth           │                  ▲
│ door_count      │                  │
│ drawer_count    │         ┌────────┴─────────┐
└─────────────────┘         │ CABINET_CATEGORIES│
                           ├──────────────────┤
                           │ id (PK)          │
                           │ code             │
                           │ name             │
                           │ parent_cat_id    │
                           └──────────────────┘
```

## Core Tables

### 1. **Product Management**

#### `products`
- Stores base cabinet models with dimensions and features
- Item codes are unique identifiers from the source system
- Supports L/R (left/right) variants through `is_left_right` flag

#### `product_variants`
- Links products with color options
- SKU field contains the concatenated identifier
- Enables pricing by finish type

#### `product_pricing`
- Current prices by variant and material type
- Temporal design supports price changes over time
- Triggers maintain price history automatically

### 2. **Inventory Management**

#### `inventory`
- Tracks stock levels per product variant
- Computed `quantity_available` field (on_hand - reserved)
- Supports reorder point management

### 3. **Quote Management**

#### `quotes`
- Header information for customer quotes
- Status workflow: draft → sent → approved/rejected/expired
- Denormalized totals updated via triggers

#### `quote_items`
- Line items with product, material, quantity, and pricing
- Supports line-level discounts
- Maintains quote-time pricing for accuracy

### 4. **Reference Data**

#### `color_options`
- Cabinet finish types (e.g., "A TOUCH OF NATURE")
- Normalized from CSV color variations

#### `box_materials`
- Material options affecting pricing
- Includes: ParticleBoard, Plywood, UV Birch, White Plywood

#### `cabinet_categories` & `cabinet_types`
- Hierarchical product organization
- Categories: Base, Wall, Tall, Vanity, Specialty
- Types: Specific cabinet configurations within categories

## Key Features

### 1. **Automatic Timestamps**
All tables include `created_at` and `updated_at` fields with automatic update triggers.

### 2. **UUID Primary Keys**
Uses PostgreSQL's UUID type for better distributed system compatibility and security.

### 3. **Price History Tracking**
Automatic logging of all price changes with user and timestamp information.

### 4. **Referential Integrity**
Foreign key constraints ensure data consistency across related tables.

### 5. **Check Constraints**
Business rules enforced at the database level (e.g., positive prices, valid quantities).

### 6. **Row Level Security**
Implemented on customer and quote tables for multi-tenant security.

## Views

### `current_prices`
Consolidated view of active prices across all products and materials.

### `product_catalog`
Denormalized view for efficient product browsing with category information.

### `inventory_status`
Real-time inventory levels with reorder alerts.

## Security Model

### Roles
- `cabinet_admin`: Full access to all tables
- `cabinet_sales`: Read/write access to quotes and customers
- `cabinet_viewer`: Read-only access to all tables

### Row Level Security
Enabled on sensitive tables to support multi-tenant deployments.

## Migration Strategy

### Initial Setup
1. Run `001_create_schema.sql` to create the database structure
2. Run `002_import_csv_data.sql` to import the CSV data
3. Execute seed scripts for sample data

### CSV Import Process
1. Creates temporary import table
2. Parses and normalizes data into proper tables
3. Extracts dimensions from item codes
4. Handles price string cleaning and conversion
5. Maintains referential integrity throughout

## Performance Considerations

### Indexes
- Strategic indexes on foreign keys and search fields
- Partial indexes for active records
- Composite indexes for common query patterns

### Query Optimization
- Views pre-join commonly accessed data
- Triggers maintain denormalized fields
- Prepared statements recommended for repeated queries

## Maintenance

### Regular Tasks
1. Update prices through `product_pricing` table
2. Monitor inventory levels and reorder points
3. Archive old quotes periodically
4. Vacuum and analyze tables for performance

### Backup Strategy
1. Daily full backups recommended
2. Point-in-time recovery enabled
3. Regular testing of restore procedures

## Future Enhancements

### Potential Additions
1. Multi-warehouse inventory tracking
2. Customer-specific pricing tiers
3. Bundle/kit product support
4. Advanced analytics and reporting views
5. Full-text search on product descriptions
6. Image storage for product photos
7. Quote versioning and change tracking

## API Integration Points

The schema is designed to support RESTful API operations:
- Product catalog browsing by category/type
- Real-time pricing lookups
- Quote CRUD operations
- Inventory availability checks
- Customer management
- Reporting and analytics queries