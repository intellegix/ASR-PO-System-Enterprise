-- ASR Purchase Order System - Production Database Setup
-- Phase 4D - Deployment Setup
-- PostgreSQL production optimization and configuration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create production-optimized indexes based on Phase 4 performance analysis
-- These indexes were identified during Phase 4C performance validation

-- =====================================================
-- PRIMARY PERFORMANCE INDEXES
-- =====================================================

-- PO Headers - Critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_performance_composite
ON po_headers (division_id, status, created_at DESC, deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_vendor_lookup
ON po_headers (vendor_id, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_project_lookup
ON po_headers (project_id, status, created_at DESC)
WHERE deleted_at IS NULL AND project_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_amount_analysis
ON po_headers (total_amount, created_at DESC)
WHERE deleted_at IS NULL AND total_amount > 0;

-- PO Line Items - Report generation optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_line_items_gl_analysis
ON po_line_items (gl_account_id, line_subtotal, po_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_line_items_performance
ON po_line_items (po_id, gl_account_id, line_subtotal)
WHERE line_subtotal > 0;

-- PO Approvals - Workflow and audit optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_workflow
ON po_approvals (po_id, action, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_user_activity
ON po_approvals (approver_id, timestamp DESC, action);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_bottleneck_analysis
ON po_approvals (timestamp DESC, action, duration_hours)
WHERE duration_hours IS NOT NULL;

-- =====================================================
-- DASHBOARD PERFORMANCE INDEXES
-- =====================================================

-- Division-based filtering (most common dashboard query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_division_dashboard
ON po_headers (division_id, created_at DESC, status, total_amount)
WHERE deleted_at IS NULL;

-- Pending approvals optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_pending_approvals
ON po_headers (status, division_id, created_at DESC, total_amount)
WHERE deleted_at IS NULL AND status IN ('Submitted', 'Under Review');

-- Month-over-month trending
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_monthly_trend
ON po_headers (DATE_TRUNC('month', created_at), division_id, total_amount)
WHERE deleted_at IS NULL;

-- =====================================================
-- REPORTING INDEXES
-- =====================================================

-- Vendor analysis reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_analysis
ON vendors (vendor_type, is_active, vendor_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_vendor_analysis
ON po_headers (vendor_id, created_at, total_amount, status)
WHERE deleted_at IS NULL;

-- Project reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_reporting
ON projects (status, start_date, end_date, budget_total)
WHERE status = 'Active';

-- GL Account analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gl_accounts_reporting
ON gl_accounts (account_category, account_number, is_active);

-- Work orders performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_project_performance
ON work_orders (project_id, status, created_at DESC);

-- =====================================================
-- AUDIT AND COMPLIANCE INDEXES
-- =====================================================

-- Audit trail queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity_lookup
ON audit_log (entity_type, entity_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_activity
ON audit_log (user_id, timestamp DESC, action);

-- Compliance date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_compliance_dates
ON po_headers (created_at, updated_at, division_id)
WHERE deleted_at IS NULL;

-- =====================================================
-- FULL-TEXT SEARCH INDEXES
-- =====================================================

-- PO search functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_search
ON po_headers USING gin(to_tsvector('english', description))
WHERE deleted_at IS NULL AND description IS NOT NULL;

-- Vendor search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_search
ON vendors USING gin(to_tsvector('english', vendor_name || ' ' || COALESCE(vendor_code, '')));

-- Project search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_search
ON projects USING gin(to_tsvector('english', project_name || ' ' || COALESCE(project_code, '')));

-- =====================================================
-- PRODUCTION PERFORMANCE SETTINGS
-- =====================================================

-- Connection pooling optimization
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Query performance optimization
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_segments = 32;
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Logging for monitoring
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- =====================================================
-- DATABASE MAINTENANCE PROCEDURES
-- =====================================================

-- Create maintenance function for automated VACUUM and ANALYZE
CREATE OR REPLACE FUNCTION asr_maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- VACUUM ANALYZE critical tables
    VACUUM ANALYZE po_headers;
    VACUUM ANALYZE po_line_items;
    VACUUM ANALYZE po_approvals;
    VACUUM ANALYZE vendors;
    VACUUM ANALYZE projects;
    VACUUM ANALYZE divisions;
    VACUUM ANALYZE users;
    VACUUM ANALYZE audit_log;

    -- Clean up old audit logs (keep 2 years)
    DELETE FROM audit_log
    WHERE timestamp < NOW() - INTERVAL '2 years';

    -- Clean up old export temp files metadata
    DELETE FROM temp_files
    WHERE created_at < NOW() - INTERVAL '7 days';

    -- Update table statistics
    ANALYZE;

    RAISE NOTICE 'ASR PO System maintenance completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING VIEWS
-- =====================================================

-- Performance monitoring view
CREATE OR REPLACE VIEW v_performance_metrics AS
SELECT
    'database_connections' as metric_name,
    COUNT(*) as current_value,
    200 as max_value,
    (COUNT(*)::float / 200 * 100)::int as utilization_percent
FROM pg_stat_activity
WHERE state = 'active'

UNION ALL

SELECT
    'slow_queries_last_hour' as metric_name,
    COUNT(*) as current_value,
    10 as max_value,
    CASE WHEN COUNT(*) > 10 THEN 100 ELSE (COUNT(*)::float / 10 * 100)::int END as utilization_percent
FROM pg_stat_statements
WHERE calls > 0
AND mean_exec_time > 1000
AND last_exec > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT
    'table_bloat_po_headers' as metric_name,
    pg_total_relation_size('po_headers')::bigint / 1024 / 1024 as current_value,
    100 as max_value,
    CASE
        WHEN pg_total_relation_size('po_headers')::bigint / 1024 / 1024 > 100
        THEN 100
        ELSE (pg_total_relation_size('po_headers')::bigint / 1024 / 1024 / 100 * 100)::int
    END as utilization_percent;

-- Index usage monitoring
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- =====================================================
-- BACKUP PREPARATION
-- =====================================================

-- Create backup user with minimal privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'backup_user') THEN
        CREATE ROLE backup_user WITH LOGIN PASSWORD 'secure_backup_password';
    END IF;
END
$$;

-- Grant necessary permissions for backup
GRANT CONNECT ON DATABASE postgres TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO backup_user;

-- =====================================================
-- RELOAD CONFIGURATION
-- =====================================================

-- Reload PostgreSQL configuration
SELECT pg_reload_conf();

-- Display configuration summary
SELECT name, setting, unit, context
FROM pg_settings
WHERE name IN (
    'max_connections',
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem'
)
ORDER BY name;

COMMENT ON FUNCTION asr_maintenance_cleanup() IS 'ASR PO System automated maintenance function - run daily';
COMMENT ON VIEW v_performance_metrics IS 'Real-time database performance metrics for monitoring dashboard';
COMMENT ON VIEW v_index_usage IS 'Index usage statistics for performance optimization';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'ASR Purchase Order System';
    RAISE NOTICE 'Production Database Setup COMPLETED';
    RAISE NOTICE 'Phase 4D - Deployment Setup';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Production indexes created: %', (
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE indexname LIKE 'idx_%'
        AND tablename IN ('po_headers', 'po_line_items', 'po_approvals', 'vendors', 'projects')
    );
    RAISE NOTICE 'Performance configuration applied';
    RAISE NOTICE 'Monitoring views created';
    RAISE NOTICE 'Backup user configured';
    RAISE NOTICE 'Ready for production deployment';
END
$$;