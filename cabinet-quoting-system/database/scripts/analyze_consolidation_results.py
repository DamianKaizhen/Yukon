#!/usr/bin/env python3
"""
Cabinet Type Consolidation Analysis Script
Analyzes the results of the cabinet type consolidation migration
and provides detailed reports on the data transformation.

Usage:
    python analyze_consolidation_results.py
"""

import psycopg2
import pandas as pd
import os
from typing import Dict, List, Tuple
import json

class ConsolidationAnalyzer:
    def __init__(self):
        """Initialize database connection."""
        self.conn = None
        self.connect_db()
    
    def connect_db(self):
        """Connect to the PostgreSQL database."""
        try:
            # Database connection parameters
            db_params = {
                'host': os.getenv('DB_HOST', 'localhost'),
                'port': os.getenv('DB_PORT', '5432'),
                'database': os.getenv('DB_NAME', 'cabinet_quoting'),
                'user': os.getenv('DB_USER', 'cabinet_user'),
                'password': os.getenv('DB_PASSWORD', 'cabinet_pass')
            }
            
            self.conn = psycopg2.connect(**db_params)
            print("✅ Database connection established")
            
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            raise
    
    def analyze_consolidation_coverage(self) -> pd.DataFrame:
        """Analyze how many products were successfully consolidated."""
        query = """
        SELECT 
            CASE 
                WHEN base_cabinet_type IS NOT NULL THEN 'Consolidated'
                ELSE 'Not Consolidated'
            END as status,
            COUNT(*) as product_count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM cabinet_system.products
        GROUP BY CASE WHEN base_cabinet_type IS NOT NULL THEN 'Consolidated' ELSE 'Not Consolidated' END
        ORDER BY product_count DESC;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n📊 CONSOLIDATION COVERAGE ANALYSIS")
        print("=" * 50)
        print(df.to_string(index=False))
        return df
    
    def analyze_base_types(self) -> pd.DataFrame:
        """Analyze the distribution of base cabinet types."""
        query = """
        SELECT 
            base_cabinet_type,
            display_name,
            COUNT(*) as product_count,
            MIN(width_inches_extracted) as min_width,
            MAX(width_inches_extracted) as max_width,
            ARRAY_LENGTH(ARRAY_AGG(DISTINCT width_inches_extracted), 1) as width_variants,
            COUNT(*) FILTER (WHERE is_left_right = true) as left_right_count
        FROM cabinet_system.products 
        WHERE base_cabinet_type IS NOT NULL
        GROUP BY base_cabinet_type, display_name
        ORDER BY product_count DESC;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n🏗️  BASE CABINET TYPE ANALYSIS")
        print("=" * 70)
        print(df.to_string(index=False))
        return df
    
    def analyze_dimension_extraction(self) -> pd.DataFrame:
        """Analyze the success rate of dimension extraction."""
        query = """
        SELECT 
            CASE 
                WHEN width_inches_extracted IS NOT NULL THEN 'Width Extracted'
                ELSE 'Width Not Extracted'
            END as width_status,
            CASE 
                WHEN height_inches IS NOT NULL THEN 'Height Available'
                ELSE 'Height Missing'
            END as height_status,
            CASE 
                WHEN depth_inches IS NOT NULL THEN 'Depth Available'
                ELSE 'Depth Missing'
            END as depth_status,
            COUNT(*) as count
        FROM cabinet_system.products
        GROUP BY 
            CASE WHEN width_inches_extracted IS NOT NULL THEN 'Width Extracted' ELSE 'Width Not Extracted' END,
            CASE WHEN height_inches IS NOT NULL THEN 'Height Available' ELSE 'Height Missing' END,
            CASE WHEN depth_inches IS NOT NULL THEN 'Depth Available' ELSE 'Depth Missing' END
        ORDER BY count DESC;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n📏 DIMENSION EXTRACTION ANALYSIS")
        print("=" * 60)
        print(df.to_string(index=False))
        return df
    
    def analyze_door_drawer_counts(self) -> pd.DataFrame:
        """Analyze door and drawer count assignment."""
        query = """
        SELECT 
            base_cabinet_type,
            display_name,
            door_count,
            drawer_count,
            COUNT(*) as product_count
        FROM cabinet_system.products 
        WHERE base_cabinet_type IS NOT NULL
        GROUP BY base_cabinet_type, display_name, door_count, drawer_count
        ORDER BY base_cabinet_type, door_count, drawer_count;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n🚪 DOOR & DRAWER COUNT ANALYSIS")
        print("=" * 60)
        print(df.to_string(index=False))
        return df
    
    def analyze_unconsolidated_items(self) -> pd.DataFrame:
        """Analyze items that weren't consolidated to identify patterns."""
        query = """
        SELECT 
            item_code,
            name,
            CASE 
                WHEN item_code ~ '^[A-Z]+[0-9]+' THEN 'Has Pattern'
                ELSE 'No Clear Pattern'
            END as pattern_status
        FROM cabinet_system.products 
        WHERE base_cabinet_type IS NULL
        ORDER BY item_code;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n⚠️  UNCONSOLIDATED ITEMS ANALYSIS")
        print("=" * 50)
        if len(df) > 0:
            print(df.to_string(index=False))
            print(f"\nTotal unconsolidated items: {len(df)}")
        else:
            print("✅ All items were successfully consolidated!")
        return df
    
    def analyze_size_ranges(self) -> pd.DataFrame:
        """Analyze size ranges for each base cabinet type."""
        query = """
        SELECT 
            base_cabinet_type,
            display_name,
            COUNT(*) as total_products,
            MIN(width_inches_extracted) as min_width,
            MAX(width_inches_extracted) as max_width,
            ROUND(AVG(width_inches_extracted), 2) as avg_width,
            STRING_AGG(DISTINCT width_inches_extracted::text, ', ' ORDER BY width_inches_extracted) as available_widths
        FROM cabinet_system.products 
        WHERE base_cabinet_type IS NOT NULL 
        AND width_inches_extracted IS NOT NULL
        GROUP BY base_cabinet_type, display_name
        HAVING COUNT(*) > 1  -- Only show types with multiple sizes
        ORDER BY total_products DESC;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n📐 SIZE RANGE ANALYSIS (Multi-Size Types)")
        print("=" * 70)
        print(df.to_string(index=False))
        return df
    
    def validate_pricing_integrity(self) -> pd.DataFrame:
        """Validate that pricing data is still intact after consolidation."""
        query = """
        SELECT 
            p.base_cabinet_type,
            COUNT(DISTINCT p.id) as products,
            COUNT(DISTINCT pv.id) as variants,
            COUNT(DISTINCT pp.id) as price_records,
            MIN(pp.price) as min_price,
            MAX(pp.price) as max_price,
            ROUND(AVG(pp.price), 2) as avg_price
        FROM cabinet_system.products p
        LEFT JOIN cabinet_system.product_variants pv ON p.id = pv.product_id
        LEFT JOIN cabinet_system.product_pricing pp ON pv.id = pp.product_variant_id
            AND pp.effective_date <= CURRENT_DATE 
            AND (pp.expiration_date IS NULL OR pp.expiration_date >= CURRENT_DATE)
        WHERE p.base_cabinet_type IS NOT NULL
        GROUP BY p.base_cabinet_type
        ORDER BY products DESC;
        """
        
        df = pd.read_sql_query(query, self.conn)
        print("\n💰 PRICING INTEGRITY VALIDATION")
        print("=" * 60)
        print(df.to_string(index=False))
        return df
    
    def generate_consolidation_summary(self) -> Dict:
        """Generate a comprehensive summary of the consolidation results."""
        summary = {}
        
        # Get basic counts
        query = """
        SELECT 
            COUNT(*) as total_products,
            COUNT(*) FILTER (WHERE base_cabinet_type IS NOT NULL) as consolidated_products,
            COUNT(DISTINCT base_cabinet_type) as unique_base_types,
            COUNT(*) FILTER (WHERE width_inches_extracted IS NOT NULL) as width_extracted,
            COUNT(*) FILTER (WHERE height_inches IS NOT NULL) as height_available,
            COUNT(*) FILTER (WHERE depth_inches IS NOT NULL) as depth_available
        FROM cabinet_system.products;
        """
        
        with self.conn.cursor() as cur:
            cur.execute(query)
            row = cur.fetchone()
            
            summary = {
                'total_products': row[0],
                'consolidated_products': row[1],
                'unique_base_types': row[2],
                'width_extracted': row[3],
                'height_available': row[4],
                'depth_available': row[5],
                'consolidation_rate': round((row[1] / row[0]) * 100, 2) if row[0] > 0 else 0,
                'width_extraction_rate': round((row[3] / row[0]) * 100, 2) if row[0] > 0 else 0
            }
        
        print("\n📋 CONSOLIDATION SUMMARY")
        print("=" * 40)
        print(f"Total Products: {summary['total_products']}")
        print(f"Consolidated Products: {summary['consolidated_products']}")
        print(f"Consolidation Rate: {summary['consolidation_rate']}%")
        print(f"Unique Base Types: {summary['unique_base_types']}")
        print(f"Width Extraction Rate: {summary['width_extraction_rate']}%")
        print(f"Height Available: {summary['height_available']} products")
        print(f"Depth Available: {summary['depth_available']} products")
        
        return summary
    
    def export_results(self, filename: str = "consolidation_analysis.json"):
        """Export analysis results to JSON file."""
        results = {
            'summary': self.generate_consolidation_summary(),
            'timestamp': pd.Timestamp.now().isoformat()
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Results exported to {filename}")
    
    def run_full_analysis(self):
        """Run all analysis methods."""
        print("🔍 CABINET TYPE CONSOLIDATION ANALYSIS")
        print("=" * 60)
        print(f"Analysis started at: {pd.Timestamp.now()}")
        
        try:
            # Run all analyses
            self.analyze_consolidation_coverage()
            self.analyze_base_types()
            self.analyze_dimension_extraction()
            self.analyze_door_drawer_counts()
            self.analyze_unconsolidated_items()
            self.analyze_size_ranges()
            self.validate_pricing_integrity()
            self.generate_consolidation_summary()
            
            # Export results
            self.export_results()
            
            print("\n✅ Analysis completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Analysis failed: {e}")
            raise
        finally:
            if self.conn:
                self.conn.close()
                print("🔌 Database connection closed")

def main():
    """Main execution function."""
    analyzer = ConsolidationAnalyzer()
    analyzer.run_full_analysis()

if __name__ == "__main__":
    main()