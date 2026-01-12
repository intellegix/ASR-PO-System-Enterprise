# ASR Purchase Order System - Operations Guide

**Document Version:** 1.0.0
**Last Updated:** 2026-01-12
**Prepared By:** ASR DevOps Team
**Review Cycle:** Quarterly

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Environment Management](#environment-management)
3. [Deployment Operations](#deployment-operations)
4. [QuickBooks Integration Management](#quickbooks-integration-management)
5. [Database Operations](#database-operations)
6. [Cache Management](#cache-management)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Security Operations](#security-operations)
9. [Backup & Recovery](#backup--recovery)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting Procedures](#troubleshooting-procedures)
12. [Emergency Procedures](#emergency-procedures)
13. [Appendices](#appendices)

---

## System Architecture Overview

### High-Level Architecture

The ASR Purchase Order System is an enterprise-grade business intelligence platform built with modern web technologies:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Load Balancer │    │  Application    │
│                 │───▶│    (Nginx)      │───▶│   Server        │
│ - Web Browser   │    │                 │    │  (Next.js)      │
│ - Mobile PWA    │    └─────────────────┘    └─────────────────┘
└─────────────────┘                                      │
                                                         │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │   PostgreSQL    │    │   QuickBooks    │
│                 │◀───│    Database     │◀───│      API        │
│ - Session Store │    │                 │    │                 │
│ - App Cache     │    │ - Business Data │    │ - GL Accounts   │
└─────────────────┘    │ - Audit Trail   │    │ - Sync Data     │
                       └─────────────────┘    └─────────────────┘
```

### Component Relationships

**Application Flow:**
1. **User Interface** → Next.js 15 React application with TypeScript
2. **API Layer** → RESTful API routes with authentication middleware
3. **Business Logic** → Service layer with role-based access control
4. **Data Persistence** → PostgreSQL with Prisma ORM
5. **Caching Layer** → Redis with in-memory fallback
6. **External Integration** → QuickBooks OAuth 2.0 API
7. **Audit System** → Comprehensive tracking in po_approvals table

### Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend** | Next.js | 15.x | React-based UI framework |
| **Backend** | Node.js | 18+ | JavaScript runtime |
| **Database** | PostgreSQL | 14+ | Primary data store |
| **Cache** | Redis | 6+ | Session and application cache |
| **ORM** | Prisma | Latest | Database abstraction |
| **Authentication** | NextAuth.js | Latest | OAuth and session management |
| **Deployment** | Docker | Latest | Containerization |
| **Monitoring** | UptimeRobot | Free | Uptime monitoring |
| **CI/CD** | GitHub Actions | Latest | Automated deployment |

### User Roles Matrix

| Role | Code | Permissions | Primary Functions |
|------|------|-------------|-------------------|
| **Majority Owner** | MAJORITY_OWNER | Full system access | System administration, cross-division oversight |
| **Division Leader** | DIVISION_LEADER | Division-scoped | PO creation, team management, reporting |
| **Operations Manager** | OPERATIONS_MANAGER | Cross-division operations | PO approval, vendor management, workflow oversight |
| **Accounting** | ACCOUNTING | Financial oversight | QuickBooks integration, GL management, financial reporting |

---

## Environment Management

### Production vs Development Environments

| Aspect | Development | Staging | Production |
|--------|-------------|---------|------------|
| **Database** | Local PostgreSQL | Hosted DB (smaller) | Enterprise PostgreSQL |
| **Redis** | Local/Optional | Hosted Redis | Production Redis cluster |
| **Domain** | localhost:3000 | staging.asr-po.com | asr-po.yourdomain.com |
| **SSL** | Self-signed | Let's Encrypt | Commercial SSL |
| **QuickBooks** | Sandbox | Sandbox | Production |
| **Monitoring** | Disabled | Basic | Full monitoring |
| **Backups** | Manual | Daily | Automated daily + weekly |
| **Logs** | Console | File-based | Centralized logging |

### Environment Variables Configuration

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration
REDIS_URL=redis://username:password@host:port
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password

# Application Configuration
NEXTAUTH_URL=https://asr-po.yourdomain.com
NEXTAUTH_SECRET=your-32-character-secret
NODE_ENV=production
LOG_LEVEL=info

# QuickBooks Integration
QB_CLIENT_ID=your-quickbooks-client-id
QB_CLIENT_SECRET=your-quickbooks-client-secret
QB_SANDBOX_BASE_URL=https://sandbox-quickbooks.api.intuit.com
QB_DISCOVERY_DOCUMENT=https://appcenter.intuit.com/.well-known/app_center/openid_connect

# Email Configuration
SMTP_HOST=smtp.yourmailprovider.com
SMTP_PORT=587
SMTP_USER=alerts@yourdomain.com
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Monitoring & Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url
MONITORING_WEBHOOK_URL=https://your-monitoring-system/webhook
WEBHOOK_AUTH_TOKEN=your-webhook-auth-token

# Security
CORS_ORIGIN=https://asr-po.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
JWT_SECRET=your-jwt-secret-min-32-chars

# Backup Configuration
BACKUP_S3_ENABLED=true
BACKUP_S3_BUCKET=asr-po-backups
BACKUP_S3_REGION=us-west-2
BACKUP_RETENTION_DAYS=30
```

#### Environment Variable Validation

```bash
# Verify critical environment variables
echo "Checking environment variables..."

# Database connectivity
if pg_isready -d "$DATABASE_URL"; then
    echo "✓ Database connection valid"
else
    echo "✗ Database connection failed"
fi

# Redis connectivity
if redis-cli -u "$REDIS_URL" ping; then
    echo "✓ Redis connection valid"
else
    echo "✗ Redis connection failed"
fi

# QuickBooks configuration
if [[ -n "$QB_CLIENT_ID" && -n "$QB_CLIENT_SECRET" ]]; then
    echo "✓ QuickBooks credentials configured"
else
    echo "✗ QuickBooks credentials missing"
fi
```

### Database Connection Management

#### Connection Pool Configuration

```javascript
// Database connection settings
const databaseConfig = {
  connectionLimit: 20,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
};
```

#### Connection Health Monitoring

```bash
# Monitor database connections
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity
WHERE datname = 'asr_po_production';

# Check for long-running queries
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

---

## Deployment Operations

### Standard Deployment Procedures

#### Docker-Based Deployment (Recommended)

**Step 1: Pre-deployment Checklist**
```bash
# Verify environment
echo "Pre-deployment verification..."

# Check Git branch and commits
git status
git log -1 --oneline

# Verify environment variables
source /etc/environment
env | grep -E "(DATABASE_URL|REDIS_URL|QB_CLIENT_ID)" | wc -l

# Test database connectivity
pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT"

# Verify Redis connectivity
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping

# Check disk space (require 2GB free)
df -h | grep "/$" | awk '{if($5 > 90) print "WARNING: Low disk space"}'
```

**Step 2: Application Deployment**
```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

echo "Starting ASR PO System deployment..."

# Pull latest code
git pull origin main

# Build new Docker image
docker build -f deployment/Dockerfile.production -t asr-po-system:latest ./web

# Stop current container gracefully
docker-compose -f docker-compose.prod.yml stop app

# Run database migrations
docker run --rm --network host asr-po-system:latest npm run db:migrate

# Start new container
docker-compose -f docker-compose.prod.yml up -d app

# Verify deployment
sleep 30
curl -f https://asr-po.yourdomain.com/api/health || echo "Health check failed"

echo "Deployment completed successfully"
```

**Step 3: Post-deployment Verification**
```bash
# Verify application is running
docker-compose -f docker-compose.prod.yml ps

# Check application logs
docker-compose -f docker-compose.prod.yml logs --tail=50 app

# Test critical endpoints
curl -f https://asr-po.yourdomain.com/api/health
curl -f https://asr-po.yourdomain.com/api/health/database
curl -f https://asr-po.yourdomain.com/api/health/cache

# Verify QuickBooks integration
curl -f https://asr-po.yourdomain.com/api/quickbooks/test-connection
```

#### Platform-as-a-Service Deployment

**Vercel Deployment**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
cd web
vercel --prod

# Configure environment variables via Vercel dashboard
# Import all variables from production environment
```

**Render Deployment**
```yaml
# render.yaml configuration
services:
  - type: web
    name: asr-po-system
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: asr-po-db
          property: connectionString

databases:
  - name: asr-po-db
    databaseName: asr_po_production
    postgresMajorVersion: 15
```

### Database Migration Procedures

#### Running Migrations
```bash
# Production migration process
cd web

# Backup database before migration
pg_dump "$DATABASE_URL" > "backup-pre-migration-$(date +%Y%m%d_%H%M%S).sql"

# Run Prisma migrations
npx prisma migrate deploy

# Verify migration success
npx prisma migrate status

# Update Prisma client
npx prisma generate

# Test database integrity
npm run db:verify
```

#### Migration Rollback Procedures
```bash
# Emergency rollback process
echo "WARNING: Database rollback is destructive - use with extreme caution"

# Stop application first
docker-compose -f docker-compose.prod.yml stop app

# Restore from backup
pg_restore --clean --if-exists \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
  -d asr_po_production \
  backup-pre-migration-YYYYMMDD_HHMMSS.sql

# Restart application
docker-compose -f docker-compose.prod.yml start app

# Verify rollback success
curl -f https://asr-po.yourdomain.com/api/health/database
```

### Emergency Rollback Procedures

#### Application Rollback (< 5 minutes)
```bash
#!/bin/bash
# emergency-rollback.sh

echo "EMERGENCY ROLLBACK - Starting immediate application rollback"

# Tag current image as problematic
docker tag asr-po-system:latest asr-po-system:problematic-$(date +%Y%m%d_%H%M%S)

# Restore previous image
docker tag asr-po-system:previous asr-po-system:latest

# Restart with previous version
docker-compose -f docker-compose.prod.yml restart app

# Verify rollback
sleep 30
curl -f https://asr-po.yourdomain.com/api/health

echo "Emergency rollback completed - investigate issues before next deployment"
```

#### Configuration Rollback
```bash
# Revert environment configuration
cp .env.production.backup .env.production

# Restart application with previous config
docker-compose -f docker-compose.prod.yml restart app

# Verify configuration rollback
docker exec -it asr-po-system env | grep NODE_ENV
```

---

## QuickBooks Integration Management

### OAuth Token Management

#### Token Lifecycle Overview
```
Initial Setup → Authorization → Token Acquisition → Automatic Refresh → Expiration Handling
     ↓               ↓               ↓                    ↓                   ↓
User consent → QB redirects → Store tokens → Background refresh → Re-authorization
```

#### Token Refresh Procedures
```bash
#!/bin/bash
# qb-token-refresh.sh - QuickBooks token refresh automation

# Check token expiration
curl -s https://asr-po.yourdomain.com/api/quickbooks/token-status | \
  jq '.expires_in' | \
  awk '{if($1 < 3600) print "WARNING: Token expires in less than 1 hour"}'

# Manual token refresh
curl -X POST https://asr-po.yourdomain.com/api/quickbooks/refresh-token

# Verify token is working
curl -f https://asr-po.yourdomain.com/api/quickbooks/test-connection
```

#### OAuth Error Handling
```bash
# Common OAuth error diagnostics
echo "QuickBooks OAuth Diagnostics"

# Test connectivity to QuickBooks
curl -I https://appcenter.intuit.com/.well-known/app_center/openid_connect

# Verify client credentials
if [[ -n "$QB_CLIENT_ID" ]]; then
    echo "✓ Client ID configured: ${QB_CLIENT_ID:0:8}..."
else
    echo "✗ Client ID missing"
fi

# Check token database entries
psql "$DATABASE_URL" -c "
SELECT
    id,
    company_id,
    created_at,
    expires_at,
    CASE
        WHEN expires_at > NOW() THEN 'Valid'
        ELSE 'Expired'
    END as status
FROM qb_auth_tokens
ORDER BY created_at DESC
LIMIT 5;"
```

### Sync Schedule and Manual Trigger Process

#### Automated Sync Schedule
```javascript
// Sync schedule configuration
const syncSchedule = {
  dailySync: '0 2 * * *',        // 2:00 AM daily
  weeklyDeepSync: '0 3 * * 0',   // 3:00 AM Sunday
  monthlyReconciliation: '0 4 1 * *', // 4:00 AM 1st of month
  realTimeThreshold: 15          // 15 minutes for urgent syncs
};

// Sync monitoring
const syncMetrics = {
  successRate: 99.5,             // Target 99.5% success
  averageDuration: '45s',        // Target under 60 seconds
  errorThreshold: 3,             // Alert after 3 consecutive failures
  dataVolumeLimit: 10000         // Max records per sync batch
};
```

#### Manual Sync Procedures
```bash
# Manual sync trigger procedures

# Check sync status
curl https://asr-po.yourdomain.com/api/quickbooks/sync-status

# Trigger immediate sync
curl -X POST https://asr-po.yourdomain.com/api/quickbooks/sync-now \
  -H "Content-Type: application/json" \
  -d '{"force": true, "scope": "all"}'

# Monitor sync progress
tail -f /var/log/asr-po-system/sync.log | grep "SYNC_PROGRESS"

# Verify sync completion
curl https://asr-po.yourdomain.com/api/quickbooks/last-sync-summary
```

#### Sync Troubleshooting
```bash
# Sync failure diagnostics
echo "QuickBooks Sync Diagnostics"

# Check recent sync attempts
psql "$DATABASE_URL" -c "
SELECT
    sync_date,
    status,
    records_processed,
    error_message,
    duration_seconds
FROM sync_audit_log
ORDER BY sync_date DESC
LIMIT 10;"

# Verify data consistency
npm run verify:qb-data-integrity

# Test individual components
curl -f https://asr-po.yourdomain.com/api/quickbooks/test/vendors
curl -f https://asr-po.yourdomain.com/api/quickbooks/test/gl-accounts
curl -f https://asr-po.yourdomain.com/api/quickbooks/test/purchase-orders
```

### API Rate Limiting Management

#### Rate Limit Monitoring
```bash
# Monitor API rate limit usage
curl -s https://asr-po.yourdomain.com/api/quickbooks/rate-limit-status | \
  jq '.remaining' | \
  awk '{if($1 < 100) print "WARNING: Low API rate limit remaining: " $1}'

# Rate limit configuration
echo "Current rate limits:"
echo "- QuickBooks API: 3600 requests/hour"
echo "- Batch operations: 250 requests/5 minutes"
echo "- Discovery API: 100 requests/minute"
```

#### Rate Limit Recovery Procedures
```bash
# Handle rate limit exceeded scenarios
if [ "$(curl -s -o /dev/null -w '%{http_code}' https://asr-po.yourdomain.com/api/quickbooks/test-connection)" == "429" ]; then
    echo "Rate limit exceeded - implementing recovery procedures"

    # Calculate reset time
    reset_time=$(curl -s -I https://asr-po.yourdomain.com/api/quickbooks/test-connection | \
      grep -i 'x-ratelimit-reset' | awk '{print $2}')

    echo "Rate limit resets at: $reset_time"

    # Queue pending operations
    curl -X POST https://asr-po.yourdomain.com/api/quickbooks/queue-operations

    # Schedule retry
    echo "Operations queued for retry after rate limit reset"
fi
```

---

## Database Operations

### Daily Maintenance Tasks

#### Routine Database Maintenance
```bash
#!/bin/bash
# daily-db-maintenance.sh

echo "Starting daily database maintenance - $(date)"

# Update table statistics
psql "$DATABASE_URL" -c "ANALYZE;"

# Check for bloated tables
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_stat_get_tuples_inserted(c.oid) as n_tup_ins,
    pg_stat_get_tuples_updated(c.oid) as n_tup_upd,
    pg_stat_get_tuples_deleted(c.oid) as n_tup_del
FROM pg_tables pt
JOIN pg_class c ON c.relname = pt.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"

# Vacuum analyze critical tables
psql "$DATABASE_URL" -c "VACUUM ANALYZE po_headers;"
psql "$DATABASE_URL" -c "VACUUM ANALYZE po_approvals;"
psql "$DATABASE_URL" -c "VACUUM ANALYZE vendors;"

# Check index usage
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    indexrelname as index_name,
    relname as table_name,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public';"

echo "Daily maintenance completed - $(date)"
```

#### Performance Monitoring Queries
```sql
-- Active connections monitoring
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database();

-- Top 10 slowest queries (last 24 hours)
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Table sizes and growth
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index effectiveness
SELECT
    t.schemaname,
    t.tablename,
    indexname,
    c.reltuples AS num_rows,
    pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(t.tablename))) AS table_size,
    pg_size_pretty(pg_relation_size(quote_ident(t.schemaname)||'.'||quote_ident(indexrelname))) AS index_size,
    CASE WHEN indisunique THEN 'Y' ELSE 'N' END AS UNIQUE,
    idx_scan as number_of_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_tables t
LEFT OUTER JOIN pg_class c ON c.relname=t.tablename
LEFT OUTER JOIN (
    SELECT
        c.relname AS ctablename,
        ipg.relname AS indexname,
        x.indnatts AS number_of_columns,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        indexrelname,
        indisunique
    FROM pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class ipg ON ipg.oid = x.indexrelid
    JOIN pg_stat_all_indexes psai ON x.indexrelid = psai.indexrelid
) AS foo ON t.tablename = foo.ctablename
WHERE t.schemaname='public'
ORDER BY 1,2;
```

### Database Backup Procedures

#### Automated Backup System
```bash
# The backup-automation.sh script provides comprehensive backup automation
# Key features:
# - Daily automated backups at 2:00 AM
# - Parallel compression for performance
# - S3 upload integration
# - Verification and integrity checking
# - 30-day retention policy
# - Slack/email notifications

# Backup verification
tail -20 /var/backups/asr-po-system/backup.log

# Manual backup trigger
sudo /usr/local/bin/asr-backup

# Verify backup integrity
ls -la /var/backups/asr-po-system/ | tail -10

# Test restore procedure (CAUTION: Use test database only)
# pg_restore --list backup_file.sql.gz | head -20
```

#### Backup Monitoring
```bash
# Check backup status
echo "Backup System Status Report"
echo "=========================="

# Latest backup info
latest_backup=$(ls -t /var/backups/asr-po-system/asr-po-backup_*.sql.gz | head -1)
if [ -n "$latest_backup" ]; then
    echo "Latest backup: $(basename $latest_backup)"
    echo "Size: $(du -h $latest_backup | cut -f1)"
    echo "Date: $(stat -c %y $latest_backup)"
else
    echo "ERROR: No backup files found"
fi

# Backup storage usage
df -h /var/backups/asr-po-system/

# S3 backup status (if enabled)
if [ "$BACKUP_S3_ENABLED" = "true" ]; then
    aws s3 ls s3://$BACKUP_S3_BUCKET/asr-po-backups/ --human-readable --summarize
fi
```

#### Database Recovery Procedures
```bash
#!/bin/bash
# database-restore.sh - Database recovery procedures

echo "WARNING: Database restore is destructive - ensure you have authorization"
read -p "Enter 'CONFIRM RESTORE' to proceed: " confirmation

if [ "$confirmation" != "CONFIRM RESTORE" ]; then
    echo "Restore cancelled"
    exit 1
fi

# Stop application
docker-compose -f docker-compose.prod.yml stop app

# Create pre-restore backup
pg_dump "$DATABASE_URL" > "emergency-backup-$(date +%Y%m%d_%H%M%S).sql"

# Select backup file to restore
echo "Available backup files:"
ls -t /var/backups/asr-po-system/asr-po-backup_*.sql.gz | head -10

read -p "Enter backup filename to restore: " backup_file

# Verify backup file exists and is readable
if [ ! -f "/var/backups/asr-po-system/$backup_file" ]; then
    echo "ERROR: Backup file not found"
    exit 1
fi

# Restore database
echo "Starting restore process..."
pg_restore --clean --if-exists \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" \
    "/var/backups/asr-po-system/$backup_file"

# Restart application
docker-compose -f docker-compose.prod.yml start app

# Verify restore success
sleep 30
curl -f https://asr-po.yourdomain.com/api/health/database

echo "Database restore completed"
```

---

## Cache Management

### Redis Production Configuration

The Redis configuration optimizes for the ASR PO System's caching patterns:

```bash
# Redis production settings (redis-production-config.conf)
port 6379
bind 0.0.0.0
requirepass "your-secure-redis-password"

# Memory optimization for caching workload
maxmemory 512mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence for reliability
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Performance tuning
tcp-keepalive 300
timeout 300
slowlog-log-slower-than 10000
maxclients 1000

# Security hardening
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
```

### Cache Performance Monitoring

#### Cache Health Checks
```bash
# Redis connectivity and performance
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping

# Cache hit rate monitoring
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info stats | \
  grep -E "(keyspace_hits|keyspace_misses)"

# Memory usage
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info memory | \
  grep -E "(used_memory_human|used_memory_peak_human)"

# Application cache metrics
curl -s https://asr-po.yourdomain.com/api/monitoring/cache-metrics
```

#### Cache Performance Optimization
```javascript
// Cache optimization strategies implemented in redis-production-adapter.ts

// Hit rate optimization targets:
const cacheTargets = {
  divisionKPIs: 85,      // 85% hit rate target
  crossDivisionKPIs: 90, // 90% hit rate target
  pendingApprovals: 70,  // 70% hit rate target
  quickKPIs: 95          // 95% hit rate target
};

// TTL optimization:
const cacheTTL = {
  KPI_QUICK: 2 * 60 * 1000,        // 2 minutes - frequently changing
  KPI_STANDARD: 10 * 60 * 1000,    // 10 minutes - standard metrics
  DIVISION_DATA: 30 * 60 * 1000,   // 30 minutes - division-specific
  CROSS_DIVISION: 60 * 60 * 1000,  // 1 hour - cross-division aggregates
  PENDING_APPROVALS: 5 * 60 * 1000 // 5 minutes - approval workflow
};
```

### Cache Invalidation Procedures

#### Smart Cache Invalidation
```bash
# Monitor cache invalidation effectiveness
curl -s https://asr-po.yourdomain.com/api/monitoring/cache-invalidation-log | \
  jq '.recent_invalidations[] | select(.timestamp > (now - 3600))'

# Manual cache invalidation procedures
echo "Cache invalidation options:"
echo "1. Invalidate division-specific caches"
echo "2. Invalidate cross-division caches"
echo "3. Invalidate pending approvals"
echo "4. Full cache flush (emergency only)"

# Division-specific invalidation
curl -X POST https://asr-po.yourdomain.com/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"type": "division-kpis", "divisionId": "target-division-id"}'

# Cross-division invalidation
curl -X POST https://asr-po.yourdomain.com/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"type": "cross-division-kpis"}'

# Approval workflow invalidation
curl -X POST https://asr-po.yourdomain.com/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"type": "pending-approvals"}'
```

#### Fallback Cache Testing
```bash
# Test fallback cache functionality
echo "Testing cache fallback mechanisms..."

# Simulate Redis unavailability
sudo systemctl stop redis-server

# Verify application continues operating
curl -f https://asr-po.yourdomain.com/api/health/cache

# Check fallback cache metrics
curl -s https://asr-po.yourdomain.com/api/monitoring/cache-metrics | \
  jq '.fallbackUsed'

# Restore Redis and verify recovery
sudo systemctl start redis-server
sleep 10
curl -f https://asr-po.yourdomain.com/api/health/cache
```

---

## Monitoring & Alerting

### Health Check Monitoring

The ASR PO System implements comprehensive health monitoring across multiple layers:

#### Primary Health Endpoints
```bash
# Application health check
curl https://asr-po.yourdomain.com/api/health
# Expected: {"status":"healthy","database":"connected","timestamp":"..."}

# Database health check
curl https://asr-po.yourdomain.com/api/health/database
# Expected: {"status":"healthy","connection":true,"queryTime":"<50ms"}

# Cache health check
curl https://asr-po.yourdomain.com/api/health/cache
# Expected: {"status":"healthy","redis":true,"fallback":true}

# Integration health check
curl https://asr-po.yourdomain.com/api/health/integrations
# Expected: {"quickbooks":"connected","email":"configured","status":"healthy"}

# Performance metrics
curl https://asr-po.yourdomain.com/api/monitoring/performance
# Expected: {"responseTime":"<500ms","errorRate":"<1%","uptime":"99.9%"}
```

#### Health Check Automation
```bash
#!/bin/bash
# health-check-monitor.sh - Automated health monitoring

echo "ASR PO System Health Check - $(date)"
echo "=================================="

# Function to check endpoint with timeout
check_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}

    response=$(curl -s -w "\n%{http_code}" --max-time 10 "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "$expected_status" ]; then
        echo "✓ $name: Healthy"
        return 0
    else
        echo "✗ $name: Failed (HTTP $http_code)"
        echo "  Response: $body"
        return 1
    fi
}

# Run health checks
failed_checks=0

check_endpoint "https://asr-po.yourdomain.com/api/health" "Application" || ((failed_checks++))
check_endpoint "https://asr-po.yourdomain.com/api/health/database" "Database" || ((failed_checks++))
check_endpoint "https://asr-po.yourdomain.com/api/health/cache" "Cache" || ((failed_checks++))
check_endpoint "https://asr-po.yourdomain.com/api/health/integrations" "Integrations" || ((failed_checks++))

# Overall health assessment
echo "=================================="
if [ $failed_checks -eq 0 ]; then
    echo "Overall Status: ✓ HEALTHY"
    exit 0
else
    echo "Overall Status: ✗ UNHEALTHY ($failed_checks failed checks)"
    exit 1
fi
```

### Performance Monitoring

#### Key Performance Indicators
```bash
# Monitor performance targets from Phase 4C testing:
echo "Performance Targets:"
echo "- Dashboard load: < 2 seconds"
echo "- API response: < 500ms (95th percentile)"
echo "- Report generation: < 10 seconds"
echo "- Error rate: < 1%"
echo "- Uptime: 99.9%"

# Real-time performance check
curl -s https://asr-po.yourdomain.com/api/monitoring/performance | jq '{
    dashboardLoadTime: .metrics.dashboardLoadTime,
    apiResponseTime95th: .metrics.apiResponseTime95th,
    reportGenerationTime: .metrics.reportGenerationTime,
    errorRate: .metrics.errorRate,
    uptime: .metrics.uptime
}'
```

#### Performance Alert Thresholds
```yaml
# Performance monitoring thresholds (from monitoring-alerting-config.yml)
performance_monitoring:
  targets:
    dashboard_response_time: 2000    # 2 seconds
    api_response_time: 500          # 500ms
    report_generation_time: 10000   # 10 seconds
    error_rate: 1.0                 # 1%
    uptime: 99.9                    # 99.9%

  metrics:
    - name: "Response Time Monitoring"
      interval: 300
      thresholds:
        warning: 1500   # 1.5s
        critical: 3000  # 3s

    - name: "Error Rate Monitoring"
      interval: 600
      thresholds:
        warning: 0.5   # 0.5%
        critical: 2.0  # 2%
```

### Business Metrics Monitoring

#### KPI Monitoring Dashboard
```bash
# Business KPI monitoring endpoints
curl -s https://asr-po.yourdomain.com/api/monitoring/business-kpis | jq '{
    dailyActiveUsers: .metrics.dailyActiveUsers,
    poCreationRate: .metrics.poCreationRate,
    approvalProcessingTime: .metrics.approvalProcessingTime,
    reportGenerationFrequency: .metrics.reportGenerationFrequency,
    quickbooksSyncSuccessRate: .metrics.quickbooksSyncSuccessRate
}'

# Division-specific monitoring
curl -s https://asr-po.yourdomain.com/api/monitoring/division-metrics?division=all | \
  jq '.divisions[] | {division: .code, activePos: .activePos, pendingApprovals: .pendingApprovals}'
```

### Alert Response Procedures

#### Critical Alert Escalation Matrix
```
Level 1 (0 minutes):    Slack notification to #asr-po-alerts
Level 2 (5 minutes):    Email to dev-team@yourdomain.com + Slack @channel mention
Level 3 (15 minutes):   SMS to on-call engineer + Email to admin@yourdomain.com
Level 4 (30 minutes):   Escalate to management + Consider rollback procedures
```

#### Alert Handling Procedures
```bash
#!/bin/bash
# alert-response.sh - Structured alert response procedures

alert_type=$1
severity=$2

case $alert_type in
    "application_down")
        echo "CRITICAL: Application is down"
        echo "1. Check application logs"
        echo "2. Verify infrastructure status"
        echo "3. Consider emergency rollback"

        # Immediate diagnostics
        docker-compose -f docker-compose.prod.yml ps
        curl -I https://asr-po.yourdomain.com/api/health
        ;;

    "database_connection_failed")
        echo "CRITICAL: Database connection failed"
        echo "1. Check database connectivity"
        echo "2. Verify database service status"
        echo "3. Check connection pool exhaustion"

        # Database diagnostics
        pg_isready -h "$DB_HOST" -p "$DB_PORT"
        psql "$DATABASE_URL" -c "SELECT 1;"
        ;;

    "high_error_rate")
        echo "WARNING: High error rate detected"
        echo "1. Check error logs for patterns"
        echo "2. Identify failing endpoints"
        echo "3. Monitor for escalation"

        # Error analysis
        tail -100 /var/log/asr-po-system/error.log | grep ERROR
        ;;

    "slow_response_time")
        echo "WARNING: Slow response times"
        echo "1. Check database performance"
        echo "2. Verify cache hit rates"
        echo "3. Monitor resource usage"

        # Performance diagnostics
        curl -s https://asr-po.yourdomain.com/api/monitoring/performance
        ;;
esac
```

### Uptime Monitoring Configuration

#### UptimeRobot Setup
```bash
# UptimeRobot monitoring configuration
echo "Configuring uptime monitoring..."

# Monitors configured:
monitors=(
    "ASR PO System - Main Application|https://asr-po.yourdomain.com|HEAD|300"
    "ASR PO System - Health Check|https://asr-po.yourdomain.com/api/health|GET|300"
    "ASR PO System - Database Health|https://asr-po.yourdomain.com/api/health/database|GET|600"
    "ASR PO System - Cache Health|https://asr-po.yourdomain.com/api/health/cache|GET|600"
    "ASR PO System - QuickBooks Integration|https://asr-po.yourdomain.com/api/health/quickbooks|GET|1800"
)

# Maintenance windows:
# - Weekly maintenance: Sunday 02:00-04:00 PST
# - Monthly maintenance: First Sunday 01:00-04:00 PST

echo "Uptime monitors configured with 5-minute intervals"
echo "Alert contacts: email, slack, webhook"
```

---

## Security Operations

### Access Control Management

#### Role-Based Access Control Verification
```bash
#!/bin/bash
# rbac-verification.sh - Verify role-based access controls

echo "RBAC Verification Report - $(date)"
echo "================================"

# Check user role distribution
psql "$DATABASE_URL" -c "
SELECT
    role,
    COUNT(*) as user_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM users
WHERE is_active = true
GROUP BY role
ORDER BY user_count DESC;"

# Verify division leader assignments
psql "$DATABASE_URL" -c "
SELECT
    dl.name,
    dl.email,
    dl.division_code,
    d.division_name,
    dl.approval_limit,
    dl.is_active
FROM division_leaders dl
JOIN divisions d ON dl.division_id = d.id
ORDER BY dl.division_code;"

# Check for orphaned permissions
psql "$DATABASE_URL" -c "
SELECT
    u.email,
    u.role,
    u.division_id,
    d.division_name
FROM users u
LEFT JOIN divisions d ON u.division_id = d.id
WHERE u.is_active = true
AND (u.division_id IS NULL OR d.id IS NULL);"
```

#### Permission Audit Procedures
```bash
# Monthly permission audit
echo "Monthly Security Audit - $(date)"

# 1. Review user access
psql "$DATABASE_URL" -c "
SELECT
    u.email,
    u.role,
    u.last_login,
    CASE
        WHEN u.last_login < NOW() - INTERVAL '90 days' THEN 'Inactive User'
        WHEN u.last_login < NOW() - INTERVAL '30 days' THEN 'Low Activity'
        ELSE 'Active'
    END as activity_status
FROM users u
WHERE u.is_active = true
ORDER BY u.last_login DESC;"

# 2. Review approval limits
psql "$DATABASE_URL" -c "
SELECT
    dl.name,
    dl.division_code,
    dl.approval_limit,
    COUNT(ph.id) as pos_created_last_30_days,
    AVG(ph.total_amount) as avg_po_amount
FROM division_leaders dl
LEFT JOIN po_headers ph ON dl.id = ph.division_leader_id
    AND ph.created_at > NOW() - INTERVAL '30 days'
GROUP BY dl.id, dl.name, dl.division_code, dl.approval_limit
ORDER BY dl.approval_limit DESC;"

# 3. Check for unusual activity patterns
psql "$DATABASE_URL" -c "
SELECT
    pa.action,
    pa.actor_user_id,
    u.email,
    COUNT(*) as action_count,
    DATE_TRUNC('day', pa.timestamp) as activity_date
FROM po_approvals pa
JOIN users u ON pa.actor_user_id = u.id
WHERE pa.timestamp > NOW() - INTERVAL '7 days'
GROUP BY pa.action, pa.actor_user_id, u.email, DATE_TRUNC('day', pa.timestamp)
HAVING COUNT(*) > 50  -- Flag high-activity users
ORDER BY action_count DESC;"
```

### Security Monitoring

#### Failed Login Monitoring
```bash
# Monitor authentication failures
echo "Security Monitoring - Authentication"

# Check failed login attempts (last 24 hours)
psql "$DATABASE_URL" -c "
SELECT
    email,
    ip_address,
    COUNT(*) as failed_attempts,
    MIN(timestamp) as first_attempt,
    MAX(timestamp) as last_attempt
FROM auth_audit_log
WHERE event_type = 'login_failed'
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY email, ip_address
HAVING COUNT(*) >= 5  -- Security threshold
ORDER BY failed_attempts DESC;"

# Check for suspicious IP addresses
psql "$DATABASE_URL" -c "
SELECT
    ip_address,
    COUNT(DISTINCT email) as unique_users_attempted,
    COUNT(*) as total_attempts,
    array_agg(DISTINCT email) as attempted_emails
FROM auth_audit_log
WHERE event_type = 'login_failed'
AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 10  -- Suspicious threshold
ORDER BY total_attempts DESC;"
```

#### Audit Trail Verification
```bash
# Comprehensive audit trail verification
echo "Audit Trail Integrity Check"

# Verify audit trail completeness
psql "$DATABASE_URL" -c "
SELECT
    DATE_TRUNC('hour', timestamp) as hour_bucket,
    action,
    COUNT(*) as action_count
FROM po_approvals
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), action
ORDER BY hour_bucket DESC, action_count DESC;"

# Check for audit trail gaps
psql "$DATABASE_URL" -c "
WITH hourly_buckets AS (
    SELECT generate_series(
        DATE_TRUNC('hour', NOW() - INTERVAL '24 hours'),
        DATE_TRUNC('hour', NOW()),
        INTERVAL '1 hour'
    ) as hour_bucket
),
audit_counts AS (
    SELECT
        DATE_TRUNC('hour', timestamp) as hour_bucket,
        COUNT(*) as audit_count
    FROM po_approvals
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', timestamp)
)
SELECT
    hb.hour_bucket,
    COALESCE(ac.audit_count, 0) as audit_events,
    CASE WHEN ac.audit_count IS NULL THEN 'NO AUDIT DATA' ELSE 'OK' END as status
FROM hourly_buckets hb
LEFT JOIN audit_counts ac ON hb.hour_bucket = ac.hour_bucket
ORDER BY hb.hour_bucket DESC;"

# Verify critical actions are audited
psql "$DATABASE_URL" -c "
SELECT
    action,
    COUNT(*) as occurrences,
    COUNT(DISTINCT actor_user_id) as unique_actors,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM po_approvals
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY occurrences DESC;"
```

### Incident Response Procedures

#### Security Incident Classification
```
SEVERITY 1 (Critical):     Unauthorized access to production data
SEVERITY 2 (High):         Suspicious activity patterns detected
SEVERITY 3 (Medium):       Failed login threshold exceeded
SEVERITY 4 (Low):          Policy violation or configuration drift
```

#### Incident Response Playbook
```bash
#!/bin/bash
# security-incident-response.sh

incident_type=$1
severity=$2

echo "SECURITY INCIDENT RESPONSE - Type: $incident_type, Severity: $severity"
echo "Timestamp: $(date)"
echo "=========================================="

case $incident_type in
    "unauthorized_access")
        echo "SEVERITY 1: Unauthorized access detected"
        echo "Immediate actions:"
        echo "1. Isolate affected systems"
        echo "2. Preserve audit logs"
        echo "3. Notify security team immediately"
        echo "4. Begin forensic analysis"

        # Preserve current state
        cp /var/log/asr-po-system/audit.log "/tmp/incident-$(date +%Y%m%d_%H%M%S)-audit.log"

        # Lock down access (emergency procedure)
        echo "Emergency access lockdown initiated"
        ;;

    "suspicious_activity")
        echo "SEVERITY 2: Suspicious activity detected"
        echo "Investigation actions:"
        echo "1. Analyze activity patterns"
        echo "2. Check for privilege escalation"
        echo "3. Monitor for continued activity"
        echo "4. Document findings"

        # Enhanced monitoring
        tail -f /var/log/asr-po-system/auth.log | grep -E "(FAILED|SUSPICIOUS)" &
        ;;

    "failed_login_threshold")
        echo "SEVERITY 3: Failed login threshold exceeded"
        echo "Response actions:"
        echo "1. Block suspicious IP addresses"
        echo "2. Notify affected users"
        echo "3. Review authentication logs"
        echo "4. Consider rate limiting adjustments"

        # Automatic IP blocking for severe cases
        suspicious_ips=$(psql "$DATABASE_URL" -t -c "
            SELECT DISTINCT ip_address
            FROM auth_audit_log
            WHERE event_type = 'login_failed'
            AND timestamp > NOW() - INTERVAL '1 hour'
            GROUP BY ip_address
            HAVING COUNT(*) > 20;")

        if [ -n "$suspicious_ips" ]; then
            echo "Blocking suspicious IPs: $suspicious_ips"
            # Implement IP blocking logic here
        fi
        ;;
esac

echo "=========================================="
echo "Incident response initiated at $(date)"
echo "Log preserved for investigation"
```

---

## Backup & Recovery

The ASR PO System implements enterprise-grade backup and recovery procedures using the automated backup system (`backup-automation.sh`).

### Backup System Overview

#### Backup Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Local Backup  │    │   S3 Storage    │
│    Database     │───▶│    Storage      │───▶│   (Optional)    │
│                 │    │                 │    │                 │
│ - PostgreSQL    │    │ - Compressed    │    │ - Geographic    │
│ - Live Data     │    │ - Verified      │    │   Redundancy    │
│ - Audit Trail   │    │ - Retention     │    │ - Long-term     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   Daily Operations      30-day Retention       Archive Storage
```

#### Backup Schedule
```bash
# Automated backup schedule (configured in crontab)
0 2 * * * /usr/local/bin/asr-backup          # Daily at 2:00 AM
0 1 * * 0 /usr/local/bin/asr-backup-weekly   # Weekly full backup
0 4 1 * * /usr/local/bin/asr-backup-monthly  # Monthly archive

# Backup retention policy:
# - Daily backups: 30 days
# - Weekly backups: 12 weeks
# - Monthly backups: 12 months
# - Annual backups: 7 years (compliance)
```

### Backup Procedures

#### Manual Backup Execution
```bash
# Manual backup trigger
sudo /usr/local/bin/asr-backup

# Backup with specific options
sudo BACKUP_PARALLEL_JOBS=4 /usr/local/bin/asr-backup

# Emergency backup (before major changes)
sudo BACKUP_PREFIX="emergency-pre-deployment" /usr/local/bin/asr-backup

# Verify backup completion
tail -20 /var/backups/asr-po-system/backup.log
ls -la /var/backups/asr-po-system/ | grep "$(date +%Y%m%d)"
```

#### Backup Verification
```bash
#!/bin/bash
# backup-verification.sh - Verify backup integrity

echo "Backup Verification Report - $(date)"
echo "====================================="

# Check recent backups
recent_backups=$(find /var/backups/asr-po-system -name "asr-po-backup_*.sql.gz" -mtime -1)

if [ -z "$recent_backups" ]; then
    echo "❌ ERROR: No backups found from last 24 hours"
    exit 1
fi

for backup in $recent_backups; do
    echo "Verifying: $(basename $backup)"

    # Test file integrity
    if gzip -t "$backup"; then
        echo "  ✓ File integrity: PASSED"
    else
        echo "  ❌ File integrity: FAILED"
        continue
    fi

    # Check file size (should be > 1MB for real data)
    size=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup")
    if [ $size -gt 1048576 ]; then
        echo "  ✓ File size: $(numfmt --to=iec $size)"
    else
        echo "  ⚠️  File size: $(numfmt --to=iec $size) (unusually small)"
    fi

    # Verify backup content structure
    if pg_restore --list "$backup" | head -5 | grep -q "TABLE"; then
        echo "  ✓ Database structure: VALID"
    else
        echo "  ❌ Database structure: INVALID"
    fi

    echo "  Backup Date: $(stat -f%Sm -t%Y-%m-%d\ %H:%M:%S "$backup" 2>/dev/null || stat -c%y "$backup")"
    echo ""
done

# Check S3 backups (if enabled)
if [ "$BACKUP_S3_ENABLED" = "true" ]; then
    echo "S3 Backup Status:"
    aws s3 ls s3://$BACKUP_S3_BUCKET/asr-po-backups/ --human-readable | tail -5
fi

echo "Backup verification completed"
```

### Recovery Procedures

#### Point-in-Time Recovery
```bash
#!/bin/bash
# point-in-time-recovery.sh - Database point-in-time recovery

recovery_target_time=$1

if [ -z "$recovery_target_time" ]; then
    echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
    echo "Example: $0 '2024-01-12 14:30:00'"
    exit 1
fi

echo "POINT-IN-TIME RECOVERY"
echo "Target time: $recovery_target_time"
echo "WARNING: This will replace the current database"
read -p "Type 'PROCEED WITH RECOVERY' to continue: " confirm

if [ "$confirm" != "PROCEED WITH RECOVERY" ]; then
    echo "Recovery cancelled"
    exit 1
fi

# Find appropriate backup file
backup_date=$(date -d "$recovery_target_time" +%Y%m%d)
backup_file=$(ls /var/backups/asr-po-system/asr-po-backup_${backup_date}*.sql.gz | head -1)

if [ -z "$backup_file" ]; then
    echo "ERROR: No backup found for date $backup_date"
    exit 1
fi

echo "Using backup file: $backup_file"

# Stop application
echo "Stopping application..."
docker-compose -f docker-compose.prod.yml stop app

# Create emergency backup of current state
echo "Creating emergency backup of current state..."
pg_dump "$DATABASE_URL" | gzip > "/var/backups/asr-po-system/emergency-pre-recovery-$(date +%Y%m%d_%H%M%S).sql.gz"

# Restore from backup
echo "Restoring database from backup..."
pg_restore --clean --if-exists \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" \
    "$backup_file"

# Restart application
echo "Restarting application..."
docker-compose -f docker-compose.prod.yml start app

# Wait for application startup
echo "Waiting for application to start..."
sleep 30

# Verify recovery
if curl -f https://asr-po.yourdomain.com/api/health/database; then
    echo "✓ Recovery completed successfully"
    echo "Database restored to approximately: $recovery_target_time"
else
    echo "❌ Recovery verification failed"
    echo "Check application logs immediately"
fi
```

#### Disaster Recovery Procedures
```bash
#!/bin/bash
# disaster-recovery.sh - Complete system disaster recovery

echo "DISASTER RECOVERY PROCEDURE"
echo "=========================="
echo "This procedure rebuilds the entire system from backups"
echo "Use only in case of complete system failure"
read -p "Type 'INITIATE DISASTER RECOVERY' to proceed: " confirm

if [ "$confirm" != "INITIATE DISASTER RECOVERY" ]; then
    echo "Disaster recovery cancelled"
    exit 1
fi

# 1. Restore infrastructure
echo "Step 1: Infrastructure restoration..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d postgres redis

# 2. Wait for database startup
echo "Step 2: Waiting for database startup..."
sleep 30
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT"; do
    echo "Waiting for database..."
    sleep 5
done

# 3. Restore latest backup
echo "Step 3: Database restoration..."
latest_backup=$(ls -t /var/backups/asr-po-system/asr-po-backup_*.sql.gz | head -1)
echo "Restoring from: $latest_backup"

pg_restore --clean --if-exists \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" \
    "$latest_backup"

# 4. Restore application
echo "Step 4: Application restoration..."
docker-compose -f docker-compose.prod.yml up -d app

# 5. Verify system recovery
echo "Step 5: System verification..."
sleep 60

# Check all health endpoints
endpoints=(
    "https://asr-po.yourdomain.com/api/health"
    "https://asr-po.yourdomain.com/api/health/database"
    "https://asr-po.yourdomain.com/api/health/cache"
    "https://asr-po.yourdomain.com/api/health/integrations"
)

failed_checks=0
for endpoint in "${endpoints[@]}"; do
    if curl -f "$endpoint" > /dev/null 2>&1; then
        echo "✓ $(basename $endpoint): OK"
    else
        echo "❌ $(basename $endpoint): FAILED"
        ((failed_checks++))
    fi
done

# 6. Recovery summary
echo "=========================="
echo "DISASTER RECOVERY SUMMARY"
echo "Failed health checks: $failed_checks"
echo "Database restored from: $(basename $latest_backup)"
echo "Recovery completed at: $(date)"

if [ $failed_checks -eq 0 ]; then
    echo "✓ System fully operational"

    # Notify team of successful recovery
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚀 ASR PO System disaster recovery completed successfully at $(date)\"}"
    fi
else
    echo "⚠️  System partially operational - manual intervention required"
fi
```

---

## Performance Optimization

### Database Performance Management

#### Performance Monitoring Queries
```sql
-- Database performance metrics
SELECT
    'Cache Hit Ratio' as metric,
    ROUND(
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2
    ) as value,
    '%' as unit
FROM pg_statio_user_tables;

-- Query performance analysis
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage efficiency
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE
        WHEN idx_scan > 0 THEN ROUND((idx_tup_fetch::numeric / idx_scan), 2)
        ELSE 0
    END as avg_tuples_per_scan
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY idx_scan DESC;

-- Connection pool monitoring
SELECT
    state,
    count(*) as connections,
    ROUND(
        count(*) * 100.0 / (SELECT count(*) FROM pg_stat_activity), 2
    ) as percentage
FROM pg_stat_activity
GROUP BY state;
```

#### Database Optimization Procedures
```bash
#!/bin/bash
# db-optimization.sh - Database performance optimization

echo "Database Performance Optimization - $(date)"
echo "==========================================="

# 1. Update table statistics
echo "Updating table statistics..."
psql "$DATABASE_URL" -c "ANALYZE;"

# 2. Create optimal indexes using DatabaseOptimizer
echo "Creating optimal indexes..."
node -e "
const { DatabaseOptimizer } = require('./web/src/lib/performance/database-optimization');
const optimizer = new DatabaseOptimizer();
optimizer.createOptimalIndexes().then(() => {
    console.log('Database optimization completed');
}).catch(console.error);
"

# 3. Check for bloated tables
echo "Checking for table bloat..."
psql "$DATABASE_URL" -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
AND pg_total_relation_size(schemaname||'.'||tablename) > 10485760  -- > 10MB
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# 4. Vacuum high-activity tables
echo "Vacuuming high-activity tables..."
high_activity_tables=(
    "po_headers"
    "po_approvals"
    "users"
    "vendors"
)

for table in "${high_activity_tables[@]}"; do
    echo "Vacuuming $table..."
    psql "$DATABASE_URL" -c "VACUUM ANALYZE $table;"
done

# 5. Check slow queries
echo "Recent slow queries (>1s):"
psql "$DATABASE_URL" -c "
SELECT
    ROUND(total_time::numeric, 2) as total_time_ms,
    calls,
    ROUND(mean_time::numeric, 2) as mean_time_ms,
    ROUND((100 * total_time / sum(total_time) OVER())::numeric, 2) as percentage,
    LEFT(query, 80) as query_preview
FROM pg_stat_statements
WHERE mean_time > 1000  -- > 1 second
ORDER BY mean_time DESC
LIMIT 10;"

echo "Database optimization completed"
```

### Application Performance Optimization

#### Performance Monitoring
```bash
# Application performance monitoring
curl -s https://asr-po.yourdomain.com/api/monitoring/performance | jq '{
    responseTime: .metrics.responseTime,
    errorRate: .metrics.errorRate,
    throughput: .metrics.throughput,
    activeUsers: .metrics.activeUsers,
    cacheHitRate: .metrics.cacheHitRate
}'

# Memory usage monitoring
docker stats asr-po-system --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Application error tracking
tail -100 /var/log/asr-po-system/error.log | \
    grep "$(date +%Y-%m-%d)" | \
    awk '{print $4}' | \
    sort | uniq -c | sort -rn
```

#### Cache Performance Optimization
```bash
#!/bin/bash
# cache-optimization.sh - Cache performance optimization

echo "Cache Performance Optimization - $(date)"
echo "======================================="

# Check Redis memory usage
redis_memory=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info memory | grep used_memory_human)
echo "Current Redis memory: $redis_memory"

# Analyze cache hit rates
echo "Cache hit rate analysis:"
curl -s https://asr-po.yourdomain.com/api/monitoring/cache-metrics | jq '{
    hitRate: .hitRate,
    fallbackRate: .fallbackRate,
    redisConnected: .redisConnected,
    totalRequests: (.hits + .misses)
}'

# Cache warming for critical data
echo "Warming critical cache entries..."
critical_divisions=("CH" "PW" "WS" "LS")  # Main ASR divisions

for division in "${critical_divisions[@]}"; do
    echo "Warming cache for division: $division"
    curl -s "https://asr-po.yourdomain.com/api/dashboards/division?division=$division" > /dev/null
    sleep 1
done

# Cross-division cache warming
echo "Warming cross-division cache..."
curl -s "https://asr-po.yourdomain.com/api/dashboards/cross-division" > /dev/null

# Cache cleanup - remove stale entries
echo "Cleaning stale cache entries..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
    EVAL "
        local keys = redis.call('keys', 'asr_po:*')
        local deleted = 0
        for i=1, #keys do
            local ttl = redis.call('ttl', keys[i])
            if ttl == -1 then  -- No expiration set
                redis.call('del', keys[i])
                deleted = deleted + 1
            end
        end
        return deleted
    " 0

echo "Cache optimization completed"
```

### Load Testing Execution

#### Performance Validation
```bash
#!/bin/bash
# load-testing.sh - Execute load tests and validate performance

echo "ASR PO System Load Testing - $(date)"
echo "===================================="

# Ensure Artillery.js is installed
if ! command -v artillery &> /dev/null; then
    echo "Installing Artillery.js..."
    npm install -g artillery
fi

# Pre-test system check
echo "Pre-test system verification..."
curl -f https://asr-po.yourdomain.com/api/health || {
    echo "System not healthy - aborting load tests"
    exit 1
}

# Load test configuration
cat > artillery-config.yml << EOF
config:
  target: 'https://asr-po.yourdomain.com'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"

scenarios:
  - name: "Dashboard Access"
    weight: 40
    flow:
      - get:
          url: "/api/dashboards/kpi-metrics"
      - think: 2

  - name: "Report Generation"
    weight: 30
    flow:
      - get:
          url: "/api/reports/po-summary?format=json"
      - think: 5

  - name: "PO Creation"
    weight: 20
    flow:
      - get:
          url: "/api/po/metadata"
      - think: 3

  - name: "Health Checks"
    weight: 10
    flow:
      - get:
          url: "/api/health"
EOF

# Execute load tests
echo "Starting load tests..."
artillery run artillery-config.yml --output load-test-$(date +%Y%m%d_%H%M%S).json

# Performance validation
echo "Validating performance targets..."

# Check response times
avg_response_time=$(curl -s https://asr-po.yourdomain.com/api/monitoring/performance | jq -r '.metrics.avgResponseTime')
p95_response_time=$(curl -s https://asr-po.yourdomain.com/api/monitoring/performance | jq -r '.metrics.p95ResponseTime')

echo "Performance Results:"
echo "- Average response time: ${avg_response_time}ms (target: <500ms)"
echo "- 95th percentile response time: ${p95_response_time}ms (target: <500ms)"

# Validate targets
if (( $(echo "$avg_response_time < 500" | bc -l) )); then
    echo "✓ Average response time: PASSED"
else
    echo "❌ Average response time: FAILED"
fi

if (( $(echo "$p95_response_time < 500" | bc -l) )); then
    echo "✓ 95th percentile response time: PASSED"
else
    echo "❌ 95th percentile response time: FAILED"
fi

# Dashboard load time test
echo "Testing dashboard load time..."
dashboard_start=$(date +%s%3N)
curl -s https://asr-po.yourdomain.com/api/dashboards/kpi-metrics > /dev/null
dashboard_end=$(date +%s%3N)
dashboard_time=$((dashboard_end - dashboard_start))

echo "- Dashboard load time: ${dashboard_time}ms (target: <2000ms)"

if [ $dashboard_time -lt 2000 ]; then
    echo "✓ Dashboard load time: PASSED"
else
    echo "❌ Dashboard load time: FAILED"
fi

echo "Load testing completed"
```

---

## Troubleshooting Procedures

### Common Issues and Resolutions

#### Application Startup Issues
```bash
#!/bin/bash
# troubleshoot-startup.sh - Application startup troubleshooting

echo "Application Startup Troubleshooting"
echo "==================================="

# Check container status
echo "1. Container Status:"
docker-compose -f docker-compose.prod.yml ps

# Check environment variables
echo "2. Environment Variables:"
docker exec asr-po-system env | grep -E "(NODE_ENV|DATABASE_URL|NEXTAUTH_)" | head -5

# Check database connectivity
echo "3. Database Connectivity:"
if pg_isready -h "$DB_HOST" -p "$DB_PORT"; then
    echo "✓ Database connection: OK"

    # Test query execution
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✓ Database query execution: OK"
    else
        echo "❌ Database query execution: FAILED"
        echo "  Check database permissions and schema"
    fi
else
    echo "❌ Database connection: FAILED"
    echo "  Verify DATABASE_URL and database service status"
fi

# Check Redis connectivity
echo "4. Redis Connectivity:"
if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
    echo "✓ Redis connection: OK"
else
    echo "❌ Redis connection: FAILED"
    echo "  Application will use fallback cache"
fi

# Check application logs
echo "5. Recent Application Logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20 app | grep -E "(ERROR|FATAL)"

# Check port binding
echo "6. Port Status:"
netstat -tlnp | grep ":3000"

# Memory and CPU check
echo "7. Resource Usage:"
docker stats asr-po-system --no-stream
```

#### Database Connection Problems
```bash
#!/bin/bash
# troubleshoot-database.sh - Database connectivity troubleshooting

echo "Database Connection Troubleshooting"
echo "=================================="

# Parse DATABASE_URL
db_host=$(echo $DATABASE_URL | grep -oP '://[^:]+:\w+@\K[^:]+')
db_port=$(echo $DATABASE_URL | grep -oP '://[^:]+:\w+@[^:]+:\K\d+')
db_name=$(echo $DATABASE_URL | grep -oP '/\K[^?]+')
db_user=$(echo $DATABASE_URL | grep -oP '://\K[^:]+')

echo "Database Configuration:"
echo "- Host: $db_host"
echo "- Port: $db_port"
echo "- Database: $db_name"
echo "- User: $db_user"

# Test network connectivity
echo "Testing network connectivity..."
if nc -z "$db_host" "$db_port" 2>/dev/null; then
    echo "✓ Network connectivity: OK"
else
    echo "❌ Network connectivity: FAILED"
    echo "  Check network rules and database service status"
    exit 1
fi

# Test authentication
echo "Testing authentication..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✓ Authentication: OK"
else
    echo "❌ Authentication: FAILED"
    echo "  Check credentials and user permissions"
fi

# Check connection pool
echo "Checking connection pool..."
active_connections=$(PGPASSWORD="$DB_PASSWORD" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();")
max_connections=$(PGPASSWORD="$DB_PASSWORD" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -t -c "SHOW max_connections;")

echo "- Active connections: $active_connections"
echo "- Max connections: $max_connections"

if [ "$active_connections" -gt $((max_connections * 80 / 100)) ]; then
    echo "⚠️  Connection pool near capacity"
fi

# Check for long-running queries
echo "Checking for blocking queries..."
PGPASSWORD="$DB_PASSWORD" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    state,
    LEFT(query, 50) as query_preview
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '1 minute'
AND state = 'active';"
```

#### QuickBooks Integration Issues
```bash
#!/bin/bash
# troubleshoot-quickbooks.sh - QuickBooks integration troubleshooting

echo "QuickBooks Integration Troubleshooting"
echo "====================================="

# Check OAuth configuration
echo "1. OAuth Configuration:"
if [[ -n "$QB_CLIENT_ID" && -n "$QB_CLIENT_SECRET" ]]; then
    echo "✓ OAuth credentials configured"
    echo "  Client ID: ${QB_CLIENT_ID:0:8}..."
else
    echo "❌ OAuth credentials missing"
    echo "  Check QB_CLIENT_ID and QB_CLIENT_SECRET"
    exit 1
fi

# Test QuickBooks API connectivity
echo "2. QuickBooks API Connectivity:"
qb_discovery_response=$(curl -s -I "$QB_DISCOVERY_DOCUMENT" | head -1)
if echo "$qb_discovery_response" | grep -q "200 OK"; then
    echo "✓ QuickBooks discovery endpoint: OK"
else
    echo "❌ QuickBooks discovery endpoint: FAILED"
    echo "  Response: $qb_discovery_response"
fi

# Check stored tokens
echo "3. Stored OAuth Tokens:"
token_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM qb_auth_tokens;")
echo "  Total tokens in database: $token_count"

if [ "$token_count" -gt 0 ]; then
    # Check token expiration
    expired_tokens=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM qb_auth_tokens WHERE expires_at < NOW();")
    valid_tokens=$((token_count - expired_tokens))

    echo "  Valid tokens: $valid_tokens"
    echo "  Expired tokens: $expired_tokens"

    if [ "$valid_tokens" -eq 0 ]; then
        echo "⚠️  All tokens expired - re-authorization required"
    fi
else
    echo "⚠️  No OAuth tokens found - initial authorization required"
fi

# Test QuickBooks API endpoints
echo "4. QuickBooks API Test:"
api_test_response=$(curl -s -o /dev/null -w '%{http_code}' https://asr-po.yourdomain.com/api/quickbooks/test-connection)

case $api_test_response in
    200) echo "✓ QuickBooks API test: OK" ;;
    401) echo "❌ QuickBooks API test: Authentication failed" ;;
    403) echo "❌ QuickBooks API test: Authorization failed" ;;
    429) echo "❌ QuickBooks API test: Rate limited" ;;
    500) echo "❌ QuickBooks API test: Server error" ;;
    *) echo "❌ QuickBooks API test: Unknown error ($api_test_response)" ;;
esac

# Check recent sync status
echo "5. Recent Sync Status:"
psql "$DATABASE_URL" -c "
SELECT
    sync_date,
    status,
    records_processed,
    LEFT(error_message, 50) as error_preview,
    duration_seconds
FROM sync_audit_log
ORDER BY sync_date DESC
LIMIT 5;" 2>/dev/null || echo "No sync audit table found"

# Check QuickBooks rate limiting
echo "6. Rate Limiting Status:"
rate_limit_info=$(curl -s https://asr-po.yourdomain.com/api/quickbooks/rate-limit-status)
if [ -n "$rate_limit_info" ]; then
    echo "$rate_limit_info" | jq '.remaining, .resetTime'
else
    echo "Rate limit information unavailable"
fi
```

#### Performance Issues
```bash
#!/bin/bash
# troubleshoot-performance.sh - Performance issue troubleshooting

echo "Performance Issue Troubleshooting"
echo "================================"

# System resource check
echo "1. System Resources:"
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}'

echo "Memory Usage:"
free -h | awk 'NR==2{printf "Used: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2}'

echo "Disk Usage:"
df -h | grep -E '^/dev/' | awk '{print $5 " " $6}' | while read line; do
    echo "$line"
done

# Database performance check
echo "2. Database Performance:"
slow_query_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_stat_statements WHERE mean_time > 1000;")
echo "  Slow queries (>1s): $slow_query_count"

cache_hit_ratio=$(psql "$DATABASE_URL" -t -c "
SELECT ROUND(
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2
) FROM pg_statio_user_tables;")
echo "  Cache hit ratio: $cache_hit_ratio%"

active_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
echo "  Active connections: $active_connections"

# Application performance check
echo "3. Application Performance:"
app_response_time=$(curl -s -o /dev/null -w '%{time_total}' https://asr-po.yourdomain.com/api/health)
echo "  Health endpoint response time: ${app_response_time}s"

# Redis performance check
echo "4. Cache Performance:"
redis_memory=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info memory | grep used_memory_human | cut -d: -f2)
echo "  Redis memory usage: $redis_memory"

cache_metrics=$(curl -s https://asr-po.yourdomain.com/api/monitoring/cache-metrics)
if [ -n "$cache_metrics" ]; then
    hit_rate=$(echo "$cache_metrics" | jq -r '.hitRate * 100')
    echo "  Cache hit rate: $hit_rate%"
fi

# Recent error analysis
echo "5. Recent Errors:"
recent_errors=$(docker-compose -f docker-compose.prod.yml logs --since="1h" app | grep -i error | wc -l)
echo "  Errors in last hour: $recent_errors"

if [ "$recent_errors" -gt 10 ]; then
    echo "⚠️  High error rate detected"
    echo "Recent error samples:"
    docker-compose -f docker-compose.prod.yml logs --since="1h" app | grep -i error | tail -3
fi

# Load average check
echo "6. Load Average:"
uptime
```

### Log Analysis Procedures

#### Centralized Log Analysis
```bash
#!/bin/bash
# log-analysis.sh - Comprehensive log analysis

echo "Log Analysis Report - $(date)"
echo "============================="

# Application logs analysis
echo "1. Application Error Patterns:"
if [ -f "/var/log/asr-po-system/app.log" ]; then
    tail -1000 /var/log/asr-po-system/app.log | grep -E "(ERROR|FATAL|CRITICAL)" | \
        awk '{print $4}' | sort | uniq -c | sort -rn | head -10
else
    docker-compose -f docker-compose.prod.yml logs --since="24h" app | \
        grep -E "(ERROR|FATAL|CRITICAL)" | \
        awk '{print $NF}' | sort | uniq -c | sort -rn | head -10
fi

# Database logs analysis
echo "2. Database Error Patterns:"
if [ -f "/var/log/postgresql/postgresql-15-main.log" ]; then
    tail -1000 /var/log/postgresql/postgresql-15-main.log | grep ERROR | \
        awk '{print $NF}' | sort | uniq -c | sort -rn | head -5
else
    echo "Database logs not accessible from this location"
fi

# Authentication logs analysis
echo "3. Authentication Analysis:"
psql "$DATABASE_URL" -c "
SELECT
    event_type,
    COUNT(*) as occurrences,
    COUNT(DISTINCT email) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM auth_audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY occurrences DESC;" 2>/dev/null

# Performance logs analysis
echo "4. Performance Metrics:"
if [ -f "/var/log/asr-po-system/performance.log" ]; then
    tail -100 /var/log/asr-po-system/performance.log | \
        grep "response_time" | \
        awk '{print $3}' | \
        awk '{sum+=$1; count++} END {if(count>0) print "Average response time: " sum/count "ms"}'
fi

# QuickBooks sync logs
echo "5. QuickBooks Sync Analysis:"
if [ -f "/var/log/asr-po-system/quickbooks.log" ]; then
    tail -200 /var/log/asr-po-system/quickbooks.log | \
        grep -E "(SUCCESS|FAILED|ERROR)" | \
        tail -10
else
    echo "QuickBooks sync logs not found"
fi

# System resource logs
echo "6. Resource Usage Trends:"
# Check Docker container resource usage over time
docker stats asr-po-system --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.BlockIO}}\t{{.NetIO}}"
```

#### Error Pattern Recognition
```bash
#!/bin/bash
# error-pattern-analysis.sh - Identify recurring error patterns

echo "Error Pattern Analysis - $(date)"
echo "==============================="

# Define time windows for analysis
time_windows=("1h" "6h" "24h" "7d")

for window in "${time_windows[@]}"; do
    echo "Analysis for last $window:"
    echo "------------------------"

    # Get errors from Docker logs
    errors=$(docker-compose -f docker-compose.prod.yml logs --since="$window" app | grep -i error)

    if [ -n "$errors" ]; then
        # Count error types
        echo "$errors" | \
            sed 's/.*ERROR: \([^:]*\):.*/\1/' | \
            sort | uniq -c | sort -rn | head -5 | \
            while read count error_type; do
                echo "  $count occurrences: $error_type"
            done

        # Check for error spikes
        error_count=$(echo "$errors" | wc -l)
        echo "  Total errors: $error_count"

        # Calculate error rate per hour
        case $window in
            "1h") rate=$error_count ;;
            "6h") rate=$((error_count / 6)) ;;
            "24h") rate=$((error_count / 24)) ;;
            "7d") rate=$((error_count / 168)) ;;
        esac

        echo "  Error rate: $rate errors/hour"

        if [ "$rate" -gt 10 ]; then
            echo "  ⚠️  High error rate detected"
        fi
    else
        echo "  No errors found in this time window"
    fi

    echo ""
