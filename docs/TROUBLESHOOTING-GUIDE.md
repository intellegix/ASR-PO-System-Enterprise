# ASR Purchase Order System - Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-12
**Target Audience:** System Administrators, IT Support, End Users

---

## Table of Contents

1. [Troubleshooting Overview](#troubleshooting-overview)
2. [System Diagnostics](#system-diagnostics)
3. [Application Issues](#application-issues)
4. [Authentication Problems](#authentication-problems)
5. [Purchase Order Issues](#purchase-order-issues)
6. [QuickBooks Integration Problems](#quickbooks-integration-problems)
7. [Performance Issues](#performance-issues)
8. [Database Problems](#database-problems)
9. [Email and Notification Issues](#email-and-notification-issues)
10. [Mobile App Problems](#mobile-app-problems)
11. [Reporting Issues](#reporting-issues)
12. [User Access Problems](#user-access-problems)
13. [Emergency Procedures](#emergency-procedures)
14. [Escalation Guidelines](#escalation-guidelines)

---

## Troubleshooting Overview

### Troubleshooting Philosophy

**Step-by-Step Approach:**
1. **Identify** - What exactly is the problem?
2. **Isolate** - Is it user-specific, system-wide, or feature-specific?
3. **Investigate** - Check logs, metrics, and system health
4. **Implement** - Apply the appropriate fix
5. **Verify** - Confirm the issue is resolved
6. **Document** - Record the solution for future reference

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **Critical** | System down, data loss | 15 minutes | Complete system outage, database corruption |
| **High** | Major functionality broken | 1 hour | QuickBooks sync failure, approval workflow broken |
| **Medium** | Partial functionality impacted | 4 hours | Reports not generating, slow performance |
| **Low** | Minor issues, cosmetic problems | 24 hours | UI glitches, non-critical feature bugs |

### Essential Diagnostic Information

When reporting or investigating issues, always gather:
- **User Information:** Who is affected (specific user, role, division)
- **Timing:** When did the issue start? Is it intermittent or constant?
- **Environment:** Browser, device, network connection
- **Error Messages:** Exact error text and error codes
- **Steps to Reproduce:** What actions lead to the issue
- **System State:** Recent changes, deployments, maintenance

### Quick Diagnostic Commands

```bash
# System health check
curl -f https://asr-po.yourdomain.com/api/health

# Database connectivity
pg_isready -h $DB_HOST -p $DB_PORT

# Redis connectivity
redis-cli -h $REDIS_HOST ping

# Check application logs
docker logs asr-po-system --tail=50

# System resources
docker stats asr-po-system --no-stream
```

---

## System Diagnostics

### Application Health Verification

#### Primary Health Check
```bash
#!/bin/bash
# system-health-check.sh - Comprehensive system health verification

echo "ASR PO System Health Check - $(date)"
echo "=================================="

# Application health
echo "1. Application Health:"
app_response=$(curl -s -w '%{http_code}' https://asr-po.yourdomain.com/api/health)
app_code=$(echo "$app_response" | tail -n1)
app_body=$(echo "$app_response" | head -n -1)

if [ "$app_code" = "200" ]; then
    echo "✓ Application: Healthy"
    echo "$app_body" | jq '.data.status, .data.database' 2>/dev/null || echo "$app_body"
else
    echo "❌ Application: Unhealthy (HTTP $app_code)"
    echo "$app_body"
fi

# Database health
echo "2. Database Health:"
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then
    echo "✓ Database: Connected"

    # Check query performance
    query_time=$(psql "$DATABASE_URL" -t -c "
        SELECT EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000
        FROM pg_stat_activity
        WHERE state = 'active' AND query_start IS NOT NULL
        ORDER BY query_start LIMIT 1;" 2>/dev/null)

    if [ -n "$query_time" ]; then
        echo "  Active query time: ${query_time}ms"
    fi
else
    echo "❌ Database: Connection failed"
fi

# Cache health
echo "3. Cache Health:"
if redis_response=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null); then
    if [ "$redis_response" = "PONG" ]; then
        echo "✓ Redis: Connected"

        # Check memory usage
        memory_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory | grep used_memory_human)
        echo "  $memory_info"
    else
        echo "❌ Redis: Unexpected response ($redis_response)"
    fi
else
    echo "⚠️  Redis: Connection failed (fallback cache active)"
fi

# QuickBooks integration
echo "4. QuickBooks Integration:"
qb_response=$(curl -s https://asr-po.yourdomain.com/api/quickbooks/test-connection)
qb_status=$(echo "$qb_response" | jq -r '.data.connected' 2>/dev/null)

if [ "$qb_status" = "true" ]; then
    echo "✓ QuickBooks: Connected"
    last_sync=$(echo "$qb_response" | jq -r '.data.lastSync' 2>/dev/null)
    echo "  Last sync: $last_sync"
else
    echo "❌ QuickBooks: Connection issues"
fi

# Container resources
echo "5. Resource Usage:"
docker stats asr-po-system --no-stream --format "  CPU: {{.CPUPerc}}, Memory: {{.MemUsage}} ({{.MemPerc}})"

# Disk space
echo "6. Disk Space:"
df -h | grep -E '^/dev/' | while read line; do
    usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    if [ "$usage" -gt 80 ]; then
        echo "⚠️  $line"
    else
        echo "✓ $line"
    fi
done

echo "=================================="
echo "Health check completed"
```

#### Service Status Verification
```bash
# Check all critical services
services=("postgres" "redis-server" "nginx")

for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✓ $service: Running"
    else
        echo "❌ $service: Not running"
        systemctl status "$service" --no-pager -l
    fi
done

# Check Docker containers
echo "Docker Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep asr-po
```

### Log Analysis Tools

#### Centralized Log Review
```bash
#!/bin/bash
# log-analysis.sh - Analyze logs for issues

echo "Log Analysis - Last 24 Hours"
echo "============================"

# Application errors
echo "1. Application Errors:"
docker logs asr-po-system --since 24h | grep -i error | tail -10

# Database errors
echo "2. Database Errors:"
if [ -f "/var/log/postgresql/postgresql-15-main.log" ]; then
    tail -100 /var/log/postgresql/postgresql-15-main.log | grep ERROR | tail -5
else
    echo "Database logs not accessible"
fi

# Authentication failures
echo "3. Authentication Failures:"
docker logs asr-po-system --since 24h | grep -i "auth.*fail\|login.*fail" | wc -l

# Performance warnings
echo "4. Performance Warnings:"
docker logs asr-po-system --since 24h | grep -i "slow\|timeout\|performance" | tail -5

# QuickBooks sync issues
echo "5. QuickBooks Sync Issues:"
docker logs asr-po-system --since 24h | grep -i "quickbooks.*error\|sync.*fail" | tail -5
```

#### Real-time Log Monitoring
```bash
# Monitor logs in real-time
docker logs asr-po-system -f | grep -E "(ERROR|WARN|FATAL)" --line-buffered --color=always

# Monitor specific patterns
docker logs asr-po-system -f | grep -E "(PO_CREATE|PO_APPROVE|QB_SYNC)" --line-buffered

# Monitor performance issues
docker logs asr-po-system -f | grep -E "(timeout|slow|performance)" --line-buffered
```

---

## Application Issues

### Application Won't Start

#### Symptoms
- Container won't start or exits immediately
- HTTP 502/503 errors from load balancer
- Health check endpoints return 500 errors

#### Diagnostic Steps
```bash
# Check container status
docker ps -a | grep asr-po-system

# Check container logs
docker logs asr-po-system --tail=50

# Check environment variables
docker exec asr-po-system env | grep -E "(NODE_ENV|DATABASE_URL|NEXTAUTH_)"

# Check file permissions
docker exec asr-po-system ls -la /app

# Check process inside container
docker exec asr-po-system ps aux
```

#### Common Causes and Solutions

**Cause: Missing Environment Variables**
```bash
# Check required environment variables
required_vars=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET")

for var in "${required_vars[@]}"; do
    if docker exec asr-po-system printenv "$var" >/dev/null 2>&1; then
        echo "✓ $var: Set"
    else
        echo "❌ $var: Missing"
    fi
done

# Solution: Update docker-compose.yml or .env file
```

**Cause: Database Connection Issues**
```bash
# Test database connection from container
docker exec asr-po-system npm run db:check

# Solution: Verify DATABASE_URL and database service status
```

**Cause: Port Conflicts**
```bash
# Check if port 3000 is in use
netstat -tlnp | grep :3000

# Solution: Stop conflicting service or change port
```

### Application Crashes During Runtime

#### Diagnostic Approach
```bash
# Check crash patterns
docker logs asr-po-system --since 1h | grep -E "(Error|Exception|Fatal)"

# Check memory usage leading to crash
docker stats asr-po-system --no-stream

# Check for specific error patterns
crash_patterns=(
    "out of memory"
    "ECONNRESET"
    "timeout"
    "SIGKILL"
    "ExperimentalWarning"
)

for pattern in "${crash_patterns[@]}"; do
    count=$(docker logs asr-po-system --since 24h | grep -i "$pattern" | wc -l)
    echo "$pattern: $count occurrences"
done
```

#### Memory-Related Crashes
```bash
# Check Node.js memory settings
docker exec asr-po-system node -e "console.log(process.memoryUsage())"

# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G

# Add Node.js memory flags
environment:
  - NODE_OPTIONS=--max-old-space-size=1536
```

### Slow Application Performance

#### Performance Diagnostics
```bash
# Monitor response times
curl -w "@curl-format.txt" -s -o /dev/null https://asr-po.yourdomain.com/api/health

# curl-format.txt content:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n

# Check database performance
psql "$DATABASE_URL" -c "
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 5;"

# Check cache hit rates
curl -s https://asr-po.yourdomain.com/api/monitoring/cache-metrics | jq '.data.overall.hitRate'
```

#### Performance Optimization
```bash
# Restart application to clear memory leaks
docker-compose restart asr-po-system

# Clear Redis cache if hit rate is low
redis-cli -h "$REDIS_HOST" FLUSHDB

# Update database statistics
psql "$DATABASE_URL" -c "ANALYZE;"

# Check for blocking queries
psql "$DATABASE_URL" -c "
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < NOW() - INTERVAL '5 minutes';"
```

---

## Authentication Problems

### Users Cannot Log In

#### Symptoms
- "Invalid credentials" errors with correct passwords
- Login page loops back without error
- Session expires immediately after login

#### Diagnostic Steps
```bash
# Check authentication service
docker logs asr-po-system | grep -i "auth\|login\|session"

# Verify NextAuth configuration
docker exec asr-po-system printenv | grep NEXTAUTH

# Check database user records
psql "$DATABASE_URL" -c "
SELECT email, role, is_active, last_login
FROM users
WHERE email = 'problematic.user@asr.com';"

# Check session storage
redis-cli -h "$REDIS_HOST" keys "*session*" | head -5
```

#### Common Authentication Issues

**Issue: Incorrect NextAuth Configuration**
```bash
# Verify NextAuth URL matches domain
echo $NEXTAUTH_URL
# Should be: https://asr-po.yourdomain.com

# Verify NextAuth secret is set
if [ -n "$NEXTAUTH_SECRET" ]; then
    echo "✓ NextAuth secret configured"
else
    echo "❌ NextAuth secret missing"
fi

# Solution: Update environment variables
```

**Issue: Database Connection for Auth**
```bash
# Test auth-specific database query
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_logins
FROM users;"

# Solution: Verify database connectivity and user table structure
```

**Issue: Session Storage Problems**
```bash
# Check Redis session storage
redis-cli -h "$REDIS_HOST" info keyspace

# Clear corrupted sessions
redis-cli -h "$REDIS_HOST" FLUSHDB

# Solution: Restart Redis or clear session store
```

### Permission Denied Errors

#### Role-Based Access Troubleshooting
```bash
# Check user role assignment
psql "$DATABASE_URL" -c "
SELECT
    u.email,
    u.role,
    u.division_id,
    d.division_name,
    dl.approval_limit
FROM users u
LEFT JOIN divisions d ON u.division_id = d.id
LEFT JOIN division_leaders dl ON u.id = dl.user_id
WHERE u.email = 'user@asr.com';"

# Check if user role matches expected permissions
expected_roles=("MAJORITY_OWNER" "OPERATIONS_MANAGER" "DIVISION_LEADER" "ACCOUNTING")

user_role=$(psql "$DATABASE_URL" -t -c "SELECT role FROM users WHERE email = 'user@asr.com';" | xargs)

if [[ " ${expected_roles[@]} " =~ " ${user_role} " ]]; then
    echo "✓ Valid role: $user_role"
else
    echo "❌ Invalid role: $user_role"
fi
```

#### Permission Matrix Verification
```bash
# Create permission check script
check_permissions() {
    local email=$1
    local endpoint=$2

    echo "Checking permissions for $email on $endpoint"

    # Get user session token (implementation dependent)
    session_token=$(get_user_session "$email")

    # Test endpoint access
    response=$(curl -s -w '%{http_code}' -H "Authorization: Bearer $session_token" \
        "https://asr-po.yourdomain.com/api$endpoint")

    http_code=$(echo "$response" | tail -n1)

    case $http_code in
        200) echo "✓ Access granted" ;;
        401) echo "❌ Unauthorized - check authentication" ;;
        403) echo "❌ Forbidden - insufficient permissions" ;;
        *) echo "⚠️  Unexpected response: $http_code" ;;
    esac
}

# Test common endpoints
check_permissions "division.leader@asr.com" "/po/list"
check_permissions "division.leader@asr.com" "/dashboards/cross-division"
```

---

## Purchase Order Issues

### PO Creation Problems

#### Symptoms
- Form submission fails with validation errors
- PO numbers not generating correctly
- Line items not saving properly

#### Diagnostic Steps
```bash
# Check PO creation endpoint logs
docker logs asr-po-system | grep "/api/po/create" | tail -10

# Check database constraints
psql "$DATABASE_URL" -c "
SELECT
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'po_headers';"

# Check work order sequence generation
psql "$DATABASE_URL" -c "
SELECT
    d.division_name,
    wos.current_sequence,
    wos.year
FROM work_order_sequences wos
JOIN divisions d ON wos.division_id = d.id
ORDER BY d.division_name;"
```

#### Common PO Creation Issues

**Issue: Invalid Project/Work Order Selection**
```bash
# Verify project exists and is active
psql "$DATABASE_URL" -c "
SELECT
    project_code,
    project_name,
    status,
    division_id
FROM projects
WHERE id = 'project-id-from-error';"

# Verify work order exists and has budget
psql "$DATABASE_URL" -c "
SELECT
    work_order_number,
    title,
    budget_amount,
    spent_to_date
FROM work_orders
WHERE id = 'work-order-id-from-error';"

# Solution: Update project status or work order budget
```

**Issue: Vendor Validation Errors**
```bash
# Check vendor record
psql "$DATABASE_URL" -c "
SELECT
    vendor_name,
    vendor_code,
    is_active,
    payment_terms_default
FROM vendors
WHERE id = 'vendor-id-from-error';"

# Check for missing required fields
psql "$DATABASE_URL" -c "
SELECT
    vendor_name,
    contact_name,
    contact_email
FROM vendors
WHERE contact_name IS NULL
   OR contact_email IS NULL
   OR vendor_name IS NULL;"

# Solution: Update vendor records with required information
```

**Issue: GL Account Mapping Problems**
```bash
# Verify GL account exists
psql "$DATABASE_URL" -c "
SELECT
    gl_code_short,
    gl_account_name,
    is_active,
    qb_sync_enabled
FROM gl_account_mappings
WHERE gl_code_short = 'XX';"

# Check for inactive GL accounts
psql "$DATABASE_URL" -c "
SELECT gl_code_short, gl_account_name
FROM gl_account_mappings
WHERE is_active = false;"

# Solution: Activate GL accounts or use alternative codes
```

### Approval Workflow Issues

#### Stuck Approvals
```bash
# Find POs stuck in approval
psql "$DATABASE_URL" -c "
SELECT
    po.po_number,
    po.status,
    po.total_amount,
    po.created_at,
    EXTRACT(DAY FROM (NOW() - po.created_at)) as days_pending
FROM po_headers po
WHERE po.status = 'PENDING'
AND po.created_at < NOW() - INTERVAL '7 days'
ORDER BY po.created_at;"

# Check approval chain
psql "$DATABASE_URL" -c "
SELECT
    pa.po_id,
    pa.action,
    pa.actor_user_id,
    u.email as actor_email,
    pa.timestamp,
    pa.notes
FROM po_approvals pa
JOIN users u ON pa.actor_user_id = u.id
WHERE pa.po_id = 'stuck-po-id'
ORDER BY pa.timestamp;"
```

#### Approval Notifications Not Sending
```bash
# Check email configuration
docker exec asr-po-system printenv | grep SMTP

# Test email connectivity
docker exec asr-po-system npm run test:email

# Check notification queue
psql "$DATABASE_URL" -c "
SELECT
    notification_type,
    recipient_email,
    status,
    created_at,
    error_message
FROM notification_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;" 2>/dev/null || echo "No notification queue table found"
```

#### Approval Limit Issues
```bash
# Check division leader approval limits
psql "$DATABASE_URL" -c "
SELECT
    dl.name,
    dl.email,
    dl.approval_limit,
    po.po_number,
    po.total_amount,
    CASE
        WHEN po.total_amount <= dl.approval_limit THEN 'Within Limit'
        ELSE 'Exceeds Limit'
    END as limit_status
FROM division_leaders dl
LEFT JOIN po_headers po ON dl.id = po.division_leader_id
WHERE po.status = 'PENDING'
ORDER BY po.created_at DESC;"
```

---

## QuickBooks Integration Problems

### Connection Issues

#### QuickBooks Won't Connect
```bash
# Check QuickBooks OAuth status
curl -s https://asr-po.yourdomain.com/api/quickbooks/connection-status | jq '.'

# Verify OAuth configuration
docker exec asr-po-system printenv | grep QB_

# Test QuickBooks API connectivity
curl -s https://appcenter.intuit.com/.well-known/app_center/openid_connect

# Check stored tokens
psql "$DATABASE_URL" -c "
SELECT
    company_id,
    created_at,
    access_token_expires_at,
    refresh_token_expires_at,
    CASE
        WHEN access_token_expires_at > NOW() THEN 'Valid'
        ELSE 'Expired'
    END as token_status
FROM qb_auth_tokens
ORDER BY created_at DESC
LIMIT 1;"
```

#### Token Refresh Failures
```bash
# Check token refresh attempts
psql "$DATABASE_URL" -c "
SELECT
    refresh_attempted_at,
    refresh_success,
    error_message
FROM qb_token_refresh_log
ORDER BY refresh_attempted_at DESC
LIMIT 10;" 2>/dev/null || echo "No token refresh log found"

# Manually refresh token
curl -X POST https://asr-po.yourdomain.com/api/quickbooks/refresh-token

# Check refresh result
tail -20 /var/log/asr-po-system/quickbooks.log | grep "token.*refresh"
```

### Data Synchronization Issues

#### Sync Failures
```bash
# Check recent sync status
psql "$DATABASE_URL" -c "
SELECT
    sync_date,
    sync_type,
    status,
    records_processed,
    duration_seconds,
    error_message
FROM qb_sync_log
ORDER BY sync_date DESC
LIMIT 10;" 2>/dev/null

# Check for specific sync errors
error_patterns=(
    "rate limit"
    "authentication"
    "validation"
    "timeout"
    "duplicate"
)

for pattern in "${error_patterns[@]}"; do
    count=$(grep -i "$pattern" /var/log/asr-po-system/quickbooks.log | wc -l 2>/dev/null || echo "0")
    echo "$pattern errors: $count"
done

# Manual sync test
curl -X POST https://asr-po.yourdomain.com/api/quickbooks/sync-now \
    -H "Content-Type: application/json" \
    -d '{"syncType": "vendors", "force": true}'
```

#### Data Mapping Issues
```bash
# Check vendor mapping inconsistencies
psql "$DATABASE_URL" -c "
SELECT
    v.vendor_name,
    v.vendor_code,
    qvm.qb_vendor_id,
    qvm.last_sync_at
FROM vendors v
LEFT JOIN qb_vendor_mappings qvm ON v.id = qvm.vendor_id
WHERE qvm.qb_vendor_id IS NULL
   OR qvm.last_sync_at < NOW() - INTERVAL '30 days';" 2>/dev/null

# Check GL account mapping issues
psql "$DATABASE_URL" -c "
SELECT
    gl.gl_code_short,
    gl.gl_account_name,
    qam.qb_account_id,
    gl.qb_sync_enabled
FROM gl_account_mappings gl
LEFT JOIN qb_account_mappings qam ON gl.gl_code_short = qam.gl_code_short
WHERE gl.qb_sync_enabled = true
AND qam.qb_account_id IS NULL;" 2>/dev/null
```

### QuickBooks API Rate Limits

#### Rate Limit Monitoring
```bash
# Check current rate limit status
curl -s https://asr-po.yourdomain.com/api/quickbooks/rate-limit-status | jq '.'

# Monitor rate limit usage
watch -n 30 'curl -s https://asr-po.yourdomain.com/api/quickbooks/rate-limit-status | jq ".remaining, .resetTime"'

# Check for rate limit errors in logs
grep -i "rate.*limit\|429" /var/log/asr-po-system/quickbooks.log | tail -10
```

#### Rate Limit Recovery
```bash
# Queue operations during rate limit
psql "$DATABASE_URL" -c "
UPDATE qb_sync_queue
SET status = 'queued',
    next_attempt = NOW() + INTERVAL '1 hour'
WHERE status = 'rate_limited';" 2>/dev/null

# Implement exponential backoff
retry_intervals=(60 120 300 600 1200)  # seconds

for interval in "${retry_intervals[@]}"; do
    echo "Waiting ${interval} seconds before retry..."
    sleep "$interval"

    if curl -s https://asr-po.yourdomain.com/api/quickbooks/test-connection | grep -q '"connected":true'; then
        echo "Connection restored"
        break
    fi
done
```

---

## Performance Issues

### Slow Response Times

#### Response Time Analysis
```bash
#!/bin/bash
# response-time-analysis.sh - Analyze application response times

echo "Response Time Analysis - $(date)"
echo "==============================="

# Test critical endpoints
endpoints=(
    "/api/health"
    "/api/po/list"
    "/api/dashboards/kpi-metrics"
    "/api/reports/po-summary"
)

for endpoint in "${endpoints[@]}"; do
    echo "Testing: $endpoint"

    # Measure response time
    response_time=$(curl -w '%{time_total}' -s -o /dev/null \
        "https://asr-po.yourdomain.com$endpoint")

    response_ms=$(echo "$response_time * 1000" | bc)

    # Color coding based on response time
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        echo "  ❌ Response time: ${response_ms}ms (SLOW)"
    elif (( $(echo "$response_time > 0.5" | bc -l) )); then
        echo "  ⚠️  Response time: ${response_ms}ms (WARNING)"
    else
        echo "  ✓ Response time: ${response_ms}ms (GOOD)"
    fi

    sleep 1
done

# Database query performance
echo "Database Query Performance:"
psql "$DATABASE_URL" -c "
SELECT
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 5;" 2>/dev/null || echo "pg_stat_statements not available"
```

#### Performance Optimization Steps
```bash
# 1. Clear application cache
redis-cli -h "$REDIS_HOST" FLUSHALL

# 2. Restart application
docker-compose restart asr-po-system

# 3. Update database statistics
psql "$DATABASE_URL" -c "ANALYZE;"

# 4. Check for long-running queries
psql "$DATABASE_URL" -c "
SELECT
    pid,
    now() - query_start as duration,
    state,
    left(query, 50) as query_preview
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '5 seconds';"

# 5. Kill problematic queries if necessary
# psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(PID);"
```

### High Resource Usage

#### Memory Usage Investigation
```bash
# Check container memory usage
docker stats asr-po-system --no-stream

# Check Node.js heap usage
docker exec asr-po-system node -e "
const used = process.memoryUsage();
console.log('Memory Usage:');
console.log('RSS:', Math.round(used.rss / 1024 / 1024), 'MB');
console.log('Heap Used:', Math.round(used.heapUsed / 1024 / 1024), 'MB');
console.log('Heap Total:', Math.round(used.heapTotal / 1024 / 1024), 'MB');
console.log('External:', Math.round(used.external / 1024 / 1024), 'MB');
"

# Check for memory leaks
docker exec asr-po-system npm run memory-profile 2>/dev/null || echo "Memory profiling not available"

# Check system memory
free -h
```

#### CPU Usage Investigation
```bash
# Monitor CPU usage over time
docker stats asr-po-system | head -10

# Check process activity inside container
docker exec asr-po-system top -n 1

# Look for CPU-intensive operations
docker logs asr-po-system | grep -i "cpu\|performance\|slow" | tail -10

# Check for blocking operations
psql "$DATABASE_URL" -c "
SELECT
    wait_event_type,
    wait_event,
    state,
    count(*)
FROM pg_stat_activity
WHERE state != 'idle'
GROUP BY wait_event_type, wait_event, state;"
```

### Cache Performance Issues

#### Cache Hit Rate Analysis
```bash
# Check Redis cache statistics
redis-cli -h "$REDIS_HOST" info stats | grep -E "(keyspace_hits|keyspace_misses)"

# Calculate hit rate
hits=$(redis-cli -h "$REDIS_HOST" info stats | grep keyspace_hits | cut -d: -f2)
misses=$(redis-cli -h "$REDIS_HOST" info stats | grep keyspace_misses | cut -d: -f2)

if [ "$hits" -gt 0 ] || [ "$misses" -gt 0 ]; then
    hit_rate=$(echo "scale=2; $hits / ($hits + $misses) * 100" | bc)
    echo "Cache hit rate: $hit_rate%"

    if (( $(echo "$hit_rate < 70" | bc -l) )); then
        echo "⚠️  Low cache hit rate detected"
    fi
else
    echo "No cache statistics available"
fi

# Check cache keys and expiration
redis-cli -h "$REDIS_HOST" keys "asr_po:*" | head -10
redis-cli -h "$REDIS_HOST" ttl "asr_po:kpis:CH"
```

#### Cache Optimization
```bash
# Clear stale cache entries
redis-cli -h "$REDIS_HOST" eval "
local keys = redis.call('keys', 'asr_po:*')
local expired = 0
for i=1, #keys do
    local ttl = redis.call('ttl', keys[i])
    if ttl == -1 then  -- No expiration set
        redis.call('del', keys[i])
        expired = expired + 1
    end
end
return expired
" 0

# Warm up critical cache entries
critical_divisions=("CH" "PW" "WS" "LS")

for division in "${critical_divisions[@]}"; do
    echo "Warming cache for division: $division"
    curl -s "https://asr-po.yourdomain.com/api/dashboards/division?division=$division" >/dev/null
    sleep 2
done

# Pre-load common reports
curl -s "https://asr-po.yourdomain.com/api/reports/po-summary" >/dev/null
curl -s "https://asr-po.yourdomain.com/api/dashboards/kpi-metrics" >/dev/null
```

---

## Database Problems

### Connection Issues

#### Database Won't Connect
```bash
# Test basic connectivity
pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"

# Check if database is running
if command -v systemctl >/dev/null; then
    systemctl status postgresql
else
    # For Docker deployments
    docker ps | grep postgres
fi

# Test authentication
psql "$DATABASE_URL" -c "SELECT 1;"

# Check connection limits
psql "$DATABASE_URL" -c "
SELECT
    setting as max_connections,
    (SELECT count(*) FROM pg_stat_activity) as current_connections
FROM pg_settings
WHERE name = 'max_connections';"
```

#### Connection Pool Exhaustion
```bash
# Monitor active connections
psql "$DATABASE_URL" -c "
SELECT
    state,
    count(*) as connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;"

# Find long-running connections
psql "$DATABASE_URL" -c "
SELECT
    pid,
    usename,
    application_name,
    state,
    now() - state_change as duration
FROM pg_stat_activity
WHERE state = 'active'
AND now() - state_change > interval '5 minutes';"

# Kill problematic connections (use with caution)
# psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(PID);"

# Restart application to reset connection pool
docker-compose restart asr-po-system
```

### Query Performance Issues

#### Slow Query Identification
```bash
# Enable query logging (temporary)
psql "$DATABASE_URL" -c "
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second
SELECT pg_reload_conf();"

# Check for missing indexes
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100  -- High cardinality columns that might need indexes
ORDER BY n_distinct DESC;"

# Find unused indexes
psql "$DATABASE_URL" -c "
SELECT
    indexrelname as index_name,
    relname as table_name,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan < 10  -- Rarely used indexes
ORDER BY pg_relation_size(indexrelid) DESC;"
```

#### Query Optimization
```bash
# Update table statistics
psql "$DATABASE_URL" -c "ANALYZE;"

# Vacuum critical tables
critical_tables=("po_headers" "po_approvals" "users" "vendors")

for table in "${critical_tables[@]}"; do
    echo "Vacuuming $table..."
    psql "$DATABASE_URL" -c "VACUUM ANALYZE $table;"
done

# Check table bloat
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"
```

### Data Integrity Issues

#### Constraint Violations
```bash
# Check for orphaned records
psql "$DATABASE_URL" -c "
-- POs without valid division leaders
SELECT po.po_number, po.division_leader_id
FROM po_headers po
LEFT JOIN division_leaders dl ON po.division_leader_id = dl.id
WHERE dl.id IS NULL;

-- Users without valid divisions
SELECT u.email, u.division_id
FROM users u
LEFT JOIN divisions d ON u.division_id = d.id
WHERE u.division_id IS NOT NULL AND d.id IS NULL;"

# Check for data consistency issues
psql "$DATABASE_URL" -c "
-- POs with inconsistent approval states
SELECT
    po.po_number,
    po.status,
    count(pa.id) as approval_count
FROM po_headers po
LEFT JOIN po_approvals pa ON po.id = pa.po_id
WHERE po.status = 'APPROVED'
GROUP BY po.id, po.po_number, po.status
HAVING count(pa.id) = 0;"
```

#### Backup and Recovery Verification
```bash
# Verify recent backups exist
ls -la /var/backups/asr-po-system/ | grep "$(date +%Y%m%d)" || \
    echo "⚠️  No backup found for today"

# Test backup integrity
latest_backup=$(ls -t /var/backups/asr-po-system/asr-po-backup_*.sql.gz | head -1)

if [ -n "$latest_backup" ]; then
    echo "Testing backup integrity: $latest_backup"

    # Test gzip integrity
    if gzip -t "$latest_backup"; then
        echo "✓ Backup file integrity: OK"
    else
        echo "❌ Backup file corrupted"
    fi

    # Test PostgreSQL backup structure
    if pg_restore --list "$latest_backup" >/dev/null 2>&1; then
        echo "✓ PostgreSQL backup structure: OK"
    else
        echo "❌ PostgreSQL backup structure invalid"
    fi
else
    echo "❌ No backup files found"
fi
```

---

## Email and Notification Issues

### Email Not Sending

#### SMTP Configuration Check
```bash
# Verify SMTP settings
docker exec asr-po-system printenv | grep SMTP

# Test SMTP connectivity
smtp_test() {
    local smtp_host="$SMTP_HOST"
    local smtp_port="$SMTP_PORT"

    if timeout 10 bash -c "cat < /dev/null > /dev/tcp/$smtp_host/$smtp_port" 2>/dev/null; then
        echo "✓ SMTP connectivity: $smtp_host:$smtp_port is reachable"
    else
        echo "❌ SMTP connectivity: Cannot reach $smtp_host:$smtp_port"
    fi
}

smtp_test

# Test email sending
docker exec asr-po-system npm run test:email 2>/dev/null || \
    echo "Email test command not available"
```

#### Email Queue Issues
```bash
# Check email queue status
psql "$DATABASE_URL" -c "
SELECT
    email_type,
    status,
    count(*) as count,
    min(created_at) as oldest,
    max(created_at) as newest
FROM email_queue
GROUP BY email_type, status
ORDER BY email_type, status;" 2>/dev/null || echo "No email queue table found"

# Check failed emails
psql "$DATABASE_URL" -c "
SELECT
    recipient_email,
    email_type,
    error_message,
    created_at,
    retry_count
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;" 2>/dev/null
```

#### Notification Delivery Problems
```bash
# Check notification settings
psql "$DATABASE_URL" -c "
SELECT
    u.email,
    u.role,
    ns.notification_type,
    ns.enabled,
    ns.delivery_method
FROM users u
LEFT JOIN notification_settings ns ON u.id = ns.user_id
WHERE u.email = 'problematic.user@asr.com';" 2>/dev/null

# Test specific notification triggers
notification_types=("PO_CREATED" "PO_APPROVED" "PO_REJECTED" "BUDGET_ALERT")

for type in "${notification_types[@]}"; do
    echo "Testing $type notification..."

    # Trigger test notification
    curl -X POST "https://asr-po.yourdomain.com/api/notifications/test" \
        -H "Content-Type: application/json" \
        -d "{\"type\": \"$type\", \"recipient\": \"test@asr.com\"}" 2>/dev/null

    sleep 2
done
```

### Missing Notifications

#### Notification Logic Check
```bash
# Check recent notification activity
docker logs asr-po-system --since 1h | grep -i "notification\|email" | tail -20

# Verify notification triggers
psql "$DATABASE_URL" -c "
SELECT
    po.po_number,
    po.status,
    po.created_at,
    pa.action,
    pa.timestamp,
    pa.actor_user_id
FROM po_headers po
JOIN po_approvals pa ON po.id = pa.po_id
WHERE po.created_at > NOW() - INTERVAL '24 hours'
ORDER BY po.created_at DESC;"

# Check if notifications were attempted
psql "$DATABASE_URL" -c "
SELECT
    notification_type,
    recipient_email,
    status,
    created_at,
    sent_at
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;" 2>/dev/null || echo "No notifications table found"
```

---

## Mobile App Problems

### PWA Installation Issues

#### Installation Troubleshooting
```bash
# Check PWA manifest
curl -s https://asr-po.yourdomain.com/manifest.json | jq '.'

# Verify service worker
curl -s https://asr-po.yourdomain.com/sw.js | head -10

# Check HTTPS certificate
echo | openssl s_client -connect asr-po.yourdomain.com:443 -servername asr-po.yourdomain.com 2>/dev/null | \
    openssl x509 -noout -dates

# Test PWA criteria
pwa_checks=(
    "https://asr-po.yourdomain.com/manifest.json"
    "https://asr-po.yourdomain.com/sw.js"
    "https://asr-po.yourdomain.com/favicon.ico"
)

for check in "${pwa_checks[@]}"; do
    if curl -s -f "$check" >/dev/null; then
        echo "✓ $(basename $check): Available"
    else
        echo "❌ $(basename $check): Missing"
    fi
done
```

### Mobile Performance Issues

#### Mobile-Specific Diagnostics
```bash
# Check mobile user agent logs
docker logs asr-po-system | grep -i "mobile\|android\|iphone\|ipad" | tail -10

# Monitor mobile-specific errors
mobile_patterns=(
    "touch"
    "gesture"
    "orientation"
    "viewport"
    "offline"
)

for pattern in "${mobile_patterns[@]}"; do
    count=$(docker logs asr-po-system --since 24h | grep -i "$pattern" | wc -l)
    echo "$pattern issues: $count"
done

# Check service worker errors
curl -s https://asr-po.yourdomain.com/api/sw-errors 2>/dev/null || \
    echo "Service worker error endpoint not available"
```

### Offline Functionality Issues

#### Offline Mode Testing
```bash
# Check cache strategies
curl -s https://asr-po.yourdomain.com/sw.js | grep -i "cache"

# Verify offline fallbacks
offline_resources=(
    "/"
    "/api/health"
    "/offline.html"
)

for resource in "${offline_resources[@]}"; do
    # This would need to be tested from a browser with offline mode
    echo "Resource to verify offline: $resource"
done

# Check IndexedDB usage
echo "IndexedDB usage should be tested from browser dev tools"
echo "Application > Storage > IndexedDB > asr-po-cache"
```

---

## Reporting Issues

### Reports Not Generating

#### Report Generation Diagnostics
```bash
# Check report generation logs
docker logs asr-po-system | grep -i "report\|pdf\|excel" | tail -20

# Test report endpoints
reports=("gl-analysis" "vendor-analysis" "budget-vs-actual" "po-summary")

for report in "${reports[@]}"; do
    echo "Testing $report report..."

    response=$(curl -s -w '%{http_code}' \
        "https://asr-po.yourdomain.com/api/reports/$report?format=json")

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        echo "✓ $report: OK"
    else
        echo "❌ $report: Failed (HTTP $http_code)"
    fi

    sleep 2
done

# Check data availability for reports
psql "$DATABASE_URL" -c "
SELECT
    COUNT(*) as total_pos,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_pos,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_pos
FROM po_headers;"
```

#### PDF Generation Issues
```bash
# Check PDF generation dependencies
docker exec asr-po-system which puppeteer 2>/dev/null || \
    echo "Puppeteer not found"

# Test PDF generation
test_pdf_generation() {
    echo "Testing PDF generation..."

    response=$(curl -s -w '%{http_code}' \
        "https://asr-po.yourdomain.com/api/reports/po-summary?format=pdf")

    http_code=$(echo "$response" | tail -n1)
    content_type=$(echo "$response" | grep -i "content-type" | head -1)

    if [ "$http_code" = "200" ] && [[ "$content_type" == *"application/pdf"* ]]; then
        echo "✓ PDF generation: Working"
    else
        echo "❌ PDF generation: Failed"
        echo "HTTP Code: $http_code"
        echo "Content-Type: $content_type"
    fi
}

test_pdf_generation

# Check system resources for PDF generation
echo "System resources for PDF generation:"
docker stats asr-po-system --no-stream | grep -E "(CPU|MEM)"
```

### Report Data Accuracy Issues

#### Data Validation for Reports
```bash
# Validate GL Analysis data
psql "$DATABASE_URL" -c "
SELECT
    gam.gl_code_short,
    gam.gl_account_name,
    COUNT(po.id) as po_count,
    SUM(po.total_amount) as total_spending
FROM gl_account_mappings gam
LEFT JOIN po_headers po ON gam.gl_code_short = po.po_gl_code
WHERE po.status IN ('APPROVED', 'ISSUED', 'COMPLETED')
GROUP BY gam.gl_code_short, gam.gl_account_name
ORDER BY total_spending DESC;"

# Validate vendor analysis data
psql "$DATABASE_URL" -c "
SELECT
    v.vendor_name,
    COUNT(po.id) as po_count,
    SUM(po.total_amount) as total_spending,
    AVG(po.total_amount) as avg_po_amount
FROM vendors v
LEFT JOIN po_headers po ON v.id = po.vendor_id
WHERE po.status IN ('APPROVED', 'ISSUED', 'COMPLETED')
GROUP BY v.id, v.vendor_name
HAVING COUNT(po.id) > 0
ORDER BY total_spending DESC;"

# Check for data inconsistencies
psql "$DATABASE_URL" -c "
-- POs without line items
SELECT po.po_number, po.total_amount
FROM po_headers po
LEFT JOIN po_line_items pli ON po.id = pli.po_id
WHERE pli.id IS NULL;

-- Line items total doesn't match PO total
SELECT
    po.po_number,
    po.total_amount as po_total,
    SUM(pli.quantity * pli.unit_price) as line_items_total
FROM po_headers po
JOIN po_line_items pli ON po.id = pli.po_id
GROUP BY po.id, po.po_number, po.total_amount
HAVING ABS(po.total_amount - SUM(pli.quantity * pli.unit_price)) > 0.01;"
```

---

## User Access Problems

### Role Assignment Issues

#### User Role Diagnostics
```bash
# Check user role consistency
psql "$DATABASE_URL" -c "
SELECT
    u.email,
    u.role,
    u.division_id,
    d.division_name,
    dl.id as division_leader_record,
    CASE
        WHEN u.role = 'DIVISION_LEADER' AND dl.id IS NULL THEN 'Missing DL Record'
        WHEN u.role != 'DIVISION_LEADER' AND dl.id IS NOT NULL THEN 'Unexpected DL Record'
        ELSE 'Consistent'
    END as role_consistency
FROM users u
LEFT JOIN divisions d ON u.division_id = d.id
LEFT JOIN division_leaders dl ON u.id = dl.user_id
ORDER BY u.email;"

# Check permission inconsistencies
check_user_permissions() {
    local email=$1

    echo "Checking permissions for: $email"

    user_info=$(psql "$DATABASE_URL" -t -c "
        SELECT role, division_id FROM users WHERE email = '$email';")

    if [ -n "$user_info" ]; then
        echo "User found: $user_info"
    else
        echo "❌ User not found in database"
        return 1
    fi

    # Check specific permissions based on role
    # This would need to be customized based on your permission system
}

# Test problematic user
check_user_permissions "problematic.user@asr.com"
```

#### Division Assignment Problems
```bash
# Check division leader assignments
psql "$DATABASE_URL" -c "
SELECT
    d.division_name,
    d.division_code,
    dl.name as leader_name,
    dl.email as leader_email,
    dl.is_active,
    dl.approval_limit
FROM divisions d
LEFT JOIN division_leaders dl ON d.id = dl.division_id AND dl.is_active = true
ORDER BY d.division_name;"

# Check for missing division leaders
psql "$DATABASE_URL" -c "
SELECT
    d.division_name,
    d.division_code,
    COUNT(dl.id) as leader_count
FROM divisions d
LEFT JOIN division_leaders dl ON d.id = dl.division_id AND dl.is_active = true
GROUP BY d.id, d.division_name, d.division_code
HAVING COUNT(dl.id) = 0;"
```

### Session Management Issues

#### Session Troubleshooting
```bash
# Check active sessions
redis-cli -h "$REDIS_HOST" keys "*session*" | wc -l

# Check specific user session
check_user_session() {
    local user_email=$1

    # This would depend on how sessions are stored
    echo "Checking session for: $user_email"

    # Example for Redis-stored sessions
    redis-cli -h "$REDIS_HOST" keys "*session*" | while read session_key; do
        session_data=$(redis-cli -h "$REDIS_HOST" get "$session_key")
        if echo "$session_data" | grep -q "$user_email"; then
            echo "Found session: $session_key"
            echo "Session data: $session_data"
        fi
    done
}

# Clear user sessions
clear_user_sessions() {
    local user_email=$1

    echo "Clearing sessions for: $user_email"

    # This would need to be implemented based on session storage
    redis-cli -h "$REDIS_HOST" keys "*session*" | while read session_key; do
        session_data=$(redis-cli -h "$REDIS_HOST" get "$session_key")
        if echo "$session_data" | grep -q "$user_email"; then
            echo "Clearing session: $session_key"
            redis-cli -h "$REDIS_HOST" del "$session_key"
        fi
    done
}

# Example usage
# clear_user_sessions "problematic.user@asr.com"
```

---

## Emergency Procedures

### System Recovery Procedures

#### Emergency System Restart
```bash
#!/bin/bash
# emergency-restart.sh - Emergency system restart procedure

echo "🚨 EMERGENCY SYSTEM RESTART - $(date)"
echo "======================================"

# 1. Notify stakeholders
send_alert() {
    local message="$1"

    # Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 EMERGENCY: $message\"}"
    fi

    # Email notification
    echo "$message" | mail -s "EMERGENCY: ASR PO System" admin@asr.com 2>/dev/null || true
}

send_alert "Emergency system restart initiated at $(date)"

# 2. Create emergency backup
echo "Creating emergency backup..."
emergency_backup="/tmp/emergency-backup-$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$emergency_backup" && \
    echo "✓ Emergency backup created: $emergency_backup" || \
    echo "❌ Emergency backup failed"

# 3. Stop services gracefully
echo "Stopping services..."
docker-compose -f docker-compose.prod.yml stop

# 4. Check for corrupted containers
echo "Checking container integrity..."
docker system prune -f

# 5. Restart services
echo "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

# 6. Wait for startup
echo "Waiting for services to start..."
sleep 30

# 7. Verify system health
echo "Verifying system health..."
health_check_count=0
max_checks=12

while [ $health_check_count -lt $max_checks ]; do
    if curl -f https://asr-po.yourdomain.com/api/health >/dev/null 2>&1; then
        echo "✓ System health check passed"
        send_alert "Emergency restart completed successfully at $(date)"
        exit 0
    else
        echo "⚠️  Health check failed, retrying in 30 seconds..."
        sleep 30
        ((health_check_count++))
    fi
done

echo "❌ Emergency restart failed - system not responding"
send_alert "Emergency restart FAILED - manual intervention required"
exit 1
```

#### Data Recovery Procedures
```bash
#!/bin/bash
# emergency-data-recovery.sh - Emergency data recovery

echo "🚨 EMERGENCY DATA RECOVERY - $(date)"
echo "===================================="

# 1. Stop application to prevent further damage
docker-compose -f docker-compose.prod.yml stop app

# 2. Assess data integrity
echo "Checking database integrity..."
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# 3. Find latest good backup
echo "Finding latest backup..."
latest_backup=$(ls -t /var/backups/asr-po-system/asr-po-backup_*.sql.gz | head -1)

if [ -n "$latest_backup" ]; then
    echo "Latest backup found: $latest_backup"
    backup_date=$(stat -c %y "$latest_backup")
    echo "Backup date: $backup_date"
else
    echo "❌ No backup files found - critical situation"
    exit 1
fi

# 4. Verify backup integrity
echo "Verifying backup integrity..."
if gzip -t "$latest_backup" && pg_restore --list "$latest_backup" >/dev/null; then
    echo "✓ Backup integrity verified"
else
    echo "❌ Backup file corrupted"
    exit 1
fi

# 5. Create current state backup before restore
echo "Backing up current state..."
current_backup="/tmp/pre-recovery-$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$current_backup"

# 6. Restore from backup (THIS IS DESTRUCTIVE)
echo "⚠️  WARNING: About to restore database from backup"
echo "This will DESTROY current data and restore to: $backup_date"
read -p "Type 'EMERGENCY RESTORE' to continue: " confirm

if [ "$confirm" = "EMERGENCY RESTORE" ]; then
    echo "Restoring database..."
    pg_restore --clean --if-exists \
        -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" \
        "$latest_backup"

    echo "✓ Database restored"
else
    echo "Recovery cancelled"
    exit 1
fi

# 7. Restart application
echo "Restarting application..."
docker-compose -f docker-compose.prod.yml start app

# 8. Verify recovery
echo "Verifying recovery..."
sleep 30

if curl -f https://asr-po.yourdomain.com/api/health/database >/dev/null; then
    echo "✓ Recovery successful"
    echo "📧 Sending recovery notification..."

    mail -s "RECOVERY: ASR PO System Data Restored" admin@asr.com <<EOF
Emergency data recovery completed at $(date)

Recovery Details:
- Backup used: $latest_backup
- Backup date: $backup_date
- Current state saved to: $current_backup
- System status: Operational

Please verify data integrity and notify users of any data loss.
EOF

else
    echo "❌ Recovery verification failed"
    exit 1
fi
```

### Service Isolation Procedures

#### Isolate Problematic Components
```bash
#!/bin/bash
# isolate-component.sh - Isolate problematic system components

component=$1

case $component in
    "quickbooks")
        echo "Isolating QuickBooks integration..."

        # Disable QuickBooks sync
        psql "$DATABASE_URL" -c "
            UPDATE qb_sync_config
            SET sync_enabled = false
            WHERE sync_type IN ('vendors', 'purchase_orders', 'accounts');"

        # Clear QB error queue
        redis-cli -h "$REDIS_HOST" del "qb:error_queue" 2>/dev/null || true

        echo "✓ QuickBooks integration isolated"
        ;;

    "email")
        echo "Isolating email system..."

        # Disable email notifications temporarily
        docker exec asr-po-system npm run disable:email 2>/dev/null || \
            echo "⚠️  Email disable command not available"

        # Clear email queue
        psql "$DATABASE_URL" -c "
            UPDATE email_queue
            SET status = 'disabled'
            WHERE status IN ('pending', 'queued');" 2>/dev/null || true

        echo "✓ Email system isolated"
        ;;

    "cache")
        echo "Isolating cache system..."

        # Flush Redis cache
        redis-cli -h "$REDIS_HOST" FLUSHALL 2>/dev/null || true

        # Stop Redis temporarily
        docker-compose -f docker-compose.prod.yml stop redis

        echo "✓ Cache system isolated (fallback cache active)"
        ;;

    *)
        echo "Usage: $0 {quickbooks|email|cache}"
        echo "Available components to isolate:"
        echo "  quickbooks - Disable QB sync and integration"
        echo "  email      - Disable email notifications"
        echo "  cache      - Disable Redis cache (fallback active)"
        exit 1
        ;;
esac
```

---

## Escalation Guidelines

### Escalation Matrix

| Issue Severity | Initial Response | Escalation Path | Timeline |
|----------------|------------------|-----------------|----------|
| **Critical** | System Admin | DevOps Team → Management | 0 → 15min → 30min |
| **High** | System Admin | DevOps Team | 0 → 1hour |
| **Medium** | Support Team | System Admin → DevOps | 0 → 4hours → 8hours |
| **Low** | Support Team | System Admin | 0 → 24hours |

### Contact Information

**Primary Contacts:**
- System Administrator: admin@yourdomain.com
- DevOps Team: devops@yourdomain.com
- Development Team: dev-team@yourdomain.com
- On-Call Engineer: +1-XXX-XXX-XXXX

**Escalation Contacts:**
- IT Director: it-director@yourdomain.com
- ASR Management: management@asr.com
- Emergency Support: +1-XXX-XXX-XXXX

### Issue Documentation Template

When escalating issues, include:

```
ISSUE ESCALATION REPORT
=====================

Issue ID: [Ticket/Issue Number]
Reported At: [Date/Time]
Severity: [Critical/High/Medium/Low]
Reporter: [Name/Email]

PROBLEM DESCRIPTION:
[Clear description of the issue]

IMPACT:
- Users Affected: [Number/Role/Division]
- Business Impact: [Revenue/Operations impact]
- Workaround Available: [Yes/No - describe]

STEPS TAKEN:
1. [List diagnostic steps performed]
2. [List attempted solutions]
3. [Current status]

DIAGNOSTIC INFO:
- Error Messages: [Exact error text]
- Log Entries: [Relevant log snippets]
- System State: [Resource usage, health checks]
- Recent Changes: [Deployments, config changes]

ESCALATION REASON:
[Why this requires escalation]

RECOMMENDED NEXT STEPS:
[Suggested actions for escalation team]

TIMELINE:
[Issue start → Discovery → Escalation times]
```

### Emergency Contact Procedures

#### Critical Issues (System Down)
1. **Immediate (0-5 minutes):**
   - Call on-call engineer: +1-XXX-XXX-XXXX
   - Send Slack alert: #asr-po-alerts
   - Begin emergency restart procedures

2. **Short-term (5-15 minutes):**
   - Email system administrator: admin@yourdomain.com
   - Execute emergency recovery if restart fails
   - Notify management if revenue impact

3. **Extended (15+ minutes):**
   - Escalate to IT Director: it-director@yourdomain.com
   - Contact ASR management: management@asr.com
   - Consider external support vendors

#### High Priority Issues
1. **Initial Response (0-30 minutes):**
   - Email system administrator
   - Post in #asr-po-support Slack channel
   - Begin diagnostic procedures

2. **Escalation (30-60 minutes):**
   - Email DevOps team if no resolution
   - Schedule emergency meeting if business critical
   - Document impact and timeline

#### Standard Issue Resolution
1. **Support Queue:**
   - Submit ticket to support system
   - Include diagnostic information
   - Set appropriate priority level

2. **Follow-up:**
   - Monitor progress via ticket system
   - Escalate if SLA thresholds exceeded
   - Document resolution for knowledge base

---

**For Immediate Emergency Support:**
📞 **Emergency Hotline:** +1-XXX-XXX-XXXX
📧 **Emergency Email:** emergency@yourdomain.com
💬 **Slack Channel:** #asr-po-alerts

**For Technical Support:**
📧 **Support Email:** support@yourdomain.com
💻 **Support Portal:** https://support.yourdomain.com
📖 **Knowledge Base:** https://docs.yourdomain.com

---

**End of Troubleshooting Guide**

*This guide provides comprehensive troubleshooting procedures for the ASR Purchase Order System. For additional support or to report issues with this guide, contact the system administration team.*