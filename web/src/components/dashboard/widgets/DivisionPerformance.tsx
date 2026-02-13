'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Link as MuiLink,
} from '@mui/material';
import {
  Warning as AlertIcon,
  BarChart as ChartBarIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Remove as TrendNeutralIcon,
} from '@mui/icons-material';

interface DivisionMetric {
  division: {
    id: string;
    name: string;
    code: string;
  };
  metrics: {
    currentMonthSpend: number;
    currentMonthCount: number;
    ytdSpend: number;
    ytdCount: number;
    pendingApprovals: number;
    averagePOValue: number;
  };
}

interface CrossDivisionData {
  companyWide: {
    currentMonth: {
      totalSpend: number;
      totalCount: number;
      averagePOValue: number;
    };
    yearToDate: {
      totalSpend: number;
      totalCount: number;
    };
    alerts: {
      highValuePendingCount: number;
      approvalBottlenecks: number;
    };
  };
  divisionBreakdown: DivisionMetric[];
  approvalVelocity: Array<{
    divisionName: string;
    approvedCount: number;
    avgApprovalTimeHours: number;
  }>;
}

interface DivisionPerformanceProps {
  className?: string;
}

const TrendIcon = ({ value, isTime = false }: { value: number; isTime?: boolean }) => {
  const isGood = isTime ? value < 24 : value > 0;
  const isNeutral = isTime ? value >= 24 && value <= 48 : value === 0;

  if (isNeutral) {
    return <TrendNeutralIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
  }

  return isGood ? (
    <TrendUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
  ) : (
    <TrendDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
  );
};

export default function DivisionPerformance({ className = '' }: DivisionPerformanceProps) {
  const canViewCrossDivision = true;

  const { data, isLoading, error } = useQuery({
    queryKey: ['cross-division-kpis'],
    queryFn: async (): Promise<CrossDivisionData> => {
      const response = await fetch('/api/dashboards/cross-division');

      if (!response.ok) {
        throw new Error('Failed to fetch cross-division data');
      }

      const result = await response.json();
      return result.kpis;
    },
    enabled: canViewCrossDivision,
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  if (!canViewCrossDivision) {
    return null;
  }

  if (isLoading) {
    return (
      <Paper sx={{ borderRadius: 3 }} className={className}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ height: 24, bgcolor: 'grey.200', borderRadius: 1, width: '33%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </Box>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(4)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'pulse 1.5s ease-in-out infinite' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ height: 16, bgcolor: 'grey.200', borderRadius: 1, width: '25%', mb: 1 }} />
                <Box sx={{ height: 12, bgcolor: 'grey.200', borderRadius: 1, width: '50%' }} />
              </Box>
              <Box sx={{ height: 32, bgcolor: 'grey.200', borderRadius: 1, width: 64 }} />
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ borderRadius: 3, p: 3 }} className={className}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <AlertIcon />
          <Typography fontWeight={500}>Failed to load division performance</Typography>
        </Box>
      </Paper>
    );
  }

  if (!data) return null;

  const sortedDivisions = data.divisionBreakdown.sort(
    (a, b) => b.metrics.currentMonthSpend - a.metrics.currentMonthSpend
  );

  const velocityData = data.approvalVelocity.filter(v => v.approvedCount > 0);
  const fastestApproval = velocityData.reduce(
    (min, current) => current.avgApprovalTimeHours < min.avgApprovalTimeHours ? current : min,
    velocityData[0]
  );
  const slowestApproval = velocityData.reduce(
    (max, current) => current.avgApprovalTimeHours > max.avgApprovalTimeHours ? current : max,
    velocityData[0]
  );

  const hasAlerts = data.companyWide.alerts.highValuePendingCount > 0 ||
                   data.companyWide.alerts.approvalBottlenecks > 0;

  return (
    <Paper sx={{ borderRadius: 3 }} className={className}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ChartBarIcon />
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Division Performance
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current month overview
              </Typography>
            </Box>
          </Box>
          <Link href="/reports" passHref legacyBehavior>
            <MuiLink
              variant="body2"
              fontWeight={500}
              sx={{ color: '#ea580c', textDecoration: 'none', '&:hover': { color: '#c2410c' } }}
            >
              View reports
            </MuiLink>
          </Link>
        </Box>

        {/* Company-wide summary */}
        <Box sx={{ mt: 2, bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, lg: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Total Spend
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                ${(data.companyWide.currentMonth.totalSpend / 1000000).toFixed(1)}M
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Total POs
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {data.companyWide.currentMonth.totalCount}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Avg PO Value
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                ${(data.companyWide.currentMonth.averagePOValue / 1000).toFixed(0)}k
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasAlerts && <AlertIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Alerts
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color={hasAlerts ? 'warning.main' : 'success.main'}>
                    {hasAlerts ? data.companyWide.alerts.highValuePendingCount + data.companyWide.alerts.approvalBottlenecks : 0}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Division breakdown */}
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ mb: 2 }}>
          Division Breakdown
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {sortedDivisions.map((division) => {
            const efficiency = division.metrics.pendingApprovals === 0 ? 100 :
              Math.max(0, 100 - (division.metrics.pendingApprovals / division.metrics.currentMonthCount) * 100);

            return (
              <Paper
                key={division.division.id}
                variant="outlined"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 2,
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: '#fed7aa',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#c2410c' }}>
                      {division.division.code}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography fontWeight={500}>
                      {division.division.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        ${(division.metrics.currentMonthSpend / 1000).toFixed(0)}k spend
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {division.metrics.currentMonthCount} POs
                      </Typography>
                      {division.metrics.pendingApprovals > 0 && (
                        <Typography variant="caption" sx={{ color: 'warning.main' }}>
                          {division.metrics.pendingApprovals} pending
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <TrendIcon value={efficiency} />
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{
                        color: efficiency >= 90 ? 'success.main' :
                               efficiency >= 75 ? 'warning.main' : 'error.main'
                      }}
                    >
                      {efficiency.toFixed(0)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    efficiency
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>

        {/* Approval velocity highlights */}
        {velocityData.length > 0 && (
          <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ mb: 1.5 }}>
              Approval Velocity
            </Typography>
            <Grid container spacing={2}>
              {fastestApproval && (
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2, p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <TrendIcon value={fastestApproval.avgApprovalTimeHours} isTime={true} />
                      <Typography variant="body2" fontWeight={500} sx={{ color: '#166534' }}>
                        Fastest
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#15803d' }}>
                      {fastestApproval.divisionName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#16a34a' }}>
                      {fastestApproval.avgApprovalTimeHours.toFixed(1)} hours avg
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {slowestApproval && slowestApproval !== fastestApproval && (
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ bgcolor: '#fef2f2', borderColor: '#fecaca', borderRadius: 2, p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <TrendIcon value={slowestApproval.avgApprovalTimeHours} isTime={true} />
                      <Typography variant="body2" fontWeight={500} sx={{ color: '#991b1b' }}>
                        Needs attention
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#b91c1c' }}>
                      {slowestApproval.divisionName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#dc2626' }}>
                      {slowestApproval.avgApprovalTimeHours.toFixed(1)} hours avg
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