done

# Identify correlation patterns
echo "Error Correlation Analysis:"
echo "-------------------------"

# Check if errors correlate with high load
high_load_times=$(docker-compose -f docker-compose.prod.yml logs --since="24h" app | \
    grep "High CPU usage\|Memory warning\|Database connection pool exhausted" | \
    awk '{print $1 " " $2}' | sort)

if [ -n "$high_load_times" ]; then
    echo "High load periods detected:"
    echo "$high_load_times"

    # Check if errors spike during these times
    echo "Correlating with error patterns..."
fi
```

---

## Emergency Procedures

### Emergency Response Playbook

#### Emergency Classification System
```
🔴 CRITICAL (SEV1):   System completely down, data loss risk, security breach
🟡 HIGH (SEV2):       Major functionality impaired, significant user impact
🟢 MEDIUM (SEV3):     Partial functionality affected, workaround available
🔵 LOW (SEV4):        Minor issues, minimal user impact
```

#### Emergency Contact Matrix
```
IMMEDIATE RESPONSE (0-15 minutes):
- On-call Engineer: +1-XXX-XXX-XXXX
- Slack Channel: #asr-po-alerts
- Email: alerts@yourdomain.com

ESCALATION (15-30 minutes):
- System Administrator: admin@yourdomain.com
- Development Team Lead: dev-lead@yourdomain.com
- ASR Management: management@yourdomain.com

