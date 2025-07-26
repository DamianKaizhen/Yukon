#!/usr/bin/env python3
"""
Cabinet Quoting System - CSV Data Import Script
Author: Database Architect
Date: 2025-07-26

This script imports cabinet data from the CSV file into the normalized PostgreSQL database.
It handles data validation, cleaning, and error reporting.
"""

import csv
import psycopg2
import os
import sys
import re
from decimal import Decimal, InvalidOperation
from typing import Optional, Dict, Any, List
import argparse
from pathlib import Path

# Database connection parameters
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'cabinet_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'options': '-c search_path=cabinet_system,public'
}

class CabinetDataImporter:
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.conn = None
        self.cur = None
        self.errors = []
        self.stats = {
            'csv_rows': 0,
            'products_inserted': 0,
            'variants_inserted': 0,
            'prices_inserted': 0,
            'errors': 0
        }

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.cur = self.conn.cursor()
            print("✓ Connected to database")
        except Exception as e:
            raise Exception(f"Failed to connect to database: {e}")

    def disconnect(self):
        """Close database connection"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()

    def clean_price(self, price_str: str) -> Optional[Decimal]:
        """Clean and convert price string to Decimal"""
        if not price_str or price_str.strip() == '':
            return None
        
        try:
            # Remove dollar signs, commas, and whitespace
            cleaned = re.sub(r'[$,\s"]', '', price_str.strip())
            if cleaned == '':
                return None
            return Decimal(cleaned)
        except (InvalidOperation, ValueError):
            return None

    def parse_dimensions(self, item_code: str, description: str) -> Dict[str, Optional[Decimal]]:
        """Extract dimensions from item code and description"""
        dimensions = {'width': None, 'height': None, 'depth': None}
        
        # Extract width from item code (first number after letters)
        width_match = re.search(r'[A-Z]+(\d+)', item_code)
        if width_match:
            try:
                dimensions['width'] = Decimal(width_match.group(1))
            except InvalidOperation:
                pass
        
        # Extract height from description (pattern like "36H", "42H")
        height_match = re.search(r'(\d+)H', description)
        if height_match:
            try:
                dimensions['height'] = Decimal(height_match.group(1))
            except InvalidOperation:
                pass
        
        # Extract depth from description (pattern like "21"D", "24"D")
        depth_match = re.search(r'(\d+)"?D', description)
        if depth_match:
            try:
                dimensions['depth'] = Decimal(depth_match.group(1))
            except InvalidOperation:
                pass
        
        # Set default depths if not specified
        if dimensions['depth'] is None:
            if item_code.startswith('B'):
                dimensions['depth'] = Decimal('24')  # Standard base cabinet depth
            elif item_code.startswith('W'):
                dimensions['depth'] = Decimal('12')  # Standard wall cabinet depth
            elif item_code.startswith('V'):
                dimensions['depth'] = Decimal('21')  # Standard vanity depth
        
        return dimensions

    def get_cabinet_type_id(self, description: str) -> Optional[str]:
        """Determine cabinet type based on description patterns"""
        description_lower = description.lower()
        
        # Base Cabinets
        if 'base cabinet full door' in description_lower:
            return 'BASE_FULL_DOOR'
        elif 'base cabinet' in description_lower and ('door' in description_lower and 'drawer' in description_lower):
            return 'BASE_STANDARD'
        elif 'blind corner base' in description_lower:
            return 'BASE_BLIND_CORNER'
        elif 'lazy suzan base' in description_lower or 'lazy susan base' in description_lower:
            return 'BASE_LAZY_SUSAN'
        elif 'drawer base cabinet' in description_lower:
            return 'BASE_DRAWER'
        elif '12"d base' in description_lower or '12" d base' in description_lower:
            return 'BASE_12D'
        elif 'ada sink base' in description_lower:
            return 'ADA_SINK_BASE'
        elif 'sink base' in description_lower and 'vanity' not in description_lower:
            return 'SINK_BASE'
        
        # Wall Cabinets
        elif 'wall cabinet' in description_lower and 'flip up' in description_lower:
            return 'WALL_FLIP_UP'
        elif 'wall cabinet' in description_lower and ('h' in description_lower or 'height' in description_lower):
            return 'WALL_STANDARD'
        elif 'wall fridge unit' in description_lower:
            return 'WALL_FRIDGE'
        elif 'vanity head knocker' in description_lower:
            return 'VANITY_HEAD_KNOCKER'
        
        # Vanity Cabinets
        elif 'vanity sink base' in description_lower:
            return 'VANITY_SINK_BASE'
        elif 'vanity' in description_lower and 'drawer base' in description_lower:
            return 'VANITY_DRAWER_BASE'
        elif 'vanity base' in description_lower:
            return 'VANITY_BASE'
        elif 'vanity' in description_lower and 'floating' in description_lower:
            return 'VANITY_FLOATING'
        
        # Tall Cabinets
        elif 'pantry' in description_lower:
            return 'PANTRY'
        elif 'oven cabinet' in description_lower:
            return 'OVEN_CABINET'
        
        return None

    def count_doors_drawers(self, description: str) -> Dict[str, int]:
        """Count doors and drawers from description"""
        counts = {'doors': 0, 'drawers': 0}
        description_lower = description.lower()
        
        # Count doors
        if '2 door' in description_lower or '2door' in description_lower or 'double door' in description_lower:
            counts['doors'] = 2
        elif '1 door' in description_lower or '1door' in description_lower or 'single door' in description_lower:
            counts['doors'] = 1
        
        # Count drawers
        if '3 drawer' in description_lower or '3drawer' in description_lower:
            counts['drawers'] = 3
        elif '2 drawer' in description_lower or '2drawer' in description_lower:
            counts['drawers'] = 2
        elif '1 drawer' in description_lower or '1drawer' in description_lower or 'single drawer' in description_lower:
            counts['drawers'] = 1
        
        return counts

    def setup_lookup_data(self):
        """Insert basic lookup data (colors, materials, categories)"""
        print("Setting up lookup data...")
        
        # Insert box materials
        box_materials = [
            ('PARTICLEBOARD', 'ParticleBoard Box', 1),
            ('PLYWOOD', 'Plywood Box', 2),
            ('UV_BIRCH', 'UV Birch Plywood', 3),
            ('WHITE_PLYWOOD', 'White Plywood', 4)
        ]
        
        for code, name, sort_order in box_materials:
            self.cur.execute("""
                INSERT INTO box_materials (code, name, sort_order) 
                VALUES (%s, %s, %s) 
                ON CONFLICT (code) DO NOTHING
            """, (code, name, sort_order))
        
        # Insert cabinet categories
        categories = [
            ('BASE', 'Base Cabinets', 1),
            ('WALL', 'Wall Cabinets', 2),
            ('TALL', 'Tall Cabinets', 3),
            ('VANITY', 'Vanity Cabinets', 4),
            ('SPECIALTY', 'Specialty Cabinets', 5)
        ]
        
        for code, name, sort_order in categories:
            self.cur.execute("""
                INSERT INTO cabinet_categories (code, name, sort_order) 
                VALUES (%s, %s, %s) 
                ON CONFLICT (code) DO NOTHING
            """, (code, name, sort_order))
        
        self.conn.commit()
        print("✓ Lookup data setup complete")

    def insert_cabinet_types(self, csv_data: List[Dict[str, str]]):
        """Insert cabinet types based on CSV data patterns"""
        print("Setting up cabinet types...")
        
        # Get category IDs
        category_map = {}
        self.cur.execute("SELECT code, id FROM cabinet_categories")
        for code, cat_id in self.cur.fetchall():
            category_map[code] = cat_id
        
        # Define cabinet types based on patterns found in CSV
        cabinet_types = [
            ('BASE_FULL_DOOR', 'Base Cabinet Full Door', 'BASE'),
            ('BASE_STANDARD', 'Base Cabinet', 'BASE'),
            ('BASE_BLIND_CORNER', 'Blind Corner Base', 'BASE'),
            ('BASE_LAZY_SUSAN', 'Lazy Susan Base', 'BASE'),
            ('BASE_DRAWER', 'Drawer Base Cabinet', 'BASE'),
            ('BASE_12D', '12" Deep Base Cabinet', 'BASE'),
            ('SINK_BASE', 'Sink Base', 'BASE'),
            ('ADA_SINK_BASE', 'ADA Sink Base', 'BASE'),
            ('WALL_STANDARD', 'Wall Cabinet', 'WALL'),
            ('WALL_FLIP_UP', 'Wall Cabinet Flip Up', 'WALL'),
            ('WALL_FRIDGE', 'Wall Fridge Unit', 'WALL'),
            ('VANITY_SINK_BASE', 'Vanity Sink Base', 'VANITY'),
            ('VANITY_BASE', 'Vanity Base', 'VANITY'),
            ('VANITY_DRAWER_BASE', 'Vanity Drawer Base', 'VANITY'),
            ('VANITY_FLOATING', 'Vanity Floating', 'VANITY'),
            ('VANITY_HEAD_KNOCKER', 'Vanity Head Knocker', 'WALL'),
            ('PANTRY', 'Pantry Cabinet', 'TALL'),
            ('OVEN_CABINET', 'Oven Cabinet', 'TALL'),
        ]
        
        for code, name, category_code in cabinet_types:
            self.cur.execute("""
                INSERT INTO cabinet_types (code, name, category_id) 
                VALUES (%s, %s, %s) 
                ON CONFLICT (code) DO NOTHING
            """, (code, name, category_map[category_code]))
        
        self.conn.commit()
        print("✓ Cabinet types setup complete")

    def import_csv_data(self, csv_file_path: str):
        """Main import function"""
        print(f"Importing data from {csv_file_path}...")
        
        # Read CSV data
        csv_data = []
        try:
            with open(csv_file_path, 'r', encoding='utf-8-sig') as file:
                reader = csv.DictReader(file)
                csv_data = list(reader)
                self.stats['csv_rows'] = len(csv_data)
                print(f"✓ Read {len(csv_data)} rows from CSV")
        except Exception as e:
            raise Exception(f"Failed to read CSV file: {e}")
        
        # Setup lookup data
        self.setup_lookup_data()
        self.insert_cabinet_types(csv_data)
        
        # Extract unique color options
        color_options = set()
        for row in csv_data:
            if row.get('Color Option'):
                color_options.add(row['Color Option'].strip())
        
        # Insert color options
        for color_name in color_options:
            code = color_name.upper().replace(' ', '_').replace('/', '_')
            self.cur.execute("""
                INSERT INTO color_options (name, display_name) 
                VALUES (%s, %s) 
                ON CONFLICT (name) DO NOTHING
            """, (code, color_name))
        
        self.conn.commit()
        print(f"✓ Inserted {len(color_options)} color options")
        
        # Get lookup data for referencing
        self.cur.execute("SELECT code, id FROM cabinet_types")
        cabinet_type_map = {code: cat_id for code, cat_id in self.cur.fetchall()}
        
        self.cur.execute("SELECT name, id FROM color_options")
        color_map = {name: color_id for name, color_id in self.cur.fetchall()}
        
        self.cur.execute("SELECT code, id FROM box_materials")
        material_map = {code: mat_id for code, mat_id in self.cur.fetchall()}
        
        # Process each CSV row
        products_inserted = set()
        
        for row_num, row in enumerate(csv_data, 1):
            try:
                item_code = row.get('Item Code', '').strip()
                color_option = row.get('Color Option', '').strip()
                description = row.get('Description', '').strip()
                
                if not item_code or not color_option or not description:
                    self.errors.append(f"Row {row_num}: Missing required fields")
                    continue
                
                # Insert product if not already inserted
                if item_code not in products_inserted:
                    dimensions = self.parse_dimensions(item_code, description)
                    cabinet_type_code = self.get_cabinet_type_id(description)
                    cabinet_type_id = cabinet_type_map.get(cabinet_type_code) if cabinet_type_code else None
                    counts = self.count_doors_drawers(description)
                    is_left_right = item_code.endswith('-L/R')
                    
                    self.cur.execute("""
                        INSERT INTO products (
                            item_code, name, description, cabinet_type_id,
                            width, height, depth, door_count, drawer_count, is_left_right
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (item_code) DO NOTHING
                    """, (
                        item_code, description, description, cabinet_type_id,
                        dimensions['width'], dimensions['height'], dimensions['depth'],
                        counts['doors'], counts['drawers'], is_left_right
                    ))
                    
                    products_inserted.add(item_code)
                    self.stats['products_inserted'] += 1
                
                # Get product ID
                self.cur.execute("SELECT id FROM products WHERE item_code = %s", (item_code,))
                product_result = self.cur.fetchone()
                if not product_result:
                    self.errors.append(f"Row {row_num}: Product not found for item code {item_code}")
                    continue
                
                product_id = product_result[0]
                
                # Insert product variant
                color_code = color_option.upper().replace(' ', '_').replace('/', '_')
                color_id = color_map.get(color_code)
                if not color_id:
                    self.errors.append(f"Row {row_num}: Color option not found: {color_option}")
                    continue
                
                concatenated = row.get('Concatenated', f"{color_option} - {item_code}").strip()
                
                self.cur.execute("""
                    INSERT INTO product_variants (product_id, color_option_id, sku)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (product_id, color_option_id) DO NOTHING
                    RETURNING id
                """, (product_id, color_id, concatenated))
                
                variant_result = self.cur.fetchone()
                if variant_result:
                    variant_id = variant_result[0]
                    self.stats['variants_inserted'] += 1
                else:
                    # Get existing variant ID
                    self.cur.execute("""
                        SELECT id FROM product_variants 
                        WHERE product_id = %s AND color_option_id = %s
                    """, (product_id, color_id))
                    variant_id = self.cur.fetchone()[0]
                
                # Insert pricing data
                price_columns = [
                    ('Price with ParticleBoard Box', 'PARTICLEBOARD'),
                    ('Price with Plywood Box', 'PLYWOOD'),
                    ('UV Birch Plywood', 'UV_BIRCH'),
                    ('White Plywood', 'WHITE_PLYWOOD')
                ]
                
                for price_col, material_code in price_columns:
                    price_str = row.get(price_col, '').strip()
                    price = self.clean_price(price_str)
                    
                    if price is not None:
                        material_id = material_map[material_code]
                        
                        self.cur.execute("""
                            INSERT INTO product_pricing (product_variant_id, box_material_id, price)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (product_variant_id, box_material_id, effective_date) DO NOTHING
                        """, (variant_id, material_id, price))
                        
                        self.stats['prices_inserted'] += 1
                
            except Exception as e:
                error_msg = f"Row {row_num}: {str(e)}"
                self.errors.append(error_msg)
                self.stats['errors'] += 1
                print(f"⚠ {error_msg}")
        
        # Initialize inventory for all variants
        self.cur.execute("""
            INSERT INTO inventory (product_variant_id, quantity_on_hand, quantity_reserved)
            SELECT id, 0, 0 FROM product_variants
            ON CONFLICT (product_variant_id) DO NOTHING
        """)
        
        self.conn.commit()
        print("✓ Import completed")

    def print_stats(self):
        """Print import statistics"""
        print("\n" + "="*50)
        print("IMPORT STATISTICS")
        print("="*50)
        print(f"CSV rows processed: {self.stats['csv_rows']}")
        print(f"Products inserted: {self.stats['products_inserted']}")
        print(f"Variants inserted: {self.stats['variants_inserted']}")
        print(f"Prices inserted: {self.stats['prices_inserted']}")
        print(f"Errors encountered: {self.stats['errors']}")
        
        if self.errors:
            print(f"\nFirst 10 errors:")
            for error in self.errors[:10]:
                print(f"  - {error}")
            if len(self.errors) > 10:
                print(f"  ... and {len(self.errors) - 10} more errors")

def main():
    parser = argparse.ArgumentParser(description='Import cabinet CSV data into PostgreSQL database')
    parser.add_argument('csv_file', help='Path to the CSV file to import')
    parser.add_argument('--host', default='localhost', help='Database host')
    parser.add_argument('--port', default='5432', help='Database port')
    parser.add_argument('--database', default='cabinet_system', help='Database name')
    parser.add_argument('--user', default='postgres', help='Database user')
    parser.add_argument('--password', help='Database password')
    
    args = parser.parse_args()
    
    # Check if CSV file exists
    if not Path(args.csv_file).exists():
        print(f"Error: CSV file '{args.csv_file}' not found")
        sys.exit(1)
    
    # Update DB config with command line arguments
    db_config = DB_CONFIG.copy()
    if args.host:
        db_config['host'] = args.host
    if args.port:
        db_config['port'] = args.port
    if args.database:
        db_config['database'] = args.database
    if args.user:
        db_config['user'] = args.user
    if args.password:
        db_config['password'] = args.password
    
    # Create importer and run import
    importer = CabinetDataImporter(db_config)
    
    try:
        importer.connect()
        importer.import_csv_data(args.csv_file)
        importer.print_stats()
    except Exception as e:
        print(f"Import failed: {e}")
        sys.exit(1)
    finally:
        importer.disconnect()
    
    print("\n✓ Import process completed successfully!")

if __name__ == "__main__":
    main()