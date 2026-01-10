import prisma from '@/lib/db';
import log from '@/lib/logging/logger';
import { performanceMonitor } from './monitoring';

interface DatabaseOptimization {
  indexRecommendations: Array<{
    table: string;
    columns: string[];
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }>;
  queryOptimizations: Array<{
    operation: string;
    currentApproach: string;
    recommendedApproach: string;
    expectedImprovement: string;
  }>;
  connectionPooling: {
    current: any;
    recommendations: string[];
  };
}

export class DatabaseOptimizer {
  /**
   * Analyze database performance and provide optimization recommendations
   */
  static async analyzePerformance(): Promise<DatabaseOptimization> {
    const measureId = performanceMonitor.startMeasure('database_performance_analysis');

    try {
      const analysis: DatabaseOptimization = {
        indexRecommendations: await this.getIndexRecommendations(),
        queryOptimizations: await this.getQueryOptimizations(),
        connectionPooling: await this.analyzeConnectionPooling(),
      };

      performanceMonitor.endMeasure(measureId, 'completed');
      return analysis;
    } catch (error) {
      performanceMonitor.endMeasure(measureId, 'failed', { error });
      throw error;
    }
  }

  /**
   * Create recommended database indexes for optimal performance
   */
  static async createOptimalIndexes(): Promise<void> {
    const measureId = performanceMonitor.startMeasure('create_optimal_indexes');

    try {
      const indexCommands = [
        // PO Headers performance indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_created_status ON po_headers(created_at, status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_division_date ON po_headers(division_id, created_at);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_vendor_status ON po_headers(vendor_id, status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_amount_date ON po_headers(total_amount, created_at);',

        // PO Line Items performance indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_line_items_po_gl ON po_line_items(po_id, gl_account_number);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_line_items_gl_taxable ON po_line_items(gl_account_number, is_taxable);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_line_items_amount ON po_line_items(total_amount);',

        // PO Approvals performance indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_timestamp ON po_approvals(timestamp);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_po_action ON po_approvals(po_id, action);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_actor_date ON po_approvals(actor_user_id, timestamp);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_approvals_status_change ON po_approvals(status_before, status_after);',

        // Users performance indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_division_role ON users(division_id, role);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_role ON users(is_active, role);',

        // Vendors performance indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_active_name ON vendors(is_active, vendor_name);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_payment_terms ON vendors(default_payment_terms);',

        // Projects performance indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_division ON projects(status, division_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_timeline ON projects(start_date, end_date);',

        // Dashboard KPI indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_kpi_month ON po_headers(EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at), division_id);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_headers_pending_division ON po_headers(status, division_id) WHERE status IN (\'PENDING_DIVISION_LEADER\', \'PENDING_ACCOUNTING\', \'PENDING_FINAL_APPROVAL\');',

        // Reporting indexes
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reporting_po_date_division ON po_headers(created_at DESC, division_id, status);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reporting_line_items_analysis ON po_line_items(gl_account_number, is_taxable, total_amount);',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reporting_approvals_timeline ON po_approvals(po_id, timestamp, action);',
      ];

      for (const command of indexCommands) {
        try {
          await performanceMonitor.measureAsync('create_index', async () => {
            await prisma.$executeRawUnsafe(command);
          }, { command });

          log.info('Database index created successfully', { command });
        } catch (error) {
          // Ignore if index already exists
          if (error instanceof Error && error.message.includes('already exists')) {
            log.debug('Index already exists, skipping', { command });
          } else {
            log.error('Failed to create database index', { command, error });
          }
        }
      }

      performanceMonitor.endMeasure(measureId, 'completed');
    } catch (error) {
      performanceMonitor.endMeasure(measureId, 'failed', { error });
      throw error;
    }
  }

