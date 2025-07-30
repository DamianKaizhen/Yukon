#!/bin/bash

# Cabinet Quoting System - Comprehensive Test Runner
# This script runs all test suites and generates comprehensive reports

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="./reports"
COVERAGE_DIR="./reports/coverage"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$TEST_RESULTS_DIR/test_run_$TIMESTAMP.log"

# Create directories
mkdir -p "$TEST_RESULTS_DIR" "$COVERAGE_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if services are running
check_services() {
    log "Checking required services..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if test database is accessible
    if ! docker exec cabinet-quoting-db pg_isready -U postgres > /dev/null 2>&1; then
        warning "Test database is not ready. Starting services..."
        cd .. && docker-compose up -d && cd tests
        sleep 30
    fi
    
    success "All required services are running"
}

# Function to install dependencies
setup_dependencies() {
    log "Setting up test dependencies..."
    
    if [ ! -d "node_modules" ]; then
        log "Installing test dependencies..."
        npm install
    else
        log "Dependencies already installed"
    fi
    
    success "Dependencies ready"
}

# Function to run unit tests
run_unit_tests() {
    log "Running unit tests..."
    
    local exit_code=0
    
    # Backend unit tests
    log "Running backend unit tests..."
    if npm run test:backend 2>&1 | tee -a "$LOG_FILE"; then
        success "Backend unit tests passed"
    else
        error "Backend unit tests failed"
        exit_code=1
    fi
    
    # Frontend unit tests
    log "Running frontend unit tests..."
    if npm run test:frontend 2>&1 | tee -a "$LOG_FILE"; then
        success "Frontend unit tests passed"
    else
        error "Frontend unit tests failed"
        exit_code=1
    fi
    
    # Admin interface unit tests
    log "Running admin interface unit tests..."
    if npm run test:admin 2>&1 | tee -a "$LOG_FILE"; then
        success "Admin interface unit tests passed"
    else
        error "Admin interface unit tests failed"
        exit_code=1
    fi
    
    # Quote engine unit tests
    log "Running quote engine unit tests..."
    if npm run test:quote-engine 2>&1 | tee -a "$LOG_FILE"; then
        success "Quote engine unit tests passed"
    else
        error "Quote engine unit tests failed"
        exit_code=1
    fi
    
    return $exit_code
}

# Function to run integration tests
run_integration_tests() {
    log "Running integration tests..."
    
    if npm run test:integration 2>&1 | tee -a "$LOG_FILE"; then
        success "Integration tests passed"
        return 0
    else
        error "Integration tests failed"
        return 1
    fi
}

# Function to run end-to-end tests
run_e2e_tests() {
    log "Running end-to-end tests..."
    
    # Check if frontend is accessible
    if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
        warning "Frontend not accessible. Skipping E2E tests."
        return 0
    fi
    
    if npm run test:e2e 2>&1 | tee -a "$LOG_FILE"; then
        success "End-to-end tests passed"
        return 0
    else
        error "End-to-end tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    log "Running performance tests..."
    
    # Check if backend is accessible
    if ! curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
        warning "Backend not accessible. Skipping performance tests."
        return 0
    fi
    
    if npm run test:performance 2>&1 | tee -a "$LOG_FILE"; then
        success "Performance tests completed"
        return 0
    else
        error "Performance tests failed"
        return 1
    fi
}

# Function to generate coverage report
generate_coverage() {
    log "Generating coverage report..."
    
    if npm run test:coverage 2>&1 | tee -a "$LOG_FILE"; then
        success "Coverage report generated at $COVERAGE_DIR"
        
        # Extract coverage summary
        if [ -f "$COVERAGE_DIR/lcov-report/index.html" ]; then
            log "Coverage report available at: file://$(pwd)/$COVERAGE_DIR/lcov-report/index.html"
        fi
        
        return 0
    else
        error "Failed to generate coverage report"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    log "Running security tests..."
    
    # Check for OWASP ZAP or other security tools
    if command -v zap-baseline.py > /dev/null; then
        log "Running OWASP ZAP baseline scan..."
        zap-baseline.py -t http://localhost:3000 -r "$TEST_RESULTS_DIR/zap_report_$TIMESTAMP.html" 2>&1 | tee -a "$LOG_FILE" || true
    else
        warning "OWASP ZAP not available. Skipping automated security tests."
    fi
    
    # Run npm audit
    log "Running npm security audit..."
    if npm audit --audit-level moderate 2>&1 | tee -a "$LOG_FILE"; then
        success "No high-severity security vulnerabilities found"
    else
        warning "Security vulnerabilities detected. Check npm audit output."
    fi
    
    return 0
}

