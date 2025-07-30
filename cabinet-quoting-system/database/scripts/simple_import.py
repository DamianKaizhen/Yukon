#!/usr/bin/env python3
"""
Simple CSV import script for cabinet data
"""
import csv
import psycopg2
import sys
import re
from decimal import Decimal

def clean_price(price_str):
    """Clean price string and convert to Decimal."""
    if not price_str or price_str.strip() == '':
        return None
    
    # Remove currency symbol, spaces, and other non-numeric characters
    cleaned = re.sub(r'[^\d.,]', '', price_str.strip())
    if not cleaned:
        return None
    
    try:
        # Remove commas (thousands separator) and convert to decimal
        cleaned = cleaned.replace(',', '')
        return Decimal(cleaned)
    except:
        return None

def main():
    db_url = "postgresql://cabinet_user:cabinet_dev_password@localhost:5432/cabinet_quoting_dev"
    csv_file = "/tmp/PricesLists cabinets.csv"
    
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        
        with open(csv_file, 'r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            
            with conn.cursor() as cur:
                # Get color option IDs
                cur.execute("SELECT name, id FROM cabinet_system.color_options WHERE is_active = true")
                color_options = {row[0]: row[1] for row in cur.fetchall()}
                
                # Get cabinet type IDs (use B for base cabinet as default)
                cur.execute("SELECT code, id FROM cabinet_system.cabinet_types WHERE is_active = true")
                cabinet_types = {row[0]: row[1] for row in cur.fetchall()}
                base_type_id = cabinet_types.get('B', list(cabinet_types.values())[0])
                
                # Get box material IDs
                cur.execute("SELECT code, id FROM cabinet_system.box_materials WHERE is_active = true")
                box_materials = {row[0]: row[1] for row in cur.fetchall()}
                
                count = 0
                for row in reader:
                    count += 1
                    if count % 100 == 0:
                        print(f"Processed {count} rows...")
                        conn.commit()
                    
                    color_option = row.get('Color Option', '').strip()
                    item_code = row.get('Item Code', '').strip()
                    description = row.get('Description', '').strip()
                    
                    if not item_code or not color_option:
                        continue
                    
                    color_id = color_options.get(color_option)
                    if not color_id:
                        print(f"Unknown color: {color_option}")
                        continue
                    
                    # Extract width from item code (better approach)
                    width = 24  # Default width
                    
                    # Handle common patterns: B24FD, W3630, 2DB18, etc.
                    if re.match(r'^[A-Z]+\d{2}[A-Z]*', item_code):  # B24FD, SB30
                        width_match = re.search(r'[A-Z]+(\d{2})', item_code)
                        if width_match:
                            width = int(width_match.group(1))
                    elif re.match(r'^W\d{4}', item_code):  # W3630 (36" wide, 30" high)
                        width_match = re.search(r'W(\d{2})\d{2}', item_code)
                        if width_match:
                            width = int(width_match.group(1))
                    elif re.match(r'^\d+[A-Z]+\d+', item_code):  # 2DB18
                        width_match = re.search(r'\d+[A-Z]+(\d+)', item_code)
                        if width_match:
                            width = int(width_match.group(1))
                    
                    # Ensure width is reasonable (6" to 96")
                    if width < 6 or width > 96:
                        width = 24
                    
                    # Check if product exists
                    cur.execute("SELECT id FROM cabinet_system.products WHERE item_code = %s", (item_code,))
                    product_result = cur.fetchone()
                    
                    if not product_result:
                        # Create product
                        try:
                            cur.execute("""
                                INSERT INTO cabinet_system.products 
                                (item_code, name, cabinet_type_id, description, width_inches, height_inches, depth_inches)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                                RETURNING id
                            """, (item_code, description, base_type_id, description, width, 34.5, 24.0))
                            product_id = cur.fetchone()[0]
                        except Exception as e:
                            print(f"Error creating product {item_code} with width {width}: {e}")
                            continue
                    else:
                        product_id = product_result[0]
                    
                    # Check if variant exists
                    cur.execute("""
                        SELECT id FROM cabinet_system.product_variants 
                        WHERE product_id = %s AND color_option_id = %s
                    """, (product_id, color_id))
                    variant_result = cur.fetchone()
                    
                    if not variant_result:
                        # Create variant
                        sku = f"{item_code}-{color_option.replace(' ', '_').upper()}"
                        cur.execute("""
                            INSERT INTO cabinet_system.product_variants 
                            (product_id, color_option_id, sku)
                            VALUES (%s, %s, %s)
                            RETURNING id
                        """, (product_id, color_id, sku))
                        variant_id = cur.fetchone()[0]
                    else:
                        variant_id = variant_result[0]
                    
                    # Add pricing for plywood (most common)
                    plywood_price = clean_price(row.get('Price with Plywood Box', ''))
                    if plywood_price and 'plywood' in box_materials:
                        try:
                            cur.execute("""
                                INSERT INTO cabinet_system.product_pricing 
                                (product_variant_id, box_material_id, price)
                                VALUES (%s, %s, %s)
                                ON CONFLICT (product_variant_id, box_material_id, effective_date) 
                                DO UPDATE SET price = EXCLUDED.price
                            """, (variant_id, box_materials['plywood'], plywood_price))
                        except Exception as e:
                            print(f"Error inserting price {plywood_price} for item {item_code}: {e}")
                            continue
                
                conn.commit()
                print(f"Import completed! Processed {count} rows total.")
                
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main()