CRITICAL ESCALATION (30+ minutes):
- Emergency Support: +1-XXX-XXX-XXXX
- Executive Leadership: executives@yourdomain.com
- External Support: support-vendor@external.com
```

### Emergency Response Procedures

#### System Down (SEV1)
```bash
#!/bin/bash
# emergency-system-down.sh - Complete system outage response

echo "🔴 EMERGENCY: SYSTEM DOWN - $(date)"
echo "Initiating emergency response procedures..."

# Step 1: Immediate assessment (2 minutes)
echo "Step 1: System Assessment"
echo "========================"

# Check if it's a DNS/routing issue
if ping -c 3 8.8.8.8 > /dev/null; then
    echo "✓ Internet connectivity: OK"
else
    echo "❌ Internet connectivity: FAILED - Check network"
fi

# Check domain resolution
if nslookup asr-po.yourdomain.com > /dev/null; then
    echo "✓ DNS resolution: OK"
else
    echo "❌ DNS resolution: FAILED - Check DNS configuration"
fi

# Check container status
container_status=$(docker-compose -f docker-compose.prod.yml ps --services --filter "status=running")
if [ -n "$container_status" ]; then
    echo "✓ Some containers running: $container_status"
else
    echo "❌ No containers running - Critical infrastructure failure"
