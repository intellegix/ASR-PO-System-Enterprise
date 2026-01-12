"use client";

import React, { useState, useEffect } from 'react';
// Replaced shadcn/ui Card components with simple divs for TypeScript compatibility
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);
const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
);
const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

/**
 * Performance Monitoring Dashboard
 * Phase 4C Performance Validation - System Health and Performance Tracking
 */

interface SystemMetrics {
  // Response time metrics
  dashboard: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };

  // API performance metrics
  api: {
    averageResponseTime: number;
    p95ResponseTime: number;
    throughput: number; // requests per minute
    errorRate: number;
  };

  // Report generation metrics
  reports: {
    averageGenerationTime: number;
    p95GenerationTime: number;
    exportErrorRate: number;
    activeExports: number;
  };

  // System resources
  system: {
    memoryUsageMB: number;
    maxMemoryMB: number;
    memoryUsagePercent: number;
    activeConnections: number;
    cacheHitRate: number;
  };

  // Database performance
  database: {
    averageQueryTime: number;
    slowQueries: number;
    connectionPoolUtilization: number;
  };

  lastUpdated: string;
}

const PerformanceMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Phase 4C Performance Targets
  const PERFORMANCE_TARGETS = {
    dashboard: { target: 2000, warning: 1500 }, // 2s target, 1.5s warning
    api: { target: 500, warning: 300 }, // 500ms target, 300ms warning
    reports: { target: 10000, warning: 7500 }, // 10s target, 7.5s warning
    errorRate: { target: 1, warning: 0.5 }, // 1% target, 0.5% warning
    memoryUsage: { target: 80, warning: 60 } // 80% target, 60% warning
  };

  const fetchMetrics = async () => {
    try {
      setError(null);
      const response = await fetch('/api/monitoring/performance-metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SystemMetrics = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      console.error('Performance metrics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (value: number, target: number, warning: number, higherIsBetter = false): string => {
    if (higherIsBetter) {
      if (value >= target) return 'text-green-600';
      if (value >= warning) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value <= warning) return 'text-green-600';
      if (value <= target) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getStatusIcon = (value: number, target: number, warning: number, higherIsBetter = false): string => {
    if (higherIsBetter) {
      if (value >= target) return '✅';
      if (value >= warning) return '⚠️';
      return '❌';
    } else {
      if (value <= warning) return '✅';
      if (value <= target) return '⚠️';
      return '❌';
    }
  };

  const formatTime = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Performance Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Performance Monitoring</h2>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Metrics</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  return (
    <div className="p-6">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performance Monitoring</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm">Auto-refresh</label>
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
          <button
            onClick={fetchMetrics}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

        {/* Dashboard Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">📊</span>
              Dashboard Performance
            </CardTitle>
            <CardDescription>Phase 4C Target: &lt;2s response time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Average Response</span>
                <span className={getStatusColor(metrics.dashboard.averageResponseTime, PERFORMANCE_TARGETS.dashboard.target, PERFORMANCE_TARGETS.dashboard.warning)}>
                  {getStatusIcon(metrics.dashboard.averageResponseTime, PERFORMANCE_TARGETS.dashboard.target, PERFORMANCE_TARGETS.dashboard.warning)}
                  {formatTime(metrics.dashboard.averageResponseTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>95th Percentile</span>
                <span>{formatTime(metrics.dashboard.p95ResponseTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Error Rate</span>
                <span className={getStatusColor(metrics.dashboard.errorRate, PERFORMANCE_TARGETS.errorRate.target, PERFORMANCE_TARGETS.errorRate.warning)}>
                  {formatPercent(metrics.dashboard.errorRate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">⚡</span>
              API Performance
            </CardTitle>
            <CardDescription>Phase 4C Target: &lt;500ms response time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Average Response</span>
                <span className={getStatusColor(metrics.api.averageResponseTime, PERFORMANCE_TARGETS.api.target, PERFORMANCE_TARGETS.api.warning)}>
                  {getStatusIcon(metrics.api.averageResponseTime, PERFORMANCE_TARGETS.api.target, PERFORMANCE_TARGETS.api.warning)}
                  {formatTime(metrics.api.averageResponseTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Throughput</span>
                <span>{metrics.api.throughput}/min</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Error Rate</span>
                <span className={getStatusColor(metrics.api.errorRate, PERFORMANCE_TARGETS.errorRate.target, PERFORMANCE_TARGETS.errorRate.warning)}>
                  {formatPercent(metrics.api.errorRate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">📈</span>
              Report Generation
            </CardTitle>
            <CardDescription>Phase 4C Target: &lt;10s generation time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Average Generation</span>
                <span className={getStatusColor(metrics.reports.averageGenerationTime, PERFORMANCE_TARGETS.reports.target, PERFORMANCE_TARGETS.reports.warning)}>
                  {getStatusIcon(metrics.reports.averageGenerationTime, PERFORMANCE_TARGETS.reports.target, PERFORMANCE_TARGETS.reports.warning)}
                  {formatTime(metrics.reports.averageGenerationTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Active Exports</span>
                <span>{metrics.reports.activeExports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Export Error Rate</span>
                <span className={getStatusColor(metrics.reports.exportErrorRate, PERFORMANCE_TARGETS.errorRate.target, PERFORMANCE_TARGETS.errorRate.warning)}>
                  {formatPercent(metrics.reports.exportErrorRate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">💻</span>
              System Resources
            </CardTitle>
            <CardDescription>Memory usage and cache performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Memory Usage</span>
                <span className={getStatusColor(metrics.system.memoryUsagePercent, PERFORMANCE_TARGETS.memoryUsage.target, PERFORMANCE_TARGETS.memoryUsage.warning)}>
                  {getStatusIcon(metrics.system.memoryUsagePercent, PERFORMANCE_TARGETS.memoryUsage.target, PERFORMANCE_TARGETS.memoryUsage.warning)}
                  {formatPercent(metrics.system.memoryUsagePercent)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cache Hit Rate</span>
                <span className={getStatusColor(metrics.system.cacheHitRate, 80, 90, true)}>
                  {formatPercent(metrics.system.cacheHitRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Active Connections</span>
                <span>{metrics.system.activeConnections}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">🗄️</span>
              Database Performance
            </CardTitle>
            <CardDescription>Query performance and connection health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Avg Query Time</span>
                <span className={getStatusColor(metrics.database.averageQueryTime, 100, 50)}>
                  {getStatusIcon(metrics.database.averageQueryTime, 100, 50)}
                  {formatTime(metrics.database.averageQueryTime)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Slow Queries</span>
                <span className={getStatusColor(metrics.database.slowQueries, 5, 2)}>
                  {metrics.database.slowQueries}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pool Utilization</span>
                <span className={getStatusColor(metrics.database.connectionPoolUtilization, 80, 60)}>
                  {formatPercent(metrics.database.connectionPoolUtilization)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <span className="mr-2">🎯</span>
              Phase 4C Compliance
            </CardTitle>
            <CardDescription>Performance targets achievement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Dashboard Target</span>
                <span>{metrics.dashboard.averageResponseTime <= PERFORMANCE_TARGETS.dashboard.target ? '✅' : '❌'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>API Target</span>
                <span>{metrics.api.averageResponseTime <= PERFORMANCE_TARGETS.api.target ? '✅' : '❌'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Reports Target</span>
                <span>{metrics.reports.averageGenerationTime <= PERFORMANCE_TARGETS.reports.target ? '✅' : '❌'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Error Rate Target</span>
                <span>{Math.max(metrics.dashboard.errorRate, metrics.api.errorRate) <= PERFORMANCE_TARGETS.errorRate.target ? '✅' : '❌'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last updated timestamp */}
      <div className="text-sm text-gray-500 text-center">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default PerformanceMonitoringDashboard;