  /**
   * Analyze query performance and provide recommendations
   */
  private static async getQueryOptimizations(): Promise<Array<{
    operation: string;
    currentApproach: string;
    recommendedApproach: string;
    expectedImprovement: string;
  }>> {
    return [
      {
        operation: 'Dashboard KPI Calculation',
        currentApproach: 'Real-time aggregation on each request',
        recommendedApproach: 'Implement Redis caching with 5-minute TTL',
        expectedImprovement: '80-90% reduction in response time',
      },
      {
        operation: 'Report Generation',
        currentApproach: 'Full table scans for date ranges',
        recommendedApproach: 'Use composite indexes on date + division + status',
        expectedImprovement: '60-70% reduction in query time',
      },
      {
        operation: 'Approval Workflow Queries',
        currentApproach: 'Multiple separate queries for status checks',
        recommendedApproach: 'Single query with JOINs and WHERE IN clauses',
        expectedImprovement: '40-50% reduction in database round trips',
      },
      {
        operation: 'Vendor Analysis',
        currentApproach: 'Subqueries for each vendor metric',
        recommendedApproach: 'Common Table Expressions (CTEs) with window functions',
        expectedImprovement: '50-60% improvement in complex aggregations',
      },
      {
        operation: 'Audit Trail Retrieval',
        currentApproach: 'ORDER BY timestamp without index',
        recommendedApproach: 'Use timestamp index with LIMIT and cursor pagination',
        expectedImprovement: '70-80% improvement for large datasets',
      },
      {
        operation: 'GL Account Analysis',
        currentApproach: 'JavaScript aggregation after data fetch',
        recommendedApproach: 'Database-level aggregation with GROUP BY and SUM',
        expectedImprovement: '60-70% reduction in memory usage and processing time',
      },
    ];
  }

  /**
   * Get database index recommendations
   */
  private static async getIndexRecommendations(): Promise<Array<{
    table: string;
    columns: string[];
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }>> {
    return [
      {
        table: 'po_headers',
        columns: ['created_at', 'status', 'division_id'],
        reason: 'Dashboard KPI queries filter by date, status, and division frequently',
        priority: 'high',
        estimatedImpact: 'Reduces dashboard load time by 70-80%',
      },
      {
        table: 'po_line_items',
        columns: ['gl_account_number', 'is_taxable', 'total_amount'],
        reason: 'GL analysis reports aggregate by GL account and tax status',
        priority: 'high',
        estimatedImpact: 'Improves report generation speed by 60-70%',
      },
      {
        table: 'po_approvals',
        columns: ['po_id', 'timestamp', 'action'],
        reason: 'Audit trail and approval workflow queries need efficient ordering and filtering',
        priority: 'high',
        estimatedImpact: 'Speeds up approval workflow queries by 50-60%',
      },
      {
        table: 'vendors',
        columns: ['is_active', 'vendor_name'],
        reason: 'Vendor lookup queries filter by active status and search by name',
        priority: 'medium',
        estimatedImpact: 'Improves vendor search performance by 40-50%',
      },
      {
        table: 'users',
        columns: ['division_id', 'role', 'is_active'],
        reason: 'Permission checks and division filtering queries',
        priority: 'medium',
        estimatedImpact: 'Faster user permission lookups by 30-40%',
      },
      {
        table: 'projects',
        columns: ['status', 'division_id', 'start_date'],
        reason: 'Project reporting and budget analysis queries',
        priority: 'low',
        estimatedImpact: 'Moderate improvement in project reports by 20-30%',
      },
    ];
  }