fi

# Step 2: Notify stakeholders (1 minute)
echo "Step 2: Stakeholder Notification"
echo "==============================="

# Send Slack alert
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"🔴 CRITICAL: ASR PO System is DOWN. Emergency response initiated at $(date)\", \"channel\":\"#asr-po-alerts\"}"
fi

# Send email alert
if command -v mail >/dev/null 2>&1; then
    echo "ASR Purchase Order System is experiencing a complete outage. Emergency response procedures initiated at $(date)." | \
        mail -s "CRITICAL: ASR PO System DOWN" admin@yourdomain.com
fi

# Step 3: Emergency recovery attempts (5 minutes)
echo "Step 3: Emergency Recovery"
echo "========================="

# Try container restart
echo "Attempting container restart..."
docker-compose -f docker-compose.prod.yml restart
sleep 30

# Check if restart worked
if curl -f https://asr-po.yourdomain.com/api/health > /dev/null 2>&1; then
    echo "✓ System recovered after restart"

    # Send recovery notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ ASR PO System recovered after restart at $(date)\"}"
    fi
    exit 0
fi

# Try emergency rollback
echo "Container restart failed. Attempting emergency rollback..."
if [ -f "docker-compose.prod.yml.backup" ]; then
    cp docker-compose.prod.yml.backup docker-compose.prod.yml
    docker-compose -f docker-compose.prod.yml up -d
    sleep 30

    if curl -f https://asr-po.yourdomain.com/api/health > /dev/null 2>&1; then
        echo "✓ System recovered after rollback"
        exit 0
    fi
