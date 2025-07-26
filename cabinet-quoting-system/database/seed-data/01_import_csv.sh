#!/bin/bash
# Script to import CSV data into PostgreSQL database
# This script loads the cabinet price list CSV file into the database

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cabinet_system}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
CSV_FILE="/home/damian/yukon-projects/PricesLists cabinets.csv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cabinet Quoting System - CSV Data Import${NC}"
echo "========================================"
echo ""

# Check if CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo -e "${RED}Error: CSV file not found at $CSV_FILE${NC}"
    exit 1
fi

# Set PGPASSWORD for non-interactive authentication
export PGPASSWORD=$DB_PASSWORD

# Function to execute SQL
execute_sql() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

# Function to execute SQL file
execute_sql_file() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$1"
}

# Step 1: Create temporary table and load CSV
echo -e "${YELLOW}Step 1: Creating temporary import table...${NC}"
execute_sql "
SET search_path TO cabinet_system, public;

DROP TABLE IF EXISTS csv_import;
CREATE TEMP TABLE csv_import (
    color_option VARCHAR(200),
    item_code VARCHAR(100),
    description TEXT,
    price_particleboard VARCHAR(50),
    price_plywood VARCHAR(50),
    concatenated VARCHAR(300),
    price_uv_birch VARCHAR(50),
    price_white_plywood VARCHAR(50)
);"

# Step 2: Load CSV data
echo -e "${YELLOW}Step 2: Loading CSV data...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\COPY cabinet_system.csv_import FROM '$CSV_FILE' DELIMITER ',' CSV HEADER"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CSV data loaded successfully!${NC}"
else
    echo -e "${RED}Error loading CSV data${NC}"
    exit 1
fi

# Step 3: Run the import migration
echo -e "${YELLOW}Step 3: Running data import migration...${NC}"
execute_sql_file "/home/damian/yukon-projects/cabinet-quoting-system/database/migrations/002_import_csv_data.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Data import completed successfully!${NC}"
else
    echo -e "${RED}Error during data import${NC}"
    exit 1
fi

# Step 4: Display import statistics
echo ""
echo -e "${YELLOW}Import Statistics:${NC}"
execute_sql "
SET search_path TO cabinet_system, public;
SELECT 'Color Options' as entity, COUNT(*) as count FROM color_options
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Product Variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'Prices', COUNT(*) FROM product_pricing
UNION ALL
SELECT 'Cabinet Types', COUNT(*) FROM cabinet_types
UNION ALL
SELECT 'Cabinet Categories', COUNT(*) FROM cabinet_categories;"

echo ""
echo -e "${GREEN}CSV import completed successfully!${NC}"

# Cleanup
unset PGPASSWORD