#!/bin/bash

# ASR Purchase Order System Load Testing Script
# Comprehensive performance testing suite for production readiness

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="./results/$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="./reports"
TEST_ENV="${TEST_ENV:-development}"

# Create results directory
mkdir -p "$RESULTS_DIR"
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}Starting ASR PO System Load Testing Suite${NC}"
echo "Target: $BASE_URL"
echo "Environment: $TEST_ENV"
echo "Results Directory: $RESULTS_DIR"
echo ""

# Function to run a test and save results
run_test() {
    local test_name="$1"
    local config_file="$2"
    local description="$3"

    echo -e "${YELLOW}Running $test_name${NC}: $description"

    # Run artillery test
    npx artillery run "$config_file" \
        --target "$BASE_URL" \
        --output "$RESULTS_DIR/${test_name}_raw.json" \
        2>&1 | tee "$RESULTS_DIR/${test_name}_output.log"

    # Generate detailed report
    npx artillery report \
        "$RESULTS_DIR/${test_name}_raw.json" \
        --output "$RESULTS_DIR/${test_name}_report.html"

    echo -e "${GREEN}✓ $test_name completed${NC}"
    echo ""
}

# Function to check system prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check if Artillery is installed
    if ! command -v npx &> /dev/null || ! npx artillery --version &> /dev/null; then
        echo -e "${RED}❌ Artillery.js not found. Installing...${NC}"
        npm install -g artillery
    else
        echo -e "${GREEN}✓ Artillery.js found${NC}"
    fi

    # Check if target is accessible
    if curl -f -s "$BASE_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✓ Target system is accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Target system health check failed${NC}"
        echo "Continuing with tests anyway..."
    fi

    # Check available system resources
    echo -e "${BLUE}System Resources:${NC}"
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $2}') available"
    echo "CPU: $(nproc) cores"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
}

# Function to run smoke tests
run_smoke_tests() {
    echo -e "${BLUE}Running Smoke Tests (Basic Functionality)${NC}"

    cat > "$RESULTS_DIR/smoke-test.yml" << 'EOF'
config:
  target: 'placeholder'
  phases:
    - duration: 30
      arrivalRate: 1
      name: "Smoke test"

scenarios:
  - name: "Health Check"
    flow:
      - get:
          url: "/api/health"
          expect:
            - statusCode: 200

  - name: "Auth Flow"
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "test@asr.com"
            password: "test123"
          expect:
            - statusCode: [200, 401]
EOF

    run_test "smoke" "$RESULTS_DIR/smoke-test.yml" "Basic system functionality"
}

# Function to run baseline performance tests
run_baseline_tests() {
    echo -e "${BLUE}Running Baseline Performance Tests${NC}"

    cat > "$RESULTS_DIR/baseline-test.yml" << 'EOF'
config:
  target: 'placeholder'
  phases:
    - duration: 120  # 2 minutes
      arrivalRate: 5
      name: "Baseline performance"

scenarios:
  - name: "Dashboard Access"
    weight: 50
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "test.user@asr.com"
            password: "test123"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/dashboards/overview"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Report Generation"
    weight: 30
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "test.manager@asr.com"
            password: "test123"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/api/reports/po-summary?startDate=2024-01-01&endDate=2024-12-31"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "PO Creation"
    weight: 20
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "test.user@asr.com"
            password: "test123"
          capture:
            - json: "$.token"
              as: "authToken"
      - post:
          url: "/api/po"
          headers:
            Authorization: "Bearer {{ authToken }}"
            Content-Type: "application/json"
          json:
            vendor_id: "vendor-1"
            division_id: "div-1"
            line_items:
              - description: "Test item"
                quantity: "1"
                unit_price: "100.00"
                gl_account_number: "6000"
                gl_account_name: "Test Account"
                is_taxable: true
EOF

    run_test "baseline" "$RESULTS_DIR/baseline-test.yml" "Normal load baseline"
}