fi

# Step 4: Escalation (immediate)
echo "Step 4: Escalation Required"
echo "=========================="
echo "❌ Emergency recovery attempts failed"
echo "Escalating to development team and management"
echo "Manual intervention required"

# Preserve system state for analysis
echo "Preserving system state for analysis..."
docker-compose -f docker-compose.prod.yml logs > "/tmp/emergency-logs-$(date +%Y%m%d_%H%M%S).log"
docker stats --no-stream > "/tmp/emergency-stats-$(date +%Y%m%d_%H%M%S).log"

echo "Emergency logs saved to /tmp/"
echo "Contact emergency support immediately: +1-XXX-XXX-XXXX"
```

#### Data Corruption (SEV1)
```bash
#!/bin/bash
# emergency-data-corruption.sh - Data corruption emergency response

echo "🔴 EMERGENCY: DATA CORRUPTION DETECTED - $(date)"

# Immediate actions
echo "IMMEDIATE ACTIONS:"
echo "1. STOP all data modifications"
echo "2. Isolate affected systems"
echo "3. Preserve current state"

# Stop application to prevent further corruption
echo "Stopping application to prevent further data corruption..."
docker-compose -f docker-compose.prod.yml stop app

# Create emergency database backup
echo "Creating emergency backup of current state..."
emergency_backup="/var/backups/asr-po-system/emergency-corruption-$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump "$DATABASE_URL" | gzip > "$emergency_backup"
echo "Emergency backup created: $emergency_backup"

