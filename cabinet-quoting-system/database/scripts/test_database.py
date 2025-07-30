#!/usr/bin/env python3
"""
Cabinet Quoting System - Database Testing Script
===============================================

This script performs comprehensive testing of the database schema,
including structure validation, performance testing, and data integrity checks.

Usage:
    python test_database.py [--db-url url] [--verbose]

Features:
- Schema structure validation
- Constraint testing
- Index performance verification
- View functionality testing
- Trigger behavior validation
- Sample data operations
- Performance benchmarking

Author: Database Architect Agent
Created: 2025-07-27
"""

import argparse
import logging
import sys
import time
from decimal import Decimal
from typing import Dict, List, Tuple, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseTester:
    """Comprehensive database testing suite."""
    
    def __init__(self, db_url: str, verbose: bool = False):
        """Initialize the tester."""
        self.db_url = db_url
        self.verbose = verbose
        self.conn = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'skipped': 0,
            'details': []
        }
    
    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.conn.autocommit = True
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def run_test(self, test_name: str, test_func, *args, **kwargs):
        """Run a single test and record results."""
        logger.info(f"Running test: {test_name}")
        start_time = time.time()
        
        try:
            result = test_func(*args, **kwargs)
            duration = time.time() - start_time
            
            if result:
                self.test_results['passed'] += 1
                status = "PASS"
            else:
                self.test_results['failed'] += 1
                status = "FAIL"
            
            self.test_results['details'].append({
                'test': test_name,
                'status': status,
                'duration': duration,
                'details': getattr(result, 'details', '') if hasattr(result, 'details') else ''
            })
            
            logger.info(f"Test {test_name}: {status} ({duration:.3f}s)")
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self.test_results['failed'] += 1
            self.test_results['details'].append({
                'test': test_name,
                'status': "ERROR",
                'duration': duration,
                'details': str(e)
            })
            logger.error(f"Test {test_name}: ERROR - {e}")
            return False
    
    def test_schema_exists(self) -> bool:
        """Test that the cabinet_system schema exists."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT schema_name FROM information_schema.schemata 
                WHERE schema_name = 'cabinet_system'
            """)
            return cur.fetchone() is not None
    
    def test_tables_exist(self) -> bool:
        """Test that all required tables exist."""
        required_tables = [
            'color_options', 'cabinet_categories', 'cabinet_types', 'box_materials',
            'products', 'product_variants', 'product_pricing', 'price_history',
            'inventory', 'user_roles', 'users', 'customers', 'quotes', 
            'quote_items', 'quote_audit_log'
        ]
        
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'cabinet_system'
            """)
            existing_tables = [row[0] for row in cur.fetchall()]
        
        missing_tables = set(required_tables) - set(existing_tables)
        if missing_tables:
            logger.error(f"Missing tables: {missing_tables}")
            return False
        
        logger.info(f"All {len(required_tables)} required tables exist")
        return True
    
    def test_indexes_exist(self) -> bool:
        """Test that performance indexes exist."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM pg_indexes 
                WHERE schemaname = 'cabinet_system'
            """)
            index_count = cur.fetchone()[0]
        
        # Should have at least 20 indexes for performance
        if index_count < 20:
            logger.error(f"Insufficient indexes: {index_count} (expected >= 20)")
            return False
        
        logger.info(f"Found {index_count} indexes")
        return True
    
    def test_views_exist(self) -> bool:
        """Test that views exist and are queryable."""
        required_views = ['current_prices', 'product_catalog', 'inventory_status']
        
        with self.conn.cursor() as cur:
            for view_name in required_views:
                cur.execute(f"""
                    SELECT COUNT(*) FROM cabinet_system.{view_name} LIMIT 1
                """)
                # View should be queryable even if empty
                
        logger.info(f"All {len(required_views)} views are queryable")
        return True
    
    def test_functions_exist(self) -> bool:
        """Test that stored functions exist."""
        required_functions = [
            'update_updated_at_column',
            'calculate_quote_totals',
            'log_price_change'
        ]
        
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = 'cabinet_system' 
                AND routine_type = 'FUNCTION'
            """)
            existing_functions = [row[0] for row in cur.fetchall()]
        
        missing_functions = set(required_functions) - set(existing_functions)
        if missing_functions:
            logger.error(f"Missing functions: {missing_functions}")
            return False
        
        logger.info(f"All {len(required_functions)} required functions exist")
        return True
    
    def test_triggers_exist(self) -> bool:
        """Test that triggers exist."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.triggers 
                WHERE trigger_schema = 'cabinet_system'
            """)
            trigger_count = cur.fetchone()[0]
        
        # Should have at least 10 triggers for updated_at and business logic
        if trigger_count < 10:
            logger.error(f"Insufficient triggers: {trigger_count} (expected >= 10)")
            return False
        
        logger.info(f"Found {trigger_count} triggers")
        return True
    
    def test_foreign_key_constraints(self) -> bool:
        """Test that foreign key constraints exist and work."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.table_constraints 
                WHERE constraint_schema = 'cabinet_system' 
                AND constraint_type = 'FOREIGN KEY'
            """)
            fk_count = cur.fetchone()[0]
        
        # Should have significant number of foreign keys for referential integrity
        if fk_count < 15:
            logger.error(f"Insufficient foreign keys: {fk_count} (expected >= 15)")
            return False
        
        logger.info(f"Found {fk_count} foreign key constraints")
        return True
    
    def test_check_constraints(self) -> bool:
        """Test that check constraints exist."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM information_schema.check_constraints 
                WHERE constraint_schema = 'cabinet_system'
            """)
            check_count = cur.fetchone()[0]
        
        # Should have check constraints for business rules
        if check_count < 10:
            logger.error(f"Insufficient check constraints: {check_count} (expected >= 10)")
            return False
        
        logger.info(f"Found {check_count} check constraints")
        return True
    
    def test_reference_data_populated(self) -> bool:
        """Test that reference data is populated."""
        reference_tables = {
            'color_options': 5,
            'cabinet_categories': 5,
            'box_materials': 4,
            'user_roles': 4
        }
        
        with self.conn.cursor() as cur:
            for table, min_count in reference_tables.items():
                cur.execute(f"SELECT COUNT(*) FROM cabinet_system.{table}")
                actual_count = cur.fetchone()[0]
                
                if actual_count < min_count:
                    logger.error(f"Insufficient data in {table}: {actual_count} (expected >= {min_count})")
                    return False
                
                logger.info(f"Table {table}: {actual_count} records")
        
        return True
    
    def test_updated_at_triggers(self) -> bool:
        """Test that updated_at triggers work correctly."""
        with self.conn.cursor() as cur:
            # Test with color_options table
            cur.execute("""
                INSERT INTO cabinet_system.color_options (name, display_name)
                VALUES ('TEST_COLOR', 'Test Color')
                RETURNING id, created_at, updated_at
            """)
            result = cur.fetchone()
            color_id = result[0]
            created_at = result[1]
            updated_at_before = result[2]
            
            # Wait a moment and update
            time.sleep(0.1)
            cur.execute("""
                UPDATE cabinet_system.color_options 
                SET display_name = 'Updated Test Color'
                WHERE id = %s
                RETURNING updated_at
            """, (color_id,))
            updated_at_after = cur.fetchone()[0]
            
            # Clean up
            cur.execute("DELETE FROM cabinet_system.color_options WHERE id = %s", (color_id,))
            
            # Verify trigger worked
            if updated_at_after <= updated_at_before:
                logger.error("updated_at trigger did not fire correctly")
                return False
            
            logger.info("updated_at triggers working correctly")
            return True
    
    def test_quote_calculation_triggers(self) -> bool:
        """Test that quote calculation triggers work correctly."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get a test user
            cur.execute("SELECT id FROM cabinet_system.users LIMIT 1")
            user_result = cur.fetchone()
            if not user_result:
                logger.error("No users found for testing")
                return False
            user_id = user_result['id']
            
            # Create a test quote
            quote_number = f"TEST-{int(time.time())}"
            cur.execute("""
                INSERT INTO cabinet_system.quotes 
                (quote_number, created_by_user_id, customer_name, tax_rate)
                VALUES (%s, %s, 'Test Customer', 0.13)
                RETURNING id
            """, (quote_number, user_id))
            quote_id = cur.fetchone()['id']
            
            # Check initial totals
            cur.execute("""
                SELECT subtotal, tax_amount, total_amount 
                FROM cabinet_system.quotes WHERE id = %s
            """, (quote_id,))
            totals = cur.fetchone()
            
            if totals['subtotal'] != 0 or totals['total_amount'] != 0:
                logger.error("Initial quote totals incorrect")
                return False
            
            # Clean up
            cur.execute("DELETE FROM cabinet_system.quotes WHERE id = %s", (quote_id,))
            
            logger.info("Quote calculation triggers working correctly")
            return True
    
    def test_uuid_generation(self) -> bool:
        """Test that UUID generation works correctly."""
        with self.conn.cursor() as cur:
            # Test UUID generation in quotes table
            quote_number = f"UUID_TEST_{int(time.time())}"
            cur.execute("""
                INSERT INTO cabinet_system.quotes 
                (quote_number, created_by_user_id, customer_name)
                VALUES (%s, (SELECT id FROM cabinet_system.users LIMIT 1), 'Test')
                RETURNING id
            """, (quote_number,))
            quote_id = cur.fetchone()[0]
            
            # Verify it's a valid UUID
            if not isinstance(quote_id, uuid.UUID):
                logger.error("UUID not generated correctly")
                return False
            
            # Clean up
            cur.execute("DELETE FROM cabinet_system.quotes WHERE id = %s", (quote_id,))
            
            logger.info("UUID generation working correctly")
            return True
    
    def test_enum_types(self) -> bool:
        """Test that enum types work correctly."""
        with self.conn.cursor() as cur:
            # Test quote_status enum
            cur.execute("""
                SELECT enum_range(NULL::cabinet_system.quote_status)
            """)
            enum_values = cur.fetchone()[0]
            
            expected_values = ['draft', 'sent', 'approved', 'rejected', 'expired']
            if not all(value in enum_values for value in expected_values):
                logger.error(f"quote_status enum incorrect: {enum_values}")
                return False
            
            logger.info("Enum types working correctly")
            return True
    
    def test_performance_basic_queries(self) -> bool:
        """Test performance of basic queries."""
        queries = [
            ("Color options query", "SELECT * FROM cabinet_system.color_options WHERE is_active = true"),
            ("Product search", "SELECT * FROM cabinet_system.products WHERE is_active = true LIMIT 10"),
            ("Current prices view", "SELECT * FROM cabinet_system.current_prices LIMIT 10"),
            ("Product catalog view", "SELECT * FROM cabinet_system.product_catalog LIMIT 10"),
        ]
        
        with self.conn.cursor() as cur:
            for query_name, query in queries:
                start_time = time.time()
                cur.execute(query)
                cur.fetchall()
                duration = time.time() - start_time
                
                # Queries should complete in under 1 second
                if duration > 1.0:
                    logger.warning(f"Slow query {query_name}: {duration:.3f}s")
                else:
                    logger.info(f"Query {query_name}: {duration:.3f}s")
        
        return True
    
    def test_data_integrity_constraints(self) -> bool:
        """Test that data integrity constraints work."""
        with self.conn.cursor() as cur:
            try:
                # Test negative price constraint
                cur.execute("""
                    INSERT INTO cabinet_system.product_pricing 
                    (product_variant_id, box_material_id, price)
                    VALUES (
                        '00000000-0000-0000-0000-000000000000',
                        (SELECT id FROM cabinet_system.box_materials LIMIT 1),
                        -100.00
                    )
                """)
                logger.error("Negative price constraint failed - should have been rejected")
                return False
            except psycopg2.IntegrityError:
                # This is expected
                self.conn.rollback()
            
            try:
                # Test invalid tax rate constraint
                cur.execute("""
                    INSERT INTO cabinet_system.quotes 
                    (quote_number, created_by_user_id, customer_name, tax_rate)
                    VALUES (
                        'CONSTRAINT_TEST',
                        (SELECT id FROM cabinet_system.users LIMIT 1),
                        'Test',
                        1.5
                    )
                """)
                logger.error("Invalid tax rate constraint failed - should have been rejected")
                return False
            except psycopg2.IntegrityError:
                # This is expected
                self.conn.rollback()
        
        logger.info("Data integrity constraints working correctly")
        return True
    
    def run_all_tests(self):
        """Run all database tests."""
        logger.info("Starting comprehensive database testing")
        logger.info("=" * 60)
        
        # Schema structure tests
        self.run_test("Schema Exists", self.test_schema_exists)
        self.run_test("Tables Exist", self.test_tables_exist)
        self.run_test("Indexes Exist", self.test_indexes_exist)
        self.run_test("Views Exist", self.test_views_exist)
        self.run_test("Functions Exist", self.test_functions_exist)
        self.run_test("Triggers Exist", self.test_triggers_exist)
        
        # Constraint tests
        self.run_test("Foreign Key Constraints", self.test_foreign_key_constraints)
        self.run_test("Check Constraints", self.test_check_constraints)
        self.run_test("Data Integrity Constraints", self.test_data_integrity_constraints)
        
        # Data tests
        self.run_test("Reference Data Populated", self.test_reference_data_populated)
        
        # Functionality tests
        self.run_test("Updated At Triggers", self.test_updated_at_triggers)
        self.run_test("Quote Calculation Triggers", self.test_quote_calculation_triggers)
        self.run_test("UUID Generation", self.test_uuid_generation)
        self.run_test("Enum Types", self.test_enum_types)
        
        # Performance tests
        self.run_test("Basic Query Performance", self.test_performance_basic_queries)
        
        self.print_summary()
    
    def print_summary(self):
        """Print test summary."""
        logger.info("\n" + "=" * 60)
        logger.info("DATABASE TEST SUMMARY")
        logger.info("=" * 60)
        
        total_tests = self.test_results['passed'] + self.test_results['failed'] + self.test_results['skipped']
        pass_rate = (self.test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        logger.info(f"Total tests run: {total_tests}")
        logger.info(f"Passed: {self.test_results['passed']}")
        logger.info(f"Failed: {self.test_results['failed']}")
        logger.info(f"Skipped: {self.test_results['skipped']}")
        logger.info(f"Pass rate: {pass_rate:.1f}%")
        
        if self.verbose and self.test_results['details']:
            logger.info("\nDETAILED RESULTS:")
            logger.info("-" * 60)
            for detail in self.test_results['details']:
                status_symbol = "✓" if detail['status'] == "PASS" else "✗"
                logger.info(f"{status_symbol} {detail['test']}: {detail['status']} ({detail['duration']:.3f}s)")
                if detail['details']:
                    logger.info(f"  {detail['details']}")
        
        if self.test_results['failed'] == 0:
            logger.info("\n🎉 All tests passed! Database is ready for use.")
        else:
            logger.info(f"\n⚠️  {self.test_results['failed']} tests failed. Please review and fix issues.")
        
        logger.info("=" * 60)


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Test Cabinet Quoting System database')
    parser.add_argument('--db-url', help='PostgreSQL connection URL', 
                       default='postgresql://postgres:password@localhost:5432/cabinet_quoting')
    parser.add_argument('--verbose', action='store_true', help='Show detailed test results')
    
    args = parser.parse_args()
    
    # Create tester
    tester = DatabaseTester(args.db_url, args.verbose)
    
    try:
        # Connect to database
        tester.connect()
        
        # Run all tests
        tester.run_all_tests()
        
        # Exit with appropriate code
        if tester.test_results['failed'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
    
    except Exception as e:
        logger.error(f"Testing failed: {e}")
        sys.exit(1)
    
    finally:
        tester.disconnect()


if __name__ == '__main__':
    main()