# Function to run stress tests
run_stress_tests() {
    echo -e "${BLUE}Running Stress Tests (High Load)${NC}"

    run_test "stress" "artillery-config.yml" "High load stress testing"
}

# Function to run specific endpoint tests
run_endpoint_tests() {
    echo -e "${BLUE}Running Endpoint-Specific Tests${NC}"

    # Dashboard endpoints
    cat > "$RESULTS_DIR/dashboard-test.yml" << 'EOF'
config:
  target: 'placeholder'
  phases:
    - duration: 180
      arrivalRate: 20
      name: "Dashboard stress"

scenarios:
  - name: "Dashboard Heavy Usage"
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "test.manager@asr.com"
            password: "test123"
          capture:
            - json: "$.token"
              as: "authToken"
      - loop:
          - get:
              url: "/api/dashboards/overview"
              headers:
                Authorization: "Bearer {{ authToken }}"
          - get:
              url: "/api/dashboards/division/div-1"
              headers:
                Authorization: "Bearer {{ authToken }}"
          - think: 2
        count: 5
EOF

    run_test "dashboard" "$RESULTS_DIR/dashboard-test.yml" "Dashboard endpoint stress test"

    # Reports endpoints
    cat > "$RESULTS_DIR/reports-test.yml" << 'EOF'
config:
  target: 'placeholder'
  phases:
    - duration: 300
      arrivalRate: 10
      name: "Report generation stress"

scenarios:
  - name: "Concurrent Report Generation"
    flow:
      - post:
          url: "/api/auth/signin"
          json:
            email: "test.manager@asr.com"
            password: "test123"
          capture:
            - json: "$.token"
              as: "authToken"
      - parallel:
          - get:
              url: "/api/reports/po-summary?startDate=2024-01-01&endDate=2024-12-31"
              headers:
                Authorization: "Bearer {{ authToken }}"
          - get:
              url: "/api/reports/gl-analysis?startDate=2024-01-01&endDate=2024-12-31"
              headers:
                Authorization: "Bearer {{ authToken }}"
EOF

    run_test "reports" "$RESULTS_DIR/reports-test.yml" "Report generation stress test"
}

