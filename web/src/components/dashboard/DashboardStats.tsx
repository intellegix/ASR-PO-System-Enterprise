'use client';

import { useDashboardStats } from '@/hooks/api/useReports';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatsCard({ title, value, subtitle, icon, trend }: StatsCardProps) {
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" fontWeight="medium" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mt: 0.5 }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ color: 'grey.400' }}>
            {icon}
          </Box>
        )}
      </Box>

      {trend && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={{ color: trend.isPositive ? 'success.main' : 'error.main' }}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>from last month</Typography>
        </Box>
      )}
    </Paper>
  );
}

interface DashboardStatsProps {
  dateRange?: { start: string; end: string };
}

export function DashboardStats({ dateRange }: DashboardStatsProps) {
  const { data: stats, isLoading, error } = useDashboardStats(dateRange);

  if (isLoading) {
    return (
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {[...Array(4)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={40} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="80%" height={20} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error || !stats) {
    return (
      <Alert severity="error">
        Failed to load dashboard statistics
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </Typography>
      </Alert>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatsCard
          title="Total Purchase Orders"
          value={stats.totalPOs}
          subtitle="This period"
          icon={<DescriptionIcon sx={{ fontSize: 32 }} />}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          subtitle="Awaiting review"
          icon={<AccessTimeIcon sx={{ fontSize: 32 }} />}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatsCard
          title="Total Spending"
          value={formatCurrency(stats.totalSpending)}
          subtitle="This period"
          icon={<AttachMoneyIcon sx={{ fontSize: 32 }} />}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatsCard
          title="Active Vendors"
          value={stats.activeVendors}
          subtitle="In system"
          icon={<BusinessIcon sx={{ fontSize: 32 }} />}
        />
      </Grid>
    </Grid>
  );
}