# Assess corruption scope
echo "Assessing corruption scope..."
psql "$DATABASE_URL" -c "
-- Check for NULL values where they shouldn't exist
SELECT 'po_headers null check' as check_type, COUNT(*) as issues
FROM po_headers WHERE id IS NULL OR vendor_id IS NULL OR total_amount IS NULL
UNION ALL
SELECT 'po_approvals null check', COUNT(*)
FROM po_approvals WHERE id IS NULL OR po_id IS NULL OR action IS NULL
UNION ALL
SELECT 'users integrity check', COUNT(*)
FROM users WHERE id IS NULL OR email IS NULL OR role IS NULL;"

# Notification
echo "CRITICAL: Data corruption detected in ASR PO System at $(date)" | \
    mail -s "CRITICAL: Data Corruption Emergency" admin@yourdomain.com

echo "=========================================="
echo "DATA CORRUPTION EMERGENCY RESPONSE ACTIVE"
echo "Application STOPPED to prevent further damage"
echo "DO NOT restart application until data is verified"
echo "Contact database administrator immediately"
echo "Emergency backup: $emergency_backup"
echo "=========================================="
```

#### Security Breach (SEV1)
```bash
#!/bin/bash
# emergency-security-breach.sh - Security breach response

echo "🔴 EMERGENCY: SECURITY BREACH DETECTED - $(date)"