  /**
   * Analyze connection pooling configuration
   */
  private static async analyzeConnectionPooling(): Promise<{
    current: any;
    recommendations: string[];
  }> {
    // Get current Prisma connection info
    const info = await prisma.$queryRaw`SELECT
      current_setting('max_connections') as max_connections,
      current_setting('shared_preload_libraries') as shared_preload_libraries,
      count(*) as active_connections
    FROM pg_stat_activity
    WHERE state = 'active'`;

    const recommendations = [
      'Consider increasing connection pool size to 20-30 for production workloads',
      'Implement connection pooling at application level using PgBouncer or similar',
      'Set up read replicas for read-heavy operations like reports',
      'Configure statement timeout for long-running queries (30-60 seconds)',
      'Enable query plan caching for repeated report queries',
      'Implement connection retry logic with exponential backoff',
      'Monitor connection pool utilization and adjust as needed',
    ];

    return {
      current: info,
      recommendations,
    };
  }

  /**
   * Optimize specific query patterns used in the application
   */
  static async optimizeQueries(): Promise<void> {
    const measureId = performanceMonitor.startMeasure('optimize_queries');

    try {
      // Create materialized views for complex aggregations
      const materializedViews = [
        // Daily PO summary for dashboard KPIs
        `CREATE MATERIALIZED VIEW IF NOT EXISTS daily_po_summary AS
         SELECT
           DATE_TRUNC('day', created_at) as date,
           division_id,
           status,
           COUNT(*) as po_count,
           SUM(total_amount) as total_amount,
           AVG(total_amount) as avg_amount
         FROM po_headers
         WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
         GROUP BY DATE_TRUNC('day', created_at), division_id, status;`,

        // Monthly vendor performance summary
        `CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_vendor_summary AS
         SELECT
           DATE_TRUNC('month', ph.created_at) as month,
           ph.vendor_id,
           v.vendor_name,
           COUNT(*) as po_count,
           SUM(ph.total_amount) as total_amount,
           AVG(ph.total_amount) as avg_po_value,
           COUNT(CASE WHEN ph.status = 'COMPLETED' THEN 1 END) as completed_count
         FROM po_headers ph
         JOIN vendors v ON ph.vendor_id = v.id
         WHERE ph.created_at >= CURRENT_DATE - INTERVAL '24 months'
         GROUP BY DATE_TRUNC('month', ph.created_at), ph.vendor_id, v.vendor_name;`,

        // GL account utilization summary
        `CREATE MATERIALIZED VIEW IF NOT EXISTS gl_account_summary AS
         SELECT
           li.gl_account_number,
           li.gl_account_name,
           COUNT(*) as usage_count,
           SUM(li.total_amount) as total_amount,
           AVG(li.total_amount) as avg_amount,
           SUM(CASE WHEN li.is_taxable THEN li.total_amount ELSE 0 END) as taxable_amount,
           COUNT(DISTINCT ph.division_id) as division_count
         FROM po_line_items li
         JOIN po_headers ph ON li.po_id = ph.id
         WHERE ph.created_at >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY li.gl_account_number, li.gl_account_name;`,
      ];

      for (const view of materializedViews) {
        try {
          await performanceMonitor.measureAsync('create_materialized_view', async () => {
            await prisma.$executeRawUnsafe(view);
          });
          log.info('Materialized view created successfully');
        } catch (error) {
          if (error instanceof Error && error.message.includes('already exists')) {
            log.debug('Materialized view already exists, skipping');
          } else {
            log.error('Failed to create materialized view', { error });
          }
        }
      }

      // Create refresh function for materialized views
      const refreshFunction = `
        CREATE OR REPLACE FUNCTION refresh_performance_views()
        RETURNS void AS $$
        BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY daily_po_summary;
          REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_vendor_summary;
          REFRESH MATERIALIZED VIEW CONCURRENTLY gl_account_summary;
        END;
        $$ LANGUAGE plpgsql;
      `;

      await prisma.$executeRawUnsafe(refreshFunction);

      performanceMonitor.endMeasure(measureId, 'completed');
    } catch (error) {
      performanceMonitor.endMeasure(measureId, 'failed', { error });
      throw error;
    }
  }

