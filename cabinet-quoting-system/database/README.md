# Cabinet Quoting System Database

This directory contains the complete database schema, migration scripts, import tools, and testing utilities for the Cabinet Quoting System.

## Overview

The database is designed using PostgreSQL with a normalized schema that supports:
- Product catalog management with variants and pricing
- Customer relationship management
- Quote generation and tracking
- Inventory management
- User authentication and authorization
- Comprehensive audit logging

## Database Structure

### Schema Organization
- **Schema**: `cabinet_system` - All application tables are contained within this dedicated schema
- **Extensions**: Uses `uuid-ossp` for UUID generation and `pg_trgm` for full-text search performance

### Core Entities
1. **Products & Variants**: Normalized product catalog with color options and material pricing
2. **Customers**: Customer information with billing/shipping addresses
3. **Quotes**: Quote management with line items and status tracking
4. **Users**: Authentication and role-based authorization
5. **Inventory**: Stock tracking and reorder management
6. **Audit Logs**: Complete audit trail for quote changes

## Quick Start

### Prerequisites
- PostgreSQL 12+ installed and running
- Python 3.8+ with psycopg2 installed
- Access to the cabinet CSV data file

### 1. Create Database
```bash
createdb cabinet_quoting
```

### 2. Run Initial Migration
```bash
psql -d cabinet_quoting -f migrations/001_initial_schema.sql
```

### 3. Set Up Cabinet Types
```bash
psql -d cabinet_quoting -f migrations/002_import_cabinet_types.sql
```

### 4. Import CSV Data
```bash
cd scripts
pip install -r requirements.txt
python import_cabinet_csv.py --csv-file "../../PricesLists cabinets.csv" --db-url "postgresql://postgres:password@localhost:5432/cabinet_quoting"
```

### 5. Add Sample Data (Optional)
```bash
psql -d cabinet_quoting -f seeds/001_sample_customers.sql
psql -d cabinet_quoting -f seeds/002_sample_quotes.sql
```

### 6. Test Database
```bash
cd scripts
python test_database.py --db-url "postgresql://postgres:password@localhost:5432/cabinet_quoting" --verbose
```

## File Structure

```
database/
├── README.md                    # This file
├── DATABASE_SCHEMA.md          # Detailed schema documentation
├── migrations/                 # Database migration scripts
│   ├── 001_initial_schema.sql  # Core schema creation
│   └── 002_import_cabinet_types.sql # Cabinet type definitions
├── scripts/                    # Python utilities
│   ├── requirements.txt        # Python dependencies
│   ├── import_cabinet_csv.py   # CSV import tool
│   └── test_database.py        # Database testing suite
└── seeds/                      # Sample data for testing
    ├── 001_sample_customers.sql # Sample customer records
    └── 002_sample_quotes.sql    # Sample quote records
```

## Migration Scripts

### 001_initial_schema.sql
- Creates the `cabinet_system` schema
- Defines all core tables with proper relationships
- Sets up indexes for performance
- Creates functions and triggers for business logic
- Establishes security roles and permissions
- Inserts basic reference data

### 002_import_cabinet_types.sql
- Populates cabinet_types table based on CSV data analysis
- Maps cabinet prefixes to proper categories
- Sets up hierarchical type relationships

## Import Tools

### import_cabinet_csv.py
A comprehensive Python script that imports cabinet data from CSV files:

**Features:**
- Intelligent parsing of item codes to extract dimensions
- Price string cleaning and decimal conversion
- Duplicate detection and handling
- Data validation and error reporting
- Dry-run mode for testing
- Progress tracking and statistics

**Usage:**
```bash
python import_cabinet_csv.py --csv-file "path/to/cabinets.csv" [--dry-run] [--db-url "connection_string"]
```

**Options:**
- `--csv-file`: Path to the cabinet CSV file (required)
- `--db-url`: PostgreSQL connection string (default: localhost)
- `--dry-run`: Validate data without importing

## Testing

### test_database.py
Comprehensive testing suite that validates:

**Schema Tests:**
- Table existence and structure
- Index coverage and performance
- View functionality
- Function and trigger behavior
- Constraint enforcement

**Data Tests:**
- Reference data population
- Data integrity rules
- Business logic validation

**Performance Tests:**
- Query execution time
- Index effectiveness
- View performance

**Usage:**
```bash
python test_database.py [--db-url "connection_string"] [--verbose]
```

## Sample Data

### Customer Data (001_sample_customers.sql)
Creates 10 diverse sample customers including:
- Kitchen design companies
- Renovation contractors
- Property developers
- Individual homeowners
- Bulk buyers with tax exemptions

### Quote Data (002_sample_quotes.sql)
Creates sample quotes in various states:
- Draft quotes
- Sent quotes
- Approved quotes
- Expired quotes
- Complete audit trail

## Performance Optimization

### Indexing Strategy
- Primary key indexes on all tables
- Foreign key indexes for join performance
- Composite indexes for common query patterns
- Partial indexes for active records only
- GIN indexes for full-text search using pg_trgm

### Query Optimization
- Materialized views for complex reports (future enhancement)
- Denormalized totals in quotes table
- Efficient pagination support
- Optimized search patterns

## Security Features

### Role-Based Access Control
- `cabinet_admin`: Full system access
- `cabinet_sales`: Quote and customer management
- `cabinet_viewer`: Read-only access

### Row Level Security
- Enabled on sensitive tables (customers, quotes)
- Supports multi-tenant deployments
- User-based data isolation

### Data Protection
- All prices stored as DECIMAL for accuracy
- Check constraints enforce business rules
- Foreign key constraints ensure referential integrity
- Audit logging for all quote changes

## Business Logic

### Automatic Calculations
- Quote line totals calculated via triggers
- Quote totals updated automatically
- Tax calculations based on configurable rates
- Inventory available quantities computed

### Price Management
- Temporal pricing with effective/expiration dates
- Automatic price change logging
- Support for future price changes
- Historical price preservation

### Quote Workflow
- Status-based quote lifecycle
- Automatic timestamp tracking
- Comprehensive audit trail
- PDF generation tracking

## Maintenance

### Regular Tasks
1. **Backup**: Daily full backups recommended
2. **Statistics**: Update table statistics weekly
3. **Vacuum**: Regular vacuum and analyze operations
4. **Monitoring**: Monitor slow queries and index usage

### Data Archival
- Archive old quotes periodically
- Maintain price history indefinitely
- Customer data retention policies
- Audit log rotation strategy

## Troubleshooting

### Common Issues

**Import Failures:**
- Check CSV file encoding (UTF-8 with BOM)
- Verify database connection parameters
- Ensure sufficient disk space
- Check PostgreSQL logs for detailed errors

**Performance Issues:**
- Run ANALYZE on tables after large imports
- Check index usage with EXPLAIN ANALYZE
- Monitor connection pool settings
- Review slow query logs

**Data Integrity:**
- Validate foreign key relationships
- Check constraint violations
- Review trigger execution logs
- Verify sequence values

### Debugging Tools

**Query Analysis:**
```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
```

**Index Usage:**
```sql
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE schemaname = 'cabinet_system';
```

**Table Statistics:**
```sql
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
WHERE schemaname = 'cabinet_system';
```

## Future Enhancements

### Planned Features
1. Multi-warehouse inventory tracking
2. Customer-specific pricing tiers
3. Bundle/kit product support
4. Advanced analytics views
5. Full-text search optimization
6. Image storage for products
7. Quote versioning system

### Scalability Considerations
1. Horizontal partitioning for large datasets
2. Read replicas for reporting
3. Connection pooling optimization
4. Caching layer integration
5. API rate limiting support

## Support

For database-related issues:
1. Check the troubleshooting section above
2. Review PostgreSQL logs
3. Run the test suite to identify issues
4. Consult the detailed schema documentation

## Contributing

When making database changes:
1. Create new migration scripts (don't modify existing ones)
2. Update the schema documentation
3. Add corresponding test cases
4. Verify backward compatibility
5. Test with realistic data volumes