breach_type=$1
affected_system=$2

# Immediate containment
echo "IMMEDIATE CONTAINMENT ACTIONS:"

# 1. Preserve audit trails
echo "1. Preserving audit trails..."
cp /var/log/asr-po-system/auth.log "/tmp/security-incident-auth-$(date +%Y%m%d_%H%M%S).log"
psql "$DATABASE_URL" -c "\COPY po_approvals TO '/tmp/security-incident-audit-$(date +%Y%m%d_%H%M%S).csv' CSV HEADER;"

# 2. Lock down access
echo "2. Implementing emergency access controls..."

# Force logout all users by invalidating sessions
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" FLUSHDB

# Block suspicious IP addresses (if identified)
if [ -n "$SUSPICIOUS_IPS" ]; then
    echo "Blocking suspicious IP addresses: $SUSPICIOUS_IPS"
    # Implement IP blocking logic
fi

# 3. Assess breach scope
echo "3. Assessing breach scope..."
case $breach_type in
    "unauthorized_access")
        echo "Checking for unauthorized data access..."
        psql "$DATABASE_URL" -c "
        SELECT
            actor_user_id,
            action,
            COUNT(*) as action_count,
            MIN(timestamp) as first_action,
            MAX(timestamp) as last_action
        FROM po_approvals
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY actor_user_id, action
        HAVING COUNT(*) > 100;"
        ;;

    "data_exfiltration")
        echo "Checking for unusual data export patterns..."
        # Check for large data exports
        tail -1000 /var/log/asr-po-system/app.log | grep -i "export\|download" | tail -20
        ;;

    "privilege_escalation")
        echo "Checking for privilege escalation..."
        psql "$DATABASE_URL" -c "
        SELECT
            email,
            role,
            last_role_change,
            changed_by
        FROM users
        WHERE last_role_change > NOW() - INTERVAL '7 days'
        ORDER BY last_role_change DESC;"
        ;;
esac

# 4. Notification and escalation
echo "4. Notification and escalation..."

# Immediate notification
cat <<EOF | mail -s "CRITICAL: Security Breach - ASR PO System" admin@yourdomain.com
SECURITY BREACH DETECTED

Time: $(date)
Type: $breach_type
Affected System: $affected_system

IMMEDIATE ACTIONS TAKEN:
- All user sessions invalidated
- Audit trails preserved
- Access controls implemented
- System access temporarily restricted

REQUIRED ACTIONS:
1. Contact cybersecurity team immediately
2. Do not restart services without security clearance
3. Preserve all logs and evidence
4. Prepare for incident response procedures

Contact: +1-XXX-XXX-XXXX (Emergency Security)
EOF

# Slack notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"🚨 SECURITY BREACH: $breach_type detected in ASR PO System. Immediate response required. Contact security team.\", \"channel\":\"#security-alerts\"}"
fi

echo "=========================================="
echo "SECURITY BREACH RESPONSE ACTIVE"
echo "Access controls implemented"
echo "Incident response team notified"
echo "Awaiting security team clearance"
echo "=========================================="
```

### Disaster Recovery

#### Complete System Recovery
```bash
#!/bin/bash
# disaster-recovery-complete.sh - Complete disaster recovery procedure

echo "🔥 DISASTER RECOVERY: Complete System Recovery"
echo "=============================================="

recovery_point=$1  # Format: YYYY-MM-DD_HH:MM:SS

if [ -z "$recovery_point" ]; then
    echo "Usage: $0 YYYY-MM-DD_HH:MM:SS"
    echo "Example: $0 2024-01-12_14:30:00"
    exit 1
fi

echo "Target recovery point: $recovery_point"
echo "WARNING: This will completely rebuild the system from backups"
read -p "Type 'INITIATE FULL RECOVERY' to proceed: " confirm

if [ "$confirm" != "INITIATE FULL RECOVERY" ]; then
    echo "Disaster recovery cancelled"
    exit 1
fi

# Phase 1: Infrastructure Assessment
echo "Phase 1: Infrastructure Assessment"
echo "================================="

# Check if basic infrastructure is available
if docker --version > /dev/null 2>&1; then
    echo "✓ Docker available"
else
    echo "❌ Docker not available - install Docker first"
    exit 1
fi

if command -v psql >/dev/null 2>&1; then
    echo "✓ PostgreSQL client available"
else
    echo "❌ PostgreSQL client not available - install postgresql-client"
    exit 1
fi

# Phase 2: Backup Selection and Validation
echo "Phase 2: Backup Selection and Validation"
echo "========================================"

# Find closest backup to recovery point
target_date=$(echo $recovery_point | cut -d_ -f1 | tr -d -)
backup_file=$(ls -t /var/backups/asr-po-system/asr-po-backup_${target_date}*.sql.gz | head -1)

if [ -z "$backup_file" ]; then
    echo "❌ No backup found for date $target_date"
    echo "Available backups:"
    ls -t /var/backups/asr-po-system/asr-po-backup_*.sql.gz | head -5
    exit 1
fi

echo "Selected backup: $(basename $backup_file)"
echo "Backup date: $(stat -c %y "$backup_file")"

# Validate backup integrity
echo "Validating backup integrity..."
if gzip -t "$backup_file"; then
    echo "✓ Backup file integrity: PASSED"
else
    echo "❌ Backup file corrupted"
    exit 1
fi

# Phase 3: System Shutdown and Cleanup
echo "Phase 3: System Shutdown and Cleanup"
echo "===================================="

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Clean up containers and volumes
docker system prune -f
docker volume prune -f

# Phase 4: Infrastructure Recreation
echo "Phase 4: Infrastructure Recreation"
echo "================================="

# Recreate infrastructure
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for services to be ready
echo "Waiting for infrastructure services..."
sleep 30

# Verify database is ready
max_attempts=12
attempt=1
while [ $attempt -le $max_attempts ]; do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT"; then
        echo "✓ Database ready"
        break
    else
        echo "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Database failed to start"
    exit 1
fi

# Phase 5: Data Recovery
echo "Phase 5: Data Recovery"
echo "====================="

# Create fresh database
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "CREATE DATABASE $DB_NAME;"

# Restore from backup
echo "Restoring database from backup..."
pg_restore --clean --if-exists \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -d "$DB_NAME" \
    "$backup_file"

if [ $? -eq 0 ]; then
    echo "✓ Database restoration completed"
else
    echo "❌ Database restoration failed"
    exit 1
fi

# Phase 6: Application Recovery
echo "Phase 6: Application Recovery"
echo "============================"

# Start application
docker-compose -f docker-compose.prod.yml up -d app

# Wait for application startup
echo "Waiting for application startup..."
sleep 60

# Phase 7: Verification and Testing
echo "Phase 7: Verification and Testing"
echo "==============================="

# Health check verification
health_checks=(
    "https://asr-po.yourdomain.com/api/health"
    "https://asr-po.yourdomain.com/api/health/database"
    "https://asr-po.yourdomain.com/api/health/cache"
)

failed_checks=0
for endpoint in "${health_checks[@]}"; do
    if curl -f "$endpoint" > /dev/null 2>&1; then
        echo "✓ $(basename $endpoint): OK"
    else
        echo "❌ $(basename $endpoint): FAILED"
        ((failed_checks++))
    fi
done

