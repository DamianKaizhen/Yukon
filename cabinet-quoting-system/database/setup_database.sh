#!/bin/bash
# Cabinet Quoting System - Database Setup Script
# ===============================================
# Automated setup script for the complete database environment
# Author: Database Architect Agent
# Created: 2025-07-27

set -e  # Exit on any error

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cabinet_quoting}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
CSV_FILE="${CSV_FILE:-../PricesLists cabinets.csv}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# Execute migrations in order
execute_sql_file "$MIGRATIONS_DIR/001_initial_schema.sql" "Creating database schema"
execute_sql_file "$MIGRATIONS_DIR/002_import_cabinet_types.sql" "Importing cabinet types"

# Step 3: Import CSV data (optional)
echo ""
read -p "Do you want to import the CSV data? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ -f "$CSV_FILE" ]; then
        echo -e "${YELLOW}Installing Python dependencies...${NC}"
        cd "$SCRIPT_DIR/scripts"
        pip3 install -r requirements.txt > /dev/null 2>&1
        
        echo -e "${YELLOW}Importing CSV data...${NC}"
        DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        python3 import_cabinet_csv.py --csv-file "$CSV_FILE" --db-url "$DB_URL"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ CSV data imported successfully${NC}"
        else
            echo -e "${RED}✗ Error importing CSV data${NC}"
            exit 1
        fi
    else
        echo -e "${RED}CSV file not found at: $CSV_FILE${NC}"
        echo "You can import data later using:"
        echo "python3 scripts/import_cabinet_csv.py --csv-file \"path/to/cabinets.csv\""
    fi
fi

# Step 4: Load sample data (optional)
echo ""
read -p "Do you want to load sample data (customers, quotes)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SEED_DIR="$SCRIPT_DIR/seeds"
    
    execute_sql_file "$SEED_DIR/001_sample_customers.sql" "Loading sample customers"
    execute_sql_file "$SEED_DIR/002_sample_quotes.sql" "Creating sample quotes"
fi

# Step 5: Run tests (optional)
echo ""
read -p "Do you want to run database tests? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Running database tests...${NC}"
    cd "$SCRIPT_DIR/scripts"
    DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    python3 test_database.py --db-url "$DB_URL" --verbose
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ All database tests passed${NC}"
    else
        echo -e "${YELLOW}⚠ Some tests failed - review output above${NC}"
    fi
fi

# Step 6: Display summary
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
echo "Connection Details:"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME" 
echo "  User: $DB_USER"
echo "  Connection URL: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "Default Admin User:"
echo "  Email: admin@yudezign.com"
echo "  Password: admin123 (CHANGE IN PRODUCTION!)"
echo ""
echo "Next steps:"
echo "1. Review the schema documentation in DATABASE_SCHEMA.md"
echo "2. Change the default admin password"
echo "3. Configure your application to connect to the database"
echo "4. Start building your Cabinet Quoting System application"
echo ""
echo "Useful commands:"
echo "  Connect to database: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo "  Run tests: cd scripts && python3 test_database.py"
echo "  Import more data: cd scripts && python3 import_cabinet_csv.py --csv-file \"file.csv\""
echo ""

# Cleanup
unset PGPASSWORD