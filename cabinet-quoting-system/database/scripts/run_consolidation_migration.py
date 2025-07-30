#!/usr/bin/env python3
"""
Cabinet Type Consolidation Migration Runner
Executes the consolidation migration and provides progress feedback.

Usage:
    python run_consolidation_migration.py
"""

import psycopg2
import os
import sys
from pathlib import Path

def connect_db():
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
        
        conn = psycopg2.connect(**db_params)
        print("✅ Database connection established")
        return conn
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL is running")
        print("2. Database 'cabinet_quoting' exists")
        print("3. Environment variables are set correctly:")
        print("   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD")
        sys.exit(1)

def run_migration():
    """Execute the consolidation migration."""
    
    # Find the migration file
    script_dir = Path(__file__).parent
    migration_file = script_dir.parent / "migrations" / "003_consolidate_cabinet_types.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        sys.exit(1)
    
    print(f"📂 Found migration file: {migration_file}")
    
    # Connect to database
    conn = connect_db()
    
    try:
        with conn.cursor() as cur:
            # Read and execute the migration file
            print("📖 Reading migration file...")
            with open(migration_file, 'r') as f:
                migration_sql = f.read()
            
            print("🚀 Executing consolidation migration...")
            print("   This may take a few minutes for large datasets...")
            
            # Execute the migration
            cur.execute(migration_sql)
            conn.commit()
            
            print("✅ Migration completed successfully!")
            
            # Get a quick summary
            cur.execute("""
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(*) FILTER (WHERE base_cabinet_type IS NOT NULL) as consolidated_products,
                    COUNT(DISTINCT base_cabinet_type) as unique_base_types
                FROM cabinet_system.products;
            """)
            
            result = cur.fetchone()
            if result:
                total, consolidated, unique_types = result
                success_rate = (consolidated / total * 100) if total > 0 else 0
                
                print(f"\n📊 MIGRATION SUMMARY:")
                print(f"   Total products: {total}")
                print(f"   Consolidated products: {consolidated}")
                print(f"   Success rate: {success_rate:.1f}%")
                print(f"   Unique base types: {unique_types}")
    
    except psycopg2.Error as e:
        print(f"❌ Migration failed with database error: {e}")
        conn.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"❌ Migration failed with error: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()
        print("🔌 Database connection closed")

def check_prerequisites():
    """Check if prerequisites are met before running migration."""
    
    print("🔍 Checking prerequisites...")
    
    # Check if products table exists
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = 'cabinet_system' 
                AND table_name = 'products';
            """)
            
            if cur.fetchone()[0] == 0:
                print("❌ Products table not found in cabinet_system schema")
                print("   Please run the initial schema migration first (001_initial_schema.sql)")
                sys.exit(1)
            
            # Check if products have data
            cur.execute("SELECT COUNT(*) FROM cabinet_system.products;")
            product_count = cur.fetchone()[0]
            
            if product_count == 0:
                print("❌ No products found in the database")
                print("   Please import cabinet data first")
                sys.exit(1)
            
            print(f"✅ Found {product_count} products ready for consolidation")
            
            # Check if already consolidated
            cur.execute("SELECT COUNT(*) FROM cabinet_system.products WHERE base_cabinet_type IS NOT NULL;")
            consolidated_count = cur.fetchone()[0]
            
            if consolidated_count > 0:
                print(f"⚠️  Warning: {consolidated_count} products already have consolidation data")
                response = input("   Continue anyway? (y/N): ").strip().lower()
                if response != 'y':
                    print("Migration cancelled by user")
                    sys.exit(0)
    
    except Exception as e:
        print(f"❌ Prerequisite check failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

def main():
    """Main execution function."""
    print("🏗️  CABINET TYPE CONSOLIDATION MIGRATION")
    print("=" * 50)
    print("This migration will:")
    print("1. Add consolidation fields to the products table")
    print("2. Analyze and consolidate cabinet types by pattern")
    print("3. Extract dimensions from item codes")
    print("4. Create new views for consolidated data")
    print()
    
    # Check prerequisites
    check_prerequisites()
    
    # Confirm execution
    print("🤔 Ready to run the consolidation migration.")
    response = input("   Proceed? (y/N): ").strip().lower()
    
    if response != 'y':
        print("Migration cancelled by user")
        sys.exit(0)
    
    # Run the migration
    run_migration()
    
    print("\n🎉 Consolidation migration completed!")
    print("\nNext steps:")
    print("1. Run analyze_consolidation_results.py to review the results")
    print("2. Update your application to use the new consolidated fields")
    print("3. Consider creating size-based filtering in your UI")

if __name__ == "__main__":
    main()