#!/usr/bin/env python3
"""
Cabinet Quoting System - CSV Import Script
==================================================

This script imports cabinet data from the CSV file into the PostgreSQL database.
It handles data cleaning, normalization, and ensures referential integrity.

Usage:
    python import_cabinet_csv.py [--dry-run] [--csv-file path] [--db-url url]

Features:
- Parses CSV data and extracts dimensions from item codes
- Cleans price strings and converts to decimal
- Creates products, variants, and pricing records
- Handles duplicate detection and validation
- Provides detailed progress reporting
- Supports dry-run mode for testing

Author: Database Architect Agent
Created: 2025-07-27
"""

import csv
import re
import argparse
import logging
import sys
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Tuple, Optional, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cabinet_import.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class CabinetCSVImporter:
    """Handles importing cabinet data from CSV to PostgreSQL database."""
    
    def __init__(self, db_url: str, dry_run: bool = False):
        """
        Initialize the importer.
        
        Args:
            db_url: PostgreSQL connection URL
            dry_run: If True, performs validation without writing to database
        """
        self.db_url = db_url
        self.dry_run = dry_run
        self.conn = None
        self.stats = {
            'total_rows': 0,
            'products_created': 0,
            'variants_created': 0,
            'pricing_records_created': 0,
            'errors': 0,
            'duplicates_skipped': 0
        }
        
        # Cache for database lookups
        self.color_options_cache = {}
        self.box_materials_cache = {}
        self.cabinet_types_cache = {}
        
    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            if self.dry_run:
                # In dry-run mode, don't commit any changes
                self.conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def load_reference_data(self):
        """Load reference data into cache for faster lookups."""
        logger.info("Loading reference data...")
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Load color options
            cur.execute("SELECT id, name FROM cabinet_system.color_options WHERE is_active = true")
            self.color_options_cache = {row['name']: row['id'] for row in cur.fetchall()}
            
            # Load box materials
            cur.execute("SELECT id, code, name FROM cabinet_system.box_materials WHERE is_active = true")
            self.box_materials_cache = {row['code']: row['id'] for row in cur.fetchall()}
            
            # Load cabinet types
            cur.execute("""
                SELECT ct.id, ct.code, ct.name, cc.code as category_code 
                FROM cabinet_system.cabinet_types ct
                JOIN cabinet_system.cabinet_categories cc ON ct.category_id = cc.id
                WHERE ct.is_active = true
            """)
            self.cabinet_types_cache = {row['code']: row['id'] for row in cur.fetchall()}
        
        logger.info(f"Loaded {len(self.color_options_cache)} color options")
        logger.info(f"Loaded {len(self.box_materials_cache)} box materials")
        logger.info(f"Loaded {len(self.cabinet_types_cache)} cabinet types")
    
    def parse_item_code(self, item_code: str) -> Dict[str, Any]:
        """
        Parse item code to extract cabinet information.
        
        Examples:
            B24FD-L/R -> width: 24, type: BFD, left_right: True
            W3630 -> width: 36, height: 30, type: W
            2DB18 -> width: 18, type: 2DB
        """
        result = {
            'width': None,
            'height': None,
            'depth': None,
            'type_code': None,
            'is_left_right': False,
            'door_count': 0,
            'drawer_count': 0
        }
        
        # Check for L/R variants
        if '-L/R' in item_code:
            result['is_left_right'] = True
            item_code = item_code.replace('-L/R', '')
        elif item_code.endswith('L') or item_code.endswith('R'):
            result['is_left_right'] = True
            item_code = item_code[:-1]
        
        # Common patterns for extracting dimensions and type
        patterns = [
            # Base cabinets: B24FD, B18, BC39R
            r'^([A-Z]+)(\d+)([A-Z]*)$',
            # Wall cabinets: W3030, W2424
            r'^([A-Z]+)(\d{2})(\d{2})$',
            # Drawer base: 2DB24, 3DB18
            r'^(\d+[A-Z]+)(\d+)$',
            # Special types: BLS36, SB30
            r'^([A-Z]+)(\d+)([A-Z]*)$'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, item_code)
            if match:
                groups = match.groups()
                
                if len(groups) >= 2:
                    result['type_code'] = groups[0]
                    
                    # Extract dimensions
                    if len(groups[1]) == 4:  # Width and height (e.g., 3030)
                        result['width'] = int(groups[1][:2])
                        result['height'] = int(groups[1][2:])
                    elif len(groups[1]) >= 2:  # Just width
                        result['width'] = int(groups[1])
                
                # Map type codes to standard types
                result['type_code'] = self.normalize_type_code(result['type_code'])
                break
        
        # Infer door and drawer counts from description and type
        result['door_count'], result['drawer_count'] = self.infer_door_drawer_count(
            result['type_code'], item_code
        )
        
        return result
    
    def normalize_type_code(self, type_code: str) -> str:
        """Normalize type codes to match our cabinet_types table."""
        # Map variations to standard types
        type_mapping = {
            'BFD': 'B',  # Base Full Door -> Base Cabinet
            'BC': 'BC',  # Blind Corner
            'BLS': 'BLS',  # Lazy Susan
            'W': 'W',    # Wall
            '2DB': '2DB', # 2 Drawer Base
            '3DB': '3DB', # 3 Drawer Base
            '4DB': '4DB', # 4 Drawer Base
            '5DB': '5DB', # 5 Drawer Base
            'PC': 'PC',  # Pantry Cabinet
            'V': 'V',    # Vanity
            'VB': 'VB',  # Vanity Base
            'VD': 'VD',  # Vanity with Drawers
            'VDB': 'VDB', # Vanity Drawer Base
            'VSB': 'VSB', # Vanity Sink Base
            'SB': 'SB',  # Sink Base
            'F': 'F',    # Filler
            'PNL': 'PNL', # Panel
            'D': 'D',    # Drawer
            'MOC': 'MOC', # Molding/Crown
            'TK': 'TK',  # Toe Kick
            'DWP': 'DWP', # Dishwasher Panel
            'RP': 'RP',  # Refrigerator Panel
            'ADA': 'ADA', # ADA Compliant
            'CF': 'CF',  # Crown Filler
        }
        
        return type_mapping.get(type_code, 'B')  # Default to Base if unknown
    
    def infer_door_drawer_count(self, type_code: str, item_code: str) -> Tuple[int, int]:
        """Infer door and drawer counts from type and item code."""
        doors = 0
        drawers = 0
        
        # Drawer base cabinets
        if type_code in ['2DB', '3DB', '4DB', '5DB']:
            drawers = int(type_code[0])
            doors = 0
        # Base cabinets with doors
        elif type_code in ['B', 'BFD']:
            # Check width to determine door count
            width_match = re.search(r'(\d+)', item_code)
            if width_match:
                width = int(width_match.group(1))
                doors = 1 if width < 24 else 2
        # Wall cabinets
        elif type_code == 'W':
            doors = 2  # Most wall cabinets have 2 doors
        # Specialty items
        else:
            doors = 1 if type_code not in ['F', 'PNL', 'TK', 'D'] else 0
        
        return doors, drawers
    
    def clean_price(self, price_str: str) -> Optional[Decimal]:
        """Clean price string and convert to Decimal."""
        if not price_str or price_str.strip() == '':
            return None
        
        try:
            # Remove currency symbols, spaces, and other non-numeric characters
            cleaned = re.sub(r'[^\d.,]', '', price_str.strip())
            if not cleaned:
                return None
            
            # Handle comma as decimal separator or thousands separator
            if ',' in cleaned and '.' in cleaned:
                # Both comma and dot - assume comma is thousands separator
                cleaned = cleaned.replace(',', '')
            elif ',' in cleaned and cleaned.count(',') == 1:
                # Single comma - could be decimal separator (European format)
                parts = cleaned.split(',')
                if len(parts[1]) <= 2:  # Likely decimal separator
                    cleaned = cleaned.replace(',', '.')
                else:  # Likely thousands separator
                    cleaned = cleaned.replace(',', '')
            
            return Decimal(cleaned)
        except (InvalidOperation, ValueError) as e:
            logger.warning(f"Could not parse price '{price_str}': {e}")
            return None
    
    def get_or_create_product(self, cur, item_code: str, description: str, 
                             parsed_info: Dict[str, Any]) -> Optional[int]:
        """Get existing product or create new one."""
        # Check if product already exists
        cur.execute(
            "SELECT id FROM cabinet_system.products WHERE item_code = %s",
            (item_code,)
        )
        result = cur.fetchone()
        if result:
            return result[0]
        
        # Get cabinet type ID
        type_id = self.cabinet_types_cache.get(parsed_info['type_code'])
        if not type_id:
            logger.warning(f"Unknown cabinet type '{parsed_info['type_code']}' for item {item_code}")
            type_id = self.cabinet_types_cache.get('B')  # Default to base cabinet
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would create product: {item_code}")
            return 999999  # Dummy ID for dry run
        
        try:
            cur.execute("""
                INSERT INTO cabinet_system.products 
                (item_code, name, cabinet_type_id, description, width_inches, height_inches, 
                 depth_inches, door_count, drawer_count, is_left_right)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                item_code,
                description,
                type_id,
                description,
                parsed_info['width'],
                parsed_info['height'],
                parsed_info['depth'],
                parsed_info['door_count'],
                parsed_info['drawer_count'],
                parsed_info['is_left_right']
            ))
            
            product_id = cur.fetchone()[0]
            self.stats['products_created'] += 1
            logger.info(f"Created product: {item_code} (ID: {product_id})")
            return product_id
            
        except Exception as e:
            logger.error(f"Error creating product {item_code}: {e}")
            self.stats['errors'] += 1
            return None
    
    def get_or_create_variant(self, cur, product_id: int, color_option_id: int, 
                             item_code: str, color_name: str) -> Optional[str]:
        """Get existing variant or create new one."""
        # Generate SKU
        sku = f"{item_code}-{color_name.replace(' ', '_').upper()}"
        
        # Check if variant already exists
        cur.execute(
            "SELECT id FROM cabinet_system.product_variants WHERE product_id = %s AND color_option_id = %s",
            (product_id, color_option_id)
        )
        result = cur.fetchone()
        if result:
            return result[0]
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Would create variant: {sku}")
            return "00000000-0000-0000-0000-000000000000"  # Dummy UUID for dry run
        
        try:
            cur.execute("""
                INSERT INTO cabinet_system.product_variants 
                (product_id, color_option_id, sku)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (product_id, color_option_id, sku))
            
            variant_id = cur.fetchone()[0]
            self.stats['variants_created'] += 1
            logger.info(f"Created variant: {sku} (ID: {variant_id})")
            return variant_id
            
        except Exception as e:
            logger.error(f"Error creating variant {sku}: {e}")
            self.stats['errors'] += 1
            return None
    
    def create_pricing_records(self, cur, variant_id: str, prices: Dict[str, Decimal]):
        """Create pricing records for all materials."""
        # Material mapping from CSV columns to database codes
        material_mapping = {
            'Price with ParticleBoard Box': 'particleboard',
            'Price with Plywood Box': 'plywood',
            'UV Birch Plywood': 'uv_birch',
            'White Plywood': 'white_plywood'
        }
        
        for csv_col, db_code in material_mapping.items():
            if csv_col in prices and prices[csv_col] is not None:
                material_id = self.box_materials_cache.get(db_code)
                if not material_id:
                    logger.warning(f"Unknown material code: {db_code}")
                    continue
                
                if self.dry_run:
                    logger.info(f"[DRY RUN] Would create pricing: {variant_id} - {db_code} - ${prices[csv_col]}")
                    continue
                
                try:
                    cur.execute("""
                        INSERT INTO cabinet_system.product_pricing 
                        (product_variant_id, box_material_id, price)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (product_variant_id, box_material_id, effective_date) 
                        DO UPDATE SET price = EXCLUDED.price
                    """, (variant_id, material_id, prices[csv_col]))
                    
                    self.stats['pricing_records_created'] += 1
                    
                except Exception as e:
                    logger.error(f"Error creating pricing record: {e}")
                    self.stats['errors'] += 1
    
    def import_csv_file(self, csv_file_path: str):
        """Import data from CSV file."""
        logger.info(f"Starting import from: {csv_file_path}")
        
        try:
            with open(csv_file_path, 'r', encoding='utf-8-sig') as file:
                # Detect dialect
                sample = file.read(1024)
                file.seek(0)
                sniffer = csv.Sniffer()
                dialect = sniffer.sniff(sample)
                
                reader = csv.DictReader(file, dialect=dialect)
                
                # Start transaction
                if not self.dry_run:
                    self.conn.autocommit = False
                
                with self.conn.cursor() as cur:
                    for row_num, row in enumerate(reader, 1):
                        self.stats['total_rows'] += 1
                        
                        try:
                            self.process_row(cur, row, row_num)
                            
                            # Commit every 100 rows
                            if not self.dry_run and row_num % 100 == 0:
                                self.conn.commit()
                                logger.info(f"Processed {row_num} rows...")
                        
                        except Exception as e:
                            logger.error(f"Error processing row {row_num}: {e}")
                            self.stats['errors'] += 1
                            if not self.dry_run:
                                self.conn.rollback()
                    
                    # Final commit
                    if not self.dry_run:
                        self.conn.commit()
                        logger.info("All changes committed successfully")
        
        except Exception as e:
            logger.error(f"Error during import: {e}")
            if self.conn and not self.dry_run:
                self.conn.rollback()
            raise
    
    def process_row(self, cur, row: Dict[str, str], row_num: int):
        """Process a single CSV row."""
        # Extract data from row
        color_option = row.get('Color Option', '').strip()
        item_code = row.get('Item Code', '').strip()
        description = row.get('Description', '').strip()
        
        # Skip empty rows
        if not item_code or not color_option:
            logger.warning(f"Row {row_num}: Missing item code or color option")
            return
        
        # Get color option ID
        color_option_id = self.color_options_cache.get(color_option)
        if not color_option_id:
            logger.warning(f"Row {row_num}: Unknown color option '{color_option}'")
            return
        
        # Parse item code
        parsed_info = self.parse_item_code(item_code)
        
        # Get or create product
        product_id = self.get_or_create_product(cur, item_code, description, parsed_info)
        if not product_id:
            return
        
        # Get or create variant
        variant_id = self.get_or_create_variant(cur, product_id, color_option_id, 
                                               item_code, color_option)
        if not variant_id:
            return
        
        # Parse prices
        prices = {}
        for col in ['Price with ParticleBoard Box', 'Price with Plywood Box', 
                   'UV Birch Plywood', 'White Plywood']:
            if col in row:
                price = self.clean_price(row[col])
                if price:
                    prices[col] = price
        
        # Create pricing records
        if prices:
            self.create_pricing_records(cur, variant_id, prices)
    
    def print_summary(self):
        """Print import summary statistics."""
        logger.info("\n" + "="*50)
        logger.info("IMPORT SUMMARY")
        logger.info("="*50)
        logger.info(f"Total rows processed: {self.stats['total_rows']}")
        logger.info(f"Products created: {self.stats['products_created']}")
        logger.info(f"Variants created: {self.stats['variants_created']}")
        logger.info(f"Pricing records created: {self.stats['pricing_records_created']}")
        logger.info(f"Duplicates skipped: {self.stats['duplicates_skipped']}")
        logger.info(f"Errors encountered: {self.stats['errors']}")
        logger.info("="*50)
        
        if self.dry_run:
            logger.info("This was a DRY RUN - no data was actually imported")
        else:
            logger.info("Import completed successfully!")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Import cabinet data from CSV to PostgreSQL')
    parser.add_argument('--csv-file', required=True, help='Path to CSV file')
    parser.add_argument('--db-url', help='PostgreSQL connection URL', 
                       default='postgresql://postgres:password@localhost:5432/cabinet_quoting')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Perform validation without writing to database')
    
    args = parser.parse_args()
    
    # Validate CSV file exists
    if not os.path.exists(args.csv_file):
        logger.error(f"CSV file not found: {args.csv_file}")
        sys.exit(1)
    
    # Create importer
    importer = CabinetCSVImporter(args.db_url, args.dry_run)
    
    try:
        # Connect to database
        importer.connect()
        
        # Load reference data
        importer.load_reference_data()
        
        # Import CSV
        importer.import_csv_file(args.csv_file)
        
        # Print summary
        importer.print_summary()
        
    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)
    
    finally:
        importer.disconnect()


if __name__ == '__main__':
    main()