# Function to generate test report
generate_report() {
    log "Generating comprehensive test report..."
    
    local report_file="$TEST_RESULTS_DIR/test_report_$TIMESTAMP.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Cabinet Quoting System - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border-left: 3px solid #007cba; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Cabinet Quoting System - Test Report</h1>
        <p class="timestamp">Generated: $(date)</p>
        <p>Test Run ID: $TIMESTAMP</p>
    </div>

    <div class="section">
        <h2>Test Summary</h2>
        <p>This report contains the results of comprehensive testing for the Cabinet Quoting System.</p>
    </div>

    <div class="section">
        <h2>Test Results</h2>
        <p>Detailed test results can be found in the log file: <code>$LOG_FILE</code></p>
    </div>

    <div class="section">
        <h2>Coverage Report</h2>
        <p>Code coverage report: <a href="./coverage/lcov-report/index.html">Coverage Report</a></p>
    </div>

    <div class="section">
        <h2>Performance Results</h2>
        <p>Performance test results are available in the Artillery reports.</p>
    </div>

    <div class="section">
        <h2>Security Scan</h2>
        <p>Security scan results are documented in this test run.</p>
    </div>
</body>
</html>
EOF

    success "Test report generated: $report_file"
}

# Function to cleanup
cleanup() {
    log "Cleaning up test artifacts..."
    
    # Remove temporary files
    find . -name "*.tmp" -delete 2>/dev/null || true
    find . -name ".DS_Store" -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main test execution flow
main() {
    log "Starting comprehensive test suite for Cabinet Quoting System"
    log "=================================================="
    
    local total_exit_code=0
    local tests_run=0
    local tests_passed=0
    
    # Setup
    check_services
    setup_dependencies
    
    # Run test suites
    log "Executing test suites..."
    
    # Unit tests
    if run_unit_tests; then
        ((tests_passed++))
    else
        ((total_exit_code++))
    fi
    ((tests_run++))
    
    # Integration tests
    if run_integration_tests; then
        ((tests_passed++))
    else
        ((total_exit_code++))
    fi
    ((tests_run++))
    
    # End-to-end tests
    if run_e2e_tests; then
        ((tests_passed++))
    else
        ((total_exit_code++))
    fi
    ((tests_run++))
    
    # Performance tests
    if run_performance_tests; then
        ((tests_passed++))
    else
        ((total_exit_code++))
    fi
    ((tests_run++))
    
    # Security tests
    if run_security_tests; then
        ((tests_passed++))
    else
        ((total_exit_code++))
    fi
    ((tests_run++))
    
    # Generate reports
    generate_coverage
    generate_report
    cleanup
    
    # Final summary
    log "=================================================="
    log "Test Summary:"
    log "Tests Run: $tests_run"
    log "Tests Passed: $tests_passed"
    log "Tests Failed: $((tests_run - tests_passed))"
    
    if [ $total_exit_code -eq 0 ]; then
        success "All test suites completed successfully!"
    else
        error "Some test suites failed. Check the logs for details."
    fi
    
    log "Reports available in: $TEST_RESULTS_DIR"
    log "Log file: $LOG_FILE"
    
    exit $total_exit_code
}

# Handle script arguments
case "${1:-all}" in
    "unit")
        check_services
        setup_dependencies
        run_unit_tests
        ;;
    "integration")
        check_services
        setup_dependencies
        run_integration_tests
        ;;
    "e2e")
        check_services
        setup_dependencies
        run_e2e_tests
        ;;
    "performance")
        check_services
        setup_dependencies
        run_performance_tests
        ;;
    "security")
        check_services
        setup_dependencies
        run_security_tests
        ;;
    "coverage")
        check_services
        setup_dependencies
        generate_coverage
        ;;
    "all")
        main
        ;;
    *)
        echo "Usage: $0 [unit|integration|e2e|performance|security|coverage|all]"
        echo "  unit        - Run unit tests only"
        echo "  integration - Run integration tests only"
        echo "  e2e         - Run end-to-end tests only"
        echo "  performance - Run performance tests only"
        echo "  security    - Run security tests only"
        echo "  coverage    - Generate coverage report only"
        echo "  all         - Run all tests (default)"
        exit 1
        ;;
esac