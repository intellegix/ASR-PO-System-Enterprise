'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface KPIData {
  timeframe: {
    period: string;
    label: string;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalSpend: number;
    totalCount: number;
    averagePOValue: number;
    pendingCount: number;
    pendingAmount: number;
  };
  status: Record<string, number>;
  alerts: {
    highValuePending: number;
    approvalBottlenecks: number;
  };
  scope: {
    divisionId: string | null;
    divisionName: string | null;
    isCompanyWide: boolean;
  };
}

interface KPIMetricsProps {
  divisionId?: string;
  timeframe?: 'current_month' | 'ytd' | 'last_30_days';
  className?: string;
}

const TrendIcon = ({ isPositive, isNeutral }: { isPositive: boolean; isNeutral: boolean }) => {
  if (isNeutral) return <TrendingFlatIcon sx={{ width: 16, height: 16, color: 'text.secondary' }} />;
  return isPositive ? (
    <TrendingUpIcon sx={{ width: 16, height: 16, color: 'success.main' }} />
  ) : (
    <TrendingDownIcon sx={{ width: 16, height: 16, color: 'error.main' }} />
  );
};

export default function KPIMetrics({ divisionId, timeframe = 'current_month', className = '' }: KPIMetricsProps) {
  const [refreshInterval, _setRefreshInterval] = useState<number | false>(5 * 60 * 1000); // 5 minutes

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['kpis', divisionId, timeframe],
    queryFn: async (): Promise<{ kpis: KPIData; lastUpdated: string }> => {
      const params = new URLSearchParams();
      if (divisionId) params.append('divisionId', divisionId);
      params.append('timeframe', timeframe);
      params.append('includeHealth', 'false');

      const response = await fetch(`/api/dashboards/kpis?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch KPI data');
      }

      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 60 * 1000, // 1 minute
    retry: 3,
  });

  // Manual refresh function
  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Grid container spacing={2} className={className}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 2.5 }}>
              <Box sx={{ height: 16, bgcolor: 'grey.200', borderRadius: 1, mb: 1.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <Box sx={{ height: 32, bgcolor: 'grey.200', borderRadius: 1, mb: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <Box sx={{ height: 12, bgcolor: 'grey.200', borderRadius: 1, width: '66%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        className={className}
        action={
          <Button onClick={handleRefresh} size="small" color="inherit">
            Try Again
          </Button>
        }
        icon={<WarningAmberIcon />}
      >
        <Typography variant="body2" fontWeight={500}>Failed to load KPI data</Typography>
        <Typography variant="caption">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </Typography>
      </Alert>
    );
  }

  const kpis = data?.kpis;
  if (!kpis) return null;

  // Calculate some derived metrics for trends
  const avgPOValue = kpis.metrics.totalCount > 0 ? kpis.metrics.totalSpend / kpis.metrics.totalCount : 0;
  const pendingRate = kpis.metrics.totalCount > 0 ? (kpis.metrics.pendingCount / kpis.metrics.totalCount) * 100 : 0;
  const hasAlerts = kpis.alerts.highValuePending > 0 || kpis.alerts.approvalBottlenecks > 0;

  return (
    <Box className={className}>
      {/* Header with timeframe and refresh */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {kpis.scope.divisionName || 'Company-wide'} Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary">{kpis.timeframe.label}</Typography>
        </Box>
        <Button variant="text" size="small" onClick={handleRefresh}>
          Refresh
        </Button>
      </Box>

      {/* Alerts banner */}
      {hasAlerts && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningAmberIcon />}>
          <Typography variant="body2" fontWeight={500}>Attention Required</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {kpis.alerts.highValuePending > 0 && (
              <Typography component="li" variant="body2">
                {kpis.alerts.highValuePending} high-value POs pending approval ($25K+)
              </Typography>
            )}
            {kpis.alerts.approvalBottlenecks > 0 && (
              <Typography component="li" variant="body2">
                {kpis.alerts.approvalBottlenecks} POs pending {'>'} 24 hours
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {/* KPI Grid */}
      <Grid container spacing={2}>
        {/* Pending Approval */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper
            component={Link}
            href="/approvals"
            sx={{
              p: 2.5,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: 3 },
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Pending Approval</Typography>
            <Typography variant="h4" fontWeight="bold">{kpis.metrics.pendingCount}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography variant="caption" fontWeight={500} color={hasAlerts ? 'warning.main' : 'text.secondary'}>
                ${(kpis.metrics.pendingAmount / 1000).toFixed(0)}k value
              </Typography>
              {hasAlerts && <WarningAmberIcon sx={{ width: 14, height: 14, color: 'warning.main' }} />}
            </Box>
          </Paper>
        </Grid>

        {/* Total POs */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Total POs</Typography>
            <Typography variant="h4" fontWeight="bold">{kpis.metrics.totalCount || 0}</Typography>
            {kpis.metrics.totalCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <TrendIcon
                  isPositive={pendingRate < 20}
                  isNeutral={pendingRate >= 20 && pendingRate <= 30}
                />
                <Typography
                  variant="caption"
                  fontWeight={500}
                  color={
                    pendingRate < 20 ? 'success.main' :
                    pendingRate <= 30 ? 'text.secondary' : 'error.main'
                  }
                >
                  {pendingRate.toFixed(0)}% pending
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Total Spend */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{kpis.timeframe.label} Spend</Typography>
            <Typography variant="h4" fontWeight="bold">
              {kpis.metrics.totalSpend === 0 ? '$0' :
                `$${kpis.metrics.totalSpend >= 1000000
                  ? `${(kpis.metrics.totalSpend / 1000000).toFixed(1)}M`
                  : `${(kpis.metrics.totalSpend / 1000).toFixed(0)}k`
                }`
              }
            </Typography>
            {kpis.metrics.totalCount > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Avg: ${avgPOValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Average PO Value */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Avg PO Value</Typography>
            <Typography variant="h4" fontWeight="bold">
              {kpis.metrics.totalCount === 0 ? '$0' :
                `$${avgPOValue >= 10000
                  ? `${(avgPOValue / 1000).toFixed(0)}k`
                  : avgPOValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                }`
              }
            </Typography>
            {kpis.metrics.totalCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <TrendIcon
                  isPositive={avgPOValue > 5000}
                  isNeutral={avgPOValue >= 1000 && avgPOValue <= 5000}
                />
                <Typography
                  variant="caption"
                  fontWeight={500}
                  color={
                    avgPOValue > 5000 ? 'success.main' :
                    avgPOValue >= 1000 ? 'text.secondary' : 'warning.main'
                  }
                >
                  Active
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Status Breakdown */}
      {Object.keys(kpis.status).length > 0 && (
        <Paper sx={{ mt: 2, bgcolor: 'grey.50', p: 2 }}>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1.5 }}>PO Status Breakdown</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {Object.entries(kpis.status).map(([status, count]) => (
              <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor:
                      status === 'Draft' ? 'grey.400' :
                      status === 'Submitted' ? 'warning.main' :
                      status === 'Approved' ? 'success.main' :
                      status === 'Issued' ? 'info.main' :
                      status === 'Received' ? 'secondary.main' :
                      'grey.400',
                  }}
                />
                <Typography variant="body2">
                  {status}: <Typography component="span" fontWeight={500}>{count}</Typography>
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Last updated */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1.5 }}>
        Last updated: {new Date(data.lastUpdated).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' })}
      </Typography>
    </Box>
  );
}