# Function to analyze results
analyze_results() {
    echo -e "${BLUE}Analyzing Test Results...${NC}"

    # Create summary report
    cat > "$RESULTS_DIR/summary.md" << EOF
# Load Testing Results Summary

Generated: $(date)
Target: $BASE_URL
Environment: $TEST_ENV

## Test Overview

$(ls $RESULTS_DIR/*_output.log | wc -l) tests completed

## Performance Metrics

EOF

    # Extract key metrics from each test
    for log_file in "$RESULTS_DIR"/*_output.log; do
        if [[ -f "$log_file" ]]; then
            test_name=$(basename "$log_file" _output.log)
            echo "### $test_name" >> "$RESULTS_DIR/summary.md"
            echo '```' >> "$RESULTS_DIR/summary.md"

            # Extract summary statistics
            grep -E "(http\.response_time|http\.request_rate|http\.codes)" "$log_file" | tail -20 >> "$RESULTS_DIR/summary.md" 2>/dev/null || echo "No metrics available" >> "$RESULTS_DIR/summary.md"

            echo '```' >> "$RESULTS_DIR/summary.md"
            echo "" >> "$RESULTS_DIR/summary.md"
        fi
    done

    # Performance thresholds check
    echo "## Performance Threshold Analysis" >> "$RESULTS_DIR/summary.md"
    echo "" >> "$RESULTS_DIR/summary.md"
    echo "| Metric | Threshold | Status |" >> "$RESULTS_DIR/summary.md"
    echo "|--------|-----------|--------|" >> "$RESULTS_DIR/summary.md"
    echo "| Response Time (p95) | < 2000ms | ⚠️ Check individual reports |" >> "$RESULTS_DIR/summary.md"
    echo "| Error Rate | < 5% | ⚠️ Check individual reports |" >> "$RESULTS_DIR/summary.md"
    echo "| Concurrent Users | 100+ | ⚠️ Check stress test results |" >> "$RESULTS_DIR/summary.md"

    echo -e "${GREEN}✓ Results analysis complete${NC}"
    echo "Summary report: $RESULTS_DIR/summary.md"
}

# Function to generate recommendations
generate_recommendations() {
    echo -e "${BLUE}Generating Performance Recommendations...${NC}"

    cat > "$RESULTS_DIR/recommendations.md" << 'EOF'
# Performance Optimization Recommendations

Based on load testing results, here are recommendations for improving system performance:

## Database Optimizations
- [ ] Create composite indexes for dashboard queries
- [ ] Implement materialized views for report aggregations
- [ ] Set up read replicas for reporting workloads
- [ ] Configure connection pooling (20-30 connections)

## Application Optimizations
- [ ] Implement Redis caching for dashboard KPIs (5-minute TTL)
- [ ] Add query result caching for reports (15-minute TTL)
- [ ] Optimize critical API endpoints identified in testing
- [ ] Implement background job processing for large reports

## Infrastructure Optimizations
- [ ] Scale application instances horizontally
- [ ] Implement load balancing for high availability
- [ ] Configure auto-scaling based on CPU/memory usage
- [ ] Set up CDN for static assets

## Monitoring & Alerting
- [ ] Set up performance monitoring dashboards
- [ ] Configure alerts for response time thresholds
- [ ] Implement error rate monitoring
- [ ] Set up database performance monitoring

## Next Steps
1. Review individual test reports in detail
2. Implement high-priority optimizations
3. Re-run load tests to validate improvements
4. Establish continuous performance testing
EOF

    echo -e "${GREEN}✓ Recommendations generated${NC}"
    echo "Recommendations: $RESULTS_DIR/recommendations.md"
}

# Main execution flow
main() {
    echo "========================================"
    echo "  ASR PO System Load Testing Suite"
    echo "========================================"
    echo ""

    # Check prerequisites
    check_prerequisites

    # Run test suite
    case "${1:-all}" in
        "smoke")
            run_smoke_tests
            ;;
        "baseline")
            run_baseline_tests
            ;;
        "stress")
            run_stress_tests
            ;;
        "endpoints")
            run_endpoint_tests
            ;;
        "all"|*)
            run_smoke_tests
            run_baseline_tests
            run_stress_tests
            run_endpoint_tests
            ;;
    esac

    # Analyze results
    analyze_results
    generate_recommendations

    echo ""
    echo -e "${GREEN}🎉 Load testing suite completed!${NC}"
    echo ""
    echo "Results available in: $RESULTS_DIR"
    echo "HTML reports: $RESULTS_DIR/*_report.html"
    echo "Summary: $RESULTS_DIR/summary.md"
    echo "Recommendations: $RESULTS_DIR/recommendations.md"
    echo ""
    echo "Next steps:"
    echo "1. Review HTML reports in browser"
    echo "2. Check summary.md for key metrics"
    echo "3. Implement recommendations for optimization"
    echo "4. Set up continuous performance monitoring"
}

# Handle script arguments
case "${1:-}" in
    "-h"|"--help")
        echo "Usage: $0 [smoke|baseline|stress|endpoints|all]"
        echo ""
        echo "Options:"
        echo "  smoke     - Run basic functionality tests"
        echo "  baseline  - Run normal load baseline tests"
        echo "  stress    - Run high load stress tests"
        echo "  endpoints - Run endpoint-specific tests"
        echo "  all       - Run complete test suite (default)"
        echo ""
        echo "Environment variables:"
        echo "  BASE_URL  - Target URL (default: http://localhost:3000)"
        echo "  TEST_ENV  - Environment name (default: development)"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac