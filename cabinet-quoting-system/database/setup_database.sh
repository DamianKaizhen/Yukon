#!/bin/bash
# Database setup script for Cabinet Quoting System
# This script creates the database and runs all migrations

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cabinet_system}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Cabinet Quoting System - Database Setup${NC}"
echo "========================================"
echo ""
echo "Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Set PGPASSWORD for non-interactive authentication
export PGPASSWORD=$DB_PASSWORD

# Function to check if database exists
database_exists() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME
}

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    local description=$2
    
    echo -e "${YELLOW}Executing: $description${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $description completed${NC}"
    else
        echo -e "${RED}✗ Error in $description${NC}"
        exit 1
    fi
}

# Step 1: Create database if it doesn't exist
if database_exists; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Dropping existing database...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
        echo -e "${GREEN}Database recreated${NC}"
    fi
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}Database created${NC}"
fi

# Step 2: Run migrations
echo ""
echo -e "${BLUE}Running database migrations...${NC}"
echo "=============================="

MIGRATIONS_DIR="/home/damian/yukon-projects/cabinet-quoting-system/database/migrations"

# Execute migrations in order
execute_sql_file "$MIGRATIONS_DIR/001_create_schema.sql" "Creating database schema"

# Step 3: Import CSV data (optional)
echo ""
read -p "Do you want to import the CSV data? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    # First, copy the CSV to a temporary location and prepare it
    CSV_FILE="/home/damian/yukon-projects/PricesLists cabinets.csv"
    TEMP_CSV="/tmp/cabinet_prices.csv"
    
    if [ -f "$CSV_FILE" ]; then
        echo -e "${YELLOW}Preparing CSV data...${NC}"
        cp "$CSV_FILE" "$TEMP_CSV"
        
        # Create and populate the temporary import table
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SET search_path TO cabinet_system, public;

-- Create temporary import table
CREATE TEMP TABLE csv_import (
    color_option VARCHAR(200),
    item_code VARCHAR(100),
    description TEXT,
    price_particleboard VARCHAR(50),
    price_plywood VARCHAR(50),
    concatenated VARCHAR(300),
    price_uv_birch VARCHAR(50),
    price_white_plywood VARCHAR(50)
);

-- Import CSV data
\COPY csv_import FROM '$TEMP_CSV' DELIMITER ',' CSV HEADER;
EOF
        
        # Run the import migration
        execute_sql_file "$MIGRATIONS_DIR/002_import_csv_data.sql" "Importing CSV data"
        
        # Clean up
        rm -f "$TEMP_CSV"
    else
        echo -e "${RED}CSV file not found at: $CSV_FILE${NC}"
    fi
fi

# Step 4: Load sample data (optional)
echo ""
read -p "Do you want to load sample data (customers, quotes)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SEED_DIR="/home/damian/yukon-projects/cabinet-quoting-system/database/seed-data"
    
    execute_sql_file "$SEED_DIR/02_sample_customers.sql" "Loading sample customers"
    execute_sql_file "$SEED_DIR/03_sample_quotes.sql" "Creating sample quotes"
fi

# Step 5: Display summary
echo ""
echo -e "${BLUE}Database Setup Summary${NC}"
echo "======================"

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SET search_path TO cabinet_system, public;

SELECT 'Tables' as object_type, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'cabinet_system' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'Views', COUNT(*) 
FROM information_schema.views 
WHERE table_schema = 'cabinet_system'
UNION ALL
SELECT 'Indexes', COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'cabinet_system'
UNION ALL
SELECT 'Triggers', COUNT(*) 
FROM information_schema.triggers 
WHERE trigger_schema = 'cabinet_system';

-- Show record counts if data was imported
SELECT '---' as separator, NULL as count;
SELECT 'Color Options' as record_type, COUNT(*) as count FROM color_options
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Product Variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'Prices', COUNT(*) FROM product_pricing
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Quotes', COUNT(*) FROM quotes;
EOF

echo ""
echo -e "${GREEN}Database setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the schema documentation in DATABASE_SCHEMA.md"
echo "2. Test the database with sample queries"
echo "3. Configure your application to connect to the database"
echo ""

# Cleanup
unset PGPASSWORD