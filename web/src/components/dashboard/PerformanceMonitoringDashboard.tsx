"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

/**
 * Performance Monitoring Dashboard
 * Phase 4C Performance Validation - System Health and Performance Tracking
 */

interface SystemMetrics {
  dashboard: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };

  api: {
    averageResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
    errorRate: number;
  };

  reports: {
    averageGenerationTime: number;
    p95GenerationTime: number;
    exportErrorRate: number;
    activeExports: number;
  };

  system: {
    memoryUsageMB: number;
    maxMemoryMB: number;
    memoryUsagePercent: number;
    activeConnections: number;
    cacheHitRate: number;
  };

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
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const PERFORMANCE_TARGETS = {
    dashboard: { target: 2000, warning: 1500 },
    api: { target: 500, warning: 300 },
    reports: { target: 10000, warning: 7500 },
    errorRate: { target: 1, warning: 0.5 },
    memoryUsage: { target: 80, warning: 60 }
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
      if (value >= target) return 'success.main';
      if (value >= warning) return 'warning.main';
      return 'error.main';
    } else {
      if (value <= warning) return 'success.main';
      if (value <= target) return 'warning.main';
      return 'error.main';
    }
  };

  const getStatusIcon = (value: number, target: number, warning: number, higherIsBetter = false) => {
    if (higherIsBetter) {
      if (value >= target) return <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      if (value >= warning) return <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
      return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
    } else {
      if (value <= warning) return <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      if (value <= target) return <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
      return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
    }
  };

  const formatTime = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
          Performance Monitoring
        </Typography>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
              <Card sx={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                <CardHeader
                  title={<Box sx={{ height: 16, bgcolor: 'grey.200', borderRadius: 1, width: '50%' }} />}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ height: 32, bgcolor: 'grey.200', borderRadius: 1 }} />
                    <Box sx={{ height: 16, bgcolor: 'grey.200', borderRadius: 1, width: '75%' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
          Performance Monitoring
        </Typography>
        <Card sx={{ borderColor: 'error.main', bgcolor: '#fef2f2' }}>
          <CardHeader
            title={<Typography color="error.dark">Error Loading Metrics</Typography>}
            subheader={<Typography color="error.main">{error}</Typography>}
          />
          <CardContent>
            <Button onClick={fetchMetrics} variant="contained" color="error">
              Retry
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!metrics) {
    return <Box>No metrics available</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Performance Monitoring
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Auto-refresh</Typography>}
          />
          <TextField
            select
            size="small"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
            sx={{ minWidth: 80 }}
          >
            <MenuItem value={15}>15s</MenuItem>
            <MenuItem value={30}>30s</MenuItem>
            <MenuItem value={60}>1m</MenuItem>
            <MenuItem value={300}>5m</MenuItem>
          </TextField>
          <Button
            onClick={fetchMetrics}
            variant="contained"
            size="small"
            startIcon={<RefreshIcon />}
          >
            Refresh Now
          </Button>
        </Box>
      </Box>

      {/* Performance Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Dashboard Performance */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>📊</Typography>
                  <Typography variant="h6">Dashboard Performance</Typography>
                </Box>
              }
              subheader="Phase 4C Target: <2s response time"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Average Response</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getStatusIcon(metrics.dashboard.averageResponseTime, PERFORMANCE_TARGETS.dashboard.target, PERFORMANCE_TARGETS.dashboard.warning)}
                    <Typography sx={{ color: getStatusColor(metrics.dashboard.averageResponseTime, PERFORMANCE_TARGETS.dashboard.target, PERFORMANCE_TARGETS.dashboard.warning) }}>
                      {formatTime(metrics.dashboard.averageResponseTime)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>95th Percentile</Typography>
                  <Typography>{formatTime(metrics.dashboard.p95ResponseTime)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Error Rate</Typography>
                  <Typography sx={{ color: getStatusColor(metrics.dashboard.errorRate, PERFORMANCE_TARGETS.errorRate.target, PERFORMANCE_TARGETS.errorRate.warning) }}>
                    {formatPercent(metrics.dashboard.errorRate)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* API Performance */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>⚡</Typography>
                  <Typography variant="h6">API Performance</Typography>
                </Box>
              }
              subheader="Phase 4C Target: <500ms response time"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Average Response</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getStatusIcon(metrics.api.averageResponseTime, PERFORMANCE_TARGETS.api.target, PERFORMANCE_TARGETS.api.warning)}
                    <Typography sx={{ color: getStatusColor(metrics.api.averageResponseTime, PERFORMANCE_TARGETS.api.target, PERFORMANCE_TARGETS.api.warning) }}>
                      {formatTime(metrics.api.averageResponseTime)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Throughput</Typography>
                  <Typography>{metrics.api.throughput}/min</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Error Rate</Typography>
                  <Typography sx={{ color: getStatusColor(metrics.api.errorRate, PERFORMANCE_TARGETS.errorRate.target, PERFORMANCE_TARGETS.errorRate.warning) }}>
                    {formatPercent(metrics.api.errorRate)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Report Generation */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>📈</Typography>
                  <Typography variant="h6">Report Generation</Typography>
                </Box>
              }
              subheader="Phase 4C Target: <10s generation time"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Average Generation</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getStatusIcon(metrics.reports.averageGenerationTime, PERFORMANCE_TARGETS.reports.target, PERFORMANCE_TARGETS.reports.warning)}
                    <Typography sx={{ color: getStatusColor(metrics.reports.averageGenerationTime, PERFORMANCE_TARGETS.reports.target, PERFORMANCE_TARGETS.reports.warning) }}>
                      {formatTime(metrics.reports.averageGenerationTime)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Active Exports</Typography>
                  <Typography>{metrics.reports.activeExports}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Export Error Rate</Typography>
                  <Typography sx={{ color: getStatusColor(metrics.reports.exportErrorRate, PERFORMANCE_TARGETS.errorRate.target, PERFORMANCE_TARGETS.errorRate.warning) }}>
                    {formatPercent(metrics.reports.exportErrorRate)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Resources */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>💻</Typography>
                  <Typography variant="h6">System Resources</Typography>
                </Box>
              }
              subheader="Memory usage and cache performance"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Memory Usage</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getStatusIcon(metrics.system.memoryUsagePercent, PERFORMANCE_TARGETS.memoryUsage.target, PERFORMANCE_TARGETS.memoryUsage.warning)}
                    <Typography sx={{ color: getStatusColor(metrics.system.memoryUsagePercent, PERFORMANCE_TARGETS.memoryUsage.target, PERFORMANCE_TARGETS.memoryUsage.warning) }}>
                      {formatPercent(metrics.system.memoryUsagePercent)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Cache Hit Rate</Typography>
                  <Typography sx={{ color: getStatusColor(metrics.system.cacheHitRate, 80, 90, true) }}>
                    {formatPercent(metrics.system.cacheHitRate)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Active Connections</Typography>
                  <Typography>{metrics.system.activeConnections}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Performance */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>🗄️</Typography>
                  <Typography variant="h6">Database Performance</Typography>
                </Box>
              }
              subheader="Query performance and connection health"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Avg Query Time</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getStatusIcon(metrics.database.averageQueryTime, 100, 50)}
                    <Typography sx={{ color: getStatusColor(metrics.database.averageQueryTime, 100, 50) }}>
                      {formatTime(metrics.database.averageQueryTime)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Slow Queries</Typography>
                  <Typography sx={{ color: getStatusColor(metrics.database.slowQueries, 5, 2) }}>
                    {metrics.database.slowQueries}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Pool Utilization</Typography>
                  <Typography sx={{ color: getStatusColor(metrics.database.connectionPoolUtilization, 80, 60) }}>
                    {formatPercent(metrics.database.connectionPoolUtilization)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Overall System Health */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card>
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>🎯</Typography>
                  <Typography variant="h6">Phase 4C Compliance</Typography>
                </Box>
              }
              subheader="Performance targets achievement"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Dashboard Target</Typography>
                  <Typography>{metrics.dashboard.averageResponseTime <= PERFORMANCE_TARGETS.dashboard.target ? '✅' : '❌'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>API Target</Typography>
                  <Typography>{metrics.api.averageResponseTime <= PERFORMANCE_TARGETS.api.target ? '✅' : '❌'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Reports Target</Typography>
                  <Typography>{metrics.reports.averageGenerationTime <= PERFORMANCE_TARGETS.reports.target ? '✅' : '❌'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>Error Rate Target</Typography>
                  <Typography>{Math.max(metrics.dashboard.errorRate, metrics.api.errorRate) <= PERFORMANCE_TARGETS.errorRate.target ? '✅' : '❌'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Last updated timestamp */}
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </Typography>
    </Box>
  );
};

export default PerformanceMonitoringDashboard;