# Data integrity verification
echo "Verifying data integrity..."
data_checks=$(psql "$DATABASE_URL" -t -c "
SELECT
    'po_headers: ' || COUNT(*) ||
    ', po_approvals: ' || (SELECT COUNT(*) FROM po_approvals) ||
    ', users: ' || (SELECT COUNT(*) FROM users) ||
    ', vendors: ' || (SELECT COUNT(*) FROM vendors)
FROM po_headers;")

echo "Data counts: $data_checks"

# Phase 8: Recovery Summary
echo "Phase 8: Recovery Summary"
echo "======================="

if [ $failed_checks -eq 0 ]; then
    recovery_status="✅ SUCCESSFUL"

    # Send success notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ DISASTER RECOVERY COMPLETED: ASR PO System fully recovered at $(date). Recovery point: $recovery_point\"}"
    fi
else
    recovery_status="⚠️  PARTIAL ($failed_checks failed checks)"
fi

echo "=============================="
echo "DISASTER RECOVERY COMPLETE"
echo "Status: $recovery_status"
echo "Recovery Point: $recovery_point"
echo "Backup Used: $(basename $backup_file)"
echo "Recovery Time: $(date)"
echo "Data Integrity: $data_checks"
echo "=============================="

# Log recovery event
echo "$(date): Disaster recovery completed. Status: $recovery_status, Recovery Point: $recovery_point" >> /var/log/asr-po-system/recovery.log
```

---

## Appendices

### Appendix A: Environment Variables Reference

#### Production Environment Variables
```bash
# Core Application Configuration
NODE_ENV=production                                    # Application environment mode
NEXTAUTH_URL=https://asr-po.yourdomain.com            # NextAuth.js base URL
NEXTAUTH_SECRET=your-32-character-secret-here          # NextAuth.js encryption secret
LOG_LEVEL=info                                         # Logging level (error, warn, info, debug)

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/db    # Primary database connection
DATABASE_POOL_SIZE=20                                  # Connection pool size
DATABASE_TIMEOUT=30000                                 # Query timeout (ms)
DATABASE_SSL=true                                      # Enable SSL for database connections

# Redis Cache Configuration
REDIS_URL=redis://username:password@host:port          # Redis connection string
REDIS_HOST=localhost                                   # Redis hostname
REDIS_PORT=6379                                        # Redis port
REDIS_PASSWORD=your-secure-redis-password             # Redis authentication password
REDIS_DB=0                                            # Redis database number

# QuickBooks Integration
QB_CLIENT_ID=your-quickbooks-client-id                 # QuickBooks app client ID
QB_CLIENT_SECRET=your-quickbooks-client-secret         # QuickBooks app client secret
QB_SANDBOX_BASE_URL=https://sandbox-quickbooks.api.intuit.com  # QuickBooks sandbox URL
QB_DISCOVERY_DOCUMENT=https://appcenter.intuit.com/.well-known/app_center/openid_connect  # OAuth discovery

# Email Configuration
SMTP_HOST=smtp.yourmailprovider.com                    # SMTP server hostname
SMTP_PORT=587                                          # SMTP server port
SMTP_SECURE=true                                       # Enable TLS/SSL
SMTP_USER=alerts@yourdomain.com                       # SMTP username
SMTP_PASSWORD=your-smtp-password                       # SMTP password
EMAIL_FROM=noreply@yourdomain.com                     # Default sender address

# Security Configuration
CORS_ORIGIN=https://asr-po.yourdomain.com             # Allowed CORS origins
RATE_LIMIT_WINDOW_MS=900000                           # Rate limit window (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100                           # Max requests per window
JWT_SECRET=your-jwt-secret-minimum-32-characters      # JWT signing secret
SESSION_SECRET=your-session-secret                    # Session encryption secret

# Monitoring and Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url     # Slack notifications
MONITORING_WEBHOOK_URL=https://your-monitoring-system/webhook  # Generic webhook
WEBHOOK_AUTH_TOKEN=your-webhook-auth-token                     # Webhook authentication
UPTIME_ROBOT_API_KEY=your-uptimerobot-api-key                 # UptimeRobot integration

# Backup Configuration
BACKUP_S3_ENABLED=true                                # Enable S3 backup uploads
BACKUP_S3_BUCKET=asr-po-backups                      # S3 bucket name
BACKUP_S3_REGION=us-west-2                           # S3 region
BACKUP_RETENTION_DAYS=30                             # Local backup retention
BACKUP_EMAIL_NOTIFICATIONS=true                      # Email backup notifications
BACKUP_EMAIL_TO=admin@yourdomain.com                 # Backup notification recipient

# Performance Configuration
MAX_FILE_SIZE=50000000                               # Max upload file size (50MB)
REQUEST_TIMEOUT=60000                                # Request timeout (60 seconds)
CACHE_TTL_DEFAULT=600000                            # Default cache TTL (10 minutes)
PDF_GENERATION_TIMEOUT=30000                        # PDF generation timeout (30 seconds)
```

### Appendix B: Database Schema Reference

#### Core Tables Overview
```sql
-- Users and Authentication
users                    -- System users with role-based access
division_leaders         -- Division leaders with approval limits
qb_auth_tokens          -- QuickBooks OAuth tokens

-- Organizational Structure
divisions               -- ASR divisions (CH, PW, WS, LS)
vendors                 -- Vendor master data
projects                -- Project tracking
work_orders            -- Work order management

-- Purchase Order System
po_headers             -- Purchase order master records
po_line_items          -- Purchase order line item details
po_approvals          -- Complete audit trail of all actions

-- Configuration
gl_account_mappings    -- GL account configuration for QuickBooks
work_order_sequences   -- Work order numbering sequences
```

#### Critical Indexes for Performance
```sql
-- Purchase Order Performance Indexes
CREATE INDEX CONCURRENTLY idx_po_headers_status_division
    ON po_headers (status, division_id) WHERE status IN ('PENDING', 'APPROVED');

CREATE INDEX CONCURRENTLY idx_po_headers_created_division
    ON po_headers (created_at DESC, division_id);

CREATE INDEX CONCURRENTLY idx_po_approvals_timestamp_action
    ON po_approvals (timestamp DESC, action);

-- User Access Performance
CREATE INDEX CONCURRENTLY idx_users_email_active
    ON users (email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_division_leaders_code_active
    ON division_leaders (division_code) WHERE is_active = true;

-- Vendor and Project Lookups
CREATE INDEX CONCURRENTLY idx_vendors_code_active
    ON vendors (vendor_code) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_projects_code_status
    ON projects (project_code, status);
```

### Appendix C: API Endpoint Reference

#### Health Check Endpoints
```
GET /api/health                      # Basic application health
GET /api/health/database             # Database connectivity and performance
GET /api/health/cache                # Redis cache status with fallback info
GET /api/health/integrations         # QuickBooks and email service status
GET /api/health/performance          # Performance metrics and targets
```

#### Authentication Endpoints
```
POST /api/auth/signin                # User authentication
POST /api/auth/signout               # User logout
GET  /api/auth/session               # Current session info
GET  /api/auth/providers             # Available auth providers
```

#### Purchase Order Endpoints
```
GET    /api/po/list                  # List POs with filtering
GET    /api/po/[id]                  # Get specific PO details
POST   /api/po/create                # Create new PO
PUT    /api/po/[id]/approve          # Approve PO
PUT    /api/po/[id]/reject           # Reject PO
DELETE /api/po/[id]                  # Delete PO (if permitted)
```

#### Dashboard and Analytics
```
GET /api/dashboards/kpi-metrics      # Core KPI dashboard data
GET /api/dashboards/division         # Division-specific metrics
GET /api/dashboards/cross-division   # Cross-division analytics
GET /api/dashboards/pending-approvals # Pending approval queue
```

#### Reporting Endpoints
```
GET /api/reports/gl-analysis         # GL Analysis Report
GET /api/reports/vendor-analysis     # Vendor Analysis Report
GET /api/reports/budget-vs-actual    # Budget vs Actual Report
GET /api/reports/approval-bottleneck # Approval Bottleneck Analysis
GET /api/reports/po-summary          # PO Summary Report
GET /api/reports/project-details     # Project Details Report
```

#### QuickBooks Integration
```
GET  /api/quickbooks/auth-url        # Get QB OAuth authorization URL
POST /api/quickbooks/callback        # Handle QB OAuth callback
GET  /api/quickbooks/sync-status     # Current sync status
POST /api/quickbooks/sync-now        # Trigger manual sync
GET  /api/quickbooks/test-connection # Test QB API connectivity
```

### Appendix D: Monitoring Thresholds

#### Performance Thresholds
```yaml
# Response Time Thresholds
dashboard_load_time:
  target: 2000ms
  warning: 1500ms
  critical: 3000ms

api_response_time:
  target: 500ms
  warning: 750ms
  critical: 1500ms

report_generation:
  target: 10000ms
  warning: 7500ms
  critical: 15000ms

# Error Rate Thresholds
application_errors:
  target: 1.0%
  warning: 0.5%
  critical: 2.0%

database_errors:
  target: 0.1%
  warning: 0.05%
  critical: 0.2%

# Resource Thresholds
cpu_usage:
  target: 70%
  warning: 80%
  critical: 90%

memory_usage:
  target: 70%
  warning: 80%
  critical: 85%

database_connections:
  target: 70%
  warning: 80%
  critical: 90%

cache_hit_rate:
  target: 85%
  warning: 70%
  critical: 50%
```

#### Alert Escalation Timeframes
```yaml
escalation_levels:
  level_1:
    delay: 0
    channels: ["slack"]

  level_2:
    delay: 300  # 5 minutes
    channels: ["slack", "email"]

  level_3:
    delay: 900  # 15 minutes
    channels: ["slack", "email", "webhook"]

  level_4:
    delay: 1800 # 30 minutes
    actions: ["page_oncall", "escalate_management"]
```

### Appendix E: Security Checklist

#### Daily Security Checks
```bash
# Authentication monitoring
- [ ] Review failed login attempts (>5 failures)
- [ ] Check for suspicious IP activity
- [ ] Verify user session integrity
- [ ] Monitor privilege escalation attempts

# Data protection
- [ ] Verify backup completion and integrity
- [ ] Check audit trail completeness
- [ ] Monitor unusual data access patterns
- [ ] Verify encryption in transit and at rest

# System security
- [ ] Review container security status
- [ ] Check for security updates available
- [ ] Monitor network access patterns
- [ ] Verify firewall rules effectiveness
```

#### Weekly Security Reviews
```bash
# Access control review
- [ ] Review user permissions and roles
- [ ] Audit division leader approval limits
- [ ] Check for orphaned user accounts
- [ ] Verify QuickBooks integration permissions

# Security configuration
- [ ] Review environment variable security
- [ ] Check SSL certificate validity
- [ ] Audit database user permissions
- [ ] Review API rate limiting effectiveness

# Compliance monitoring
- [ ] Verify audit log retention compliance
- [ ] Check data retention policy adherence
- [ ] Review backup encryption status
- [ ] Monitor regulatory compliance metrics
```

### Appendix F: Contact Information

#### Emergency Contacts
```
PRIMARY CONTACTS:
System Administrator:    admin@yourdomain.com
Development Team:        dev-team@yourdomain.com
Database Administrator:  dba@yourdomain.com
On-Call Engineer:        +1-XXX-XXX-XXXX

ESCALATION CONTACTS:
ASR Management:          management@asr.com
IT Director:             it-director@yourdomain.com
Emergency Support:       +1-XXX-XXX-XXXX
Executive Team:          executives@asr.com

VENDOR CONTACTS:
Hosting Provider:        support@hostingprovider.com
Database Provider:       support@databaseprovider.com
Monitoring Service:      support@monitoringprovider.com
QuickBooks Support:      +1-XXX-XXX-XXXX
```

#### Service Level Agreements
```
RESPONSE TIMES:
Critical (SEV1):         15 minutes
High (SEV2):            1 hour
Medium (SEV3):          4 hours
Low (SEV4):             24 hours

RESOLUTION TARGETS:
Critical (SEV1):         4 hours
High (SEV2):            24 hours
Medium (SEV3):          72 hours
Low (SEV4):             1 week

UPTIME COMMITMENTS:
Production System:       99.9% uptime
Planned Maintenance:     Monthly window (2-4 AM Sunday)
Emergency Maintenance:   As needed with 4-hour notice
```

---

**End of Operations Guide**

This comprehensive operations guide provides complete coverage of the ASR Purchase Order System production operations. For questions or clarification, contact the development team at dev-team@yourdomain.com.

**Document Status**: ✅ Production Ready
**Next Review**: 2026-04-12
**Version Control**: Track changes in Git repository