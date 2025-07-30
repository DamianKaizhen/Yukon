#!/usr/bin/env python3
"""
Test Script for Cabinet Type Consolidation Function
Tests the analyze_and_consolidate_cabinet_type function with sample item codes
to validate the logic before running the full migration.

Usage:
    python test_consolidation_function.py
"""

import psycopg2
import os
from typing import List, Dict, Any

class ConsolidationTester:
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
            print("Make sure the database is running and accessible")
            raise
    
    def test_sample_items(self) -> List[Dict[str, Any]]:
        """Test the consolidation function with sample item codes from the CSV."""
        
        # Sample item codes representing different patterns
        test_items = [
            # Base Cabinet Full Door patterns
            "B9FD-L/R", "B12FD-L/R", "B24FD", "B30FD", "B42FD",
            
            # Base Cabinet with Drawer patterns  
            "B9-L/R", "B12-L/R", "B24", "B30", "B42",
            
            # 12" Deep Base Cabinets
            "B1212", "B1512", "B2412", "B3612",
            
            # Multi-Drawer Base Cabinets
            "2DB9", "2DB24", "3DB15", "4DB36",
            
            # Specialty Base Cabinets
            "BC39R", "BC42L", "BLS36", "SB24", "SB36",
            
            # Wall Cabinets
            "W1212-L/R", "W2412", "W3018", "W3624", "W4230",
            
            # Vanity Cabinets
            "VSB2421", "VB30", "V2DB1521", "V3DB2421", "VD630", "VDB2421",
            
            # ADA Cabinets
            "ADA-VSB2421", "ADA-SB3024",
            
            # Pantry and Linen Cabinets
            "PC2484", "PC1584-L/R", "LC1884", "LC2484-L/R",
            
            # Panels and Accessories
            "F3", "F6", "PNL1434", "WP1330", "BP2434", "RP2496",
            
            # Specialty Items
            "MOC3012", "DWP2434", "CF96", "TK96"
        ]
        
        results = []
        
        print("🧪 TESTING CABINET TYPE CONSOLIDATION FUNCTION")
        print("=" * 70)
        print(f"{'Item Code':<15} {'Base Type':<12} {'Display Name':<35} {'Width':<8} {'Doors':<6} {'Drawers'}")
        print("-" * 70)
        
        with self.conn.cursor() as cur:
            for item_code in test_items:
                try:
                    # Call the consolidation function
                    query = """
                    SELECT base_type, display_name, width_inches, height_inches, 
                           depth_inches, door_count, drawer_count, is_left_right
                    FROM cabinet_system.analyze_and_consolidate_cabinet_type(%s);
                    """
                    
                    cur.execute(query, (item_code,))
                    result = cur.fetchone()
                    
                    if result:
                        base_type, display_name, width, height, depth, doors, drawers, is_lr = result
                        
                        # Store result for analysis
                        results.append({
                            'item_code': item_code,
                            'base_type': base_type,
                            'display_name': display_name,
                            'width_inches': width,
                            'height_inches': height,
                            'depth_inches': depth,
                            'door_count': doors,
                            'drawer_count': drawers,
                            'is_left_right': is_lr
                        })
                        
                        # Display result
                        width_str = f"{width:.0f}\"" if width else "N/A"
                        print(f"{item_code:<15} {base_type:<12} {display_name:<35} {width_str:<8} {doors:<6} {drawers}")
                    else:
                        print(f"{item_code:<15} {'ERROR':<12} {'No result returned':<35}")
                        
                except Exception as e:
                    print(f"{item_code:<15} {'ERROR':<12} {str(e):<35}")
        
        return results
    
    def analyze_test_results(self, results: List[Dict[str, Any]]):
        """Analyze the test results and provide insights."""
        
        print("\n📊 TEST RESULTS ANALYSIS")
        print("=" * 50)
        
        # Count by base type
        base_type_counts = {}
        width_extractions = 0
        height_assignments = 0
        depth_assignments = 0
        left_right_variants = 0
        door_assignments = 0
        drawer_assignments = 0
        
        for result in results:
            base_type = result['base_type']
            base_type_counts[base_type] = base_type_counts.get(base_type, 0) + 1
            
            if result['width_inches']:
                width_extractions += 1
            if result['height_inches']:
                height_assignments += 1
            if result['depth_inches']:
                depth_assignments += 1
            if result['is_left_right']:
                left_right_variants += 1
            if result['door_count'] and result['door_count'] > 0:
                door_assignments += 1
            if result['drawer_count'] and result['drawer_count'] > 0:
                drawer_assignments += 1
        
        total_tests = len(results)
        
        print(f"Total test items: {total_tests}")
        print(f"Width extraction success: {width_extractions}/{total_tests} ({width_extractions/total_tests*100:.1f}%)")
        print(f"Height assignment success: {height_assignments}/{total_tests} ({height_assignments/total_tests*100:.1f}%)")
        print(f"Depth assignment success: {depth_assignments}/{total_tests} ({depth_assignments/total_tests*100:.1f}%)")
        print(f"Left/Right variants detected: {left_right_variants}")
        print(f"Door count assigned: {door_assignments}")
        print(f"Drawer count assigned: {drawer_assignments}")
        
        print(f"\nBase type distribution:")
        for base_type, count in sorted(base_type_counts.items()):
            print(f"  {base_type}: {count} items")
    
    def validate_specific_patterns(self):
        """Validate specific patterns work correctly."""
        
        print("\n🔍 PATTERN VALIDATION TESTS")
        print("=" * 50)
        
        # Test specific validation cases
        validations = [
            # Test case format: (item_code, expected_base_type, expected_width, expected_doors, expected_drawers)
            ("B30FD", "BFD", 30.0, 2, 0),
            ("B24FD-L/R", "BFD-LR", 24.0, 1, 0),
            ("B36", "B", 36.0, 2, 1),
            ("B18-L/R", "B-LR", 18.0, 1, 1),
            ("2DB24", "2DB", 24.0, 0, 2),
            ("W3018", "W", 30.0, 2, 0),
            ("W1218-L/R", "W-LR", 12.0, 1, 0),
            ("SB30", "SB", 30.0, 2, 0),
            ("VSB3021", "VSB", 30.0, 2, 0),
            ("PC1884", "PC", 18.0, 2, 0),
            ("PC12-L/R", "PC-LR", 12.0, 1, 0)
        ]
        
        passed = 0
        failed = 0
        
        with self.conn.cursor() as cur:
            for item_code, exp_base, exp_width, exp_doors, exp_drawers in validations:
                try:
                    query = """
                    SELECT base_type, width_inches, door_count, drawer_count
                    FROM cabinet_system.analyze_and_consolidate_cabinet_type(%s);
                    """
                    
                    cur.execute(query, (item_code,))
                    result = cur.fetchone()
                    
                    if result:
                        base_type, width, doors, drawers = result
                        
                        # Check if results match expectations
                        base_match = base_type == exp_base
                        width_match = abs((width or 0) - exp_width) < 0.1 if width and exp_width else width == exp_width
                        door_match = doors == exp_doors
                        drawer_match = drawers == exp_drawers
                        
                        if base_match and width_match and door_match and drawer_match:
                            print(f"✅ {item_code}: PASS")
                            passed += 1
                        else:
                            print(f"❌ {item_code}: FAIL")
                            print(f"   Expected: base={exp_base}, width={exp_width}, doors={exp_doors}, drawers={exp_drawers}")
                            print(f"   Got:      base={base_type}, width={width}, doors={doors}, drawers={drawers}")
                            failed += 1
                    else:
                        print(f"❌ {item_code}: FAIL - No result")
                        failed += 1
                        
                except Exception as e:
                    print(f"❌ {item_code}: ERROR - {e}")
                    failed += 1
        
        print(f"\nValidation Results: {passed} passed, {failed} failed")
        return passed, failed
    
    def run_tests(self):
        """Run all tests."""
        print("🚀 STARTING CABINET TYPE CONSOLIDATION TESTS")
        print("=" * 60)
        
        try:
            # Test sample items
            results = self.test_sample_items()
            
            # Analyze results
            self.analyze_test_results(results)
            
            # Validate specific patterns
            passed, failed = self.validate_specific_patterns()
            
            print(f"\n{'='*60}")
            if failed == 0:
                print("✅ ALL TESTS PASSED! The consolidation function is working correctly.")
                print("   Ready to run the full migration.")
            else:
                print(f"⚠️  SOME TESTS FAILED ({failed} failures)")
                print("   Review the function logic before running the full migration.")
            
        except Exception as e:
            print(f"\n❌ Test execution failed: {e}")
            raise
        finally:
            if self.conn:
                self.conn.close()
                print("\n🔌 Database connection closed")

def main():
    """Main execution function."""
    tester = ConsolidationTester()
    tester.run_tests()

if __name__ == "__main__":
    main()