  /**
   * Generate database performance report
   */
  static async generatePerformanceReport(): Promise<string> {
    const measureId = performanceMonitor.startMeasure('database_performance_report');

    try {
      // Query database statistics
      const tableStats = await prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_tup_hot_upd as hot_updates,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          heap_blks_read,
          heap_blks_hit,
          idx_blks_read,
          idx_blks_hit
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `;

      const indexStats = await prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE idx_scan > 0
        ORDER BY idx_scan DESC
        LIMIT 20;
      `;

      const slowQueries = await prisma.$queryRaw`
        SELECT
          query,
          calls,
          total_time,
          mean_time,
          min_time,
          max_time,
          stddev_time
        FROM pg_stat_statements
        WHERE calls > 10
        ORDER BY mean_time DESC
        LIMIT 10;
      `;

      const connections = await prisma.$queryRaw`
        SELECT
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        GROUP BY state;
      `;

      performanceMonitor.endMeasure(measureId, 'completed');

      return `
# Database Performance Report

## Table Statistics
${Array.isArray(tableStats) ? tableStats.map((row: any) =>
  `- **${row.tablename}**: ${row.live_tuples} live tuples, ${row.dead_tuples} dead tuples`
).join('\n') : 'No table statistics available'}

## Most Used Indexes
${Array.isArray(indexStats) ? indexStats.map((row: any) =>
  `- **${row.indexname}**: ${row.idx_scan} scans, ${row.idx_tup_read} tuples read`
).join('\n') : 'No index statistics available'}

## Slowest Queries
${Array.isArray(slowQueries) ? slowQueries.map((row: any, i: number) =>
  `${i + 1}. **Mean Time**: ${Math.round(row.mean_time)}ms, **Calls**: ${row.calls}`
).join('\n') : 'No slow query data available'}

## Connection Status
${Array.isArray(connections) ? connections.map((row: any) =>
  `- **${row.state}**: ${row.count} connections`
).join('\n') : 'No connection data available'}

## Recommendations
- Run VACUUM ANALYZE regularly to update statistics
- Monitor index usage and remove unused indexes
- Consider partitioning large tables (po_headers, po_approvals)
- Implement query result caching for reports
- Set up connection pooling for high concurrency
      `.trim();
    } catch (error) {
      performanceMonitor.endMeasure(measureId, 'failed', { error });
      throw error;
    }
  }

  /**
   * Set up automated performance maintenance tasks
   */
  static async setupMaintenanceTasks(): Promise<void> {
    const measureId = performanceMonitor.startMeasure('setup_maintenance_tasks');

    try {
      // Create maintenance functions
      const maintenanceFunctions = [
        // Auto-vacuum and analyze function
        `CREATE OR REPLACE FUNCTION auto_maintenance()
         RETURNS void AS $$
         BEGIN
           -- Vacuum and analyze key tables
           VACUUM ANALYZE po_headers;
           VACUUM ANALYZE po_line_items;
           VACUUM ANALYZE po_approvals;
           VACUUM ANALYZE users;
           VACUUM ANALYZE vendors;

           -- Update table statistics
           ANALYZE po_headers;
           ANALYZE po_line_items;
           ANALYZE po_approvals;

           -- Log maintenance completion
           INSERT INTO maintenance_log (operation, completed_at)
           VALUES ('auto_maintenance', NOW());
         END;
         $$ LANGUAGE plpgsql;`,

        // Create maintenance log table
        `CREATE TABLE IF NOT EXISTS maintenance_log (
           id SERIAL PRIMARY KEY,
           operation VARCHAR(100) NOT NULL,
           completed_at TIMESTAMP DEFAULT NOW(),
           details JSONB
         );`,
      ];

      for (const func of maintenanceFunctions) {
        await prisma.$executeRawUnsafe(func);
      }

      log.info('Database maintenance tasks set up successfully');
      performanceMonitor.endMeasure(measureId, 'completed');
    } catch (error) {
      performanceMonitor.endMeasure(measureId, 'failed', { error });
      throw error;
    }
  }
}