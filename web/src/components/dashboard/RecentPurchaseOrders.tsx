'use client';

import { usePurchaseOrders } from '@/hooks/api/usePurchaseOrders';
import { PONumberDisplay } from '@/components/mui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import DescriptionIcon from '@mui/icons-material/Description';

interface RecentPurchaseOrdersProps {
  limit?: number;
}

export function RecentPurchaseOrders({ limit = 5 }: RecentPurchaseOrdersProps) {
  const { data: purchaseOrders, isLoading, error } = usePurchaseOrders();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Purchase Orders</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[...Array(limit)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="50%" />
              </Box>
              <Skeleton variant="text" width="15%" />
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (error || !purchaseOrders) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recent Purchase Orders</Typography>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Failed to load recent purchase orders</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </Typography>
        </Box>
      </Paper>
    );
  }

  const recentPOs = Array.isArray(purchaseOrders)
    ? purchaseOrders.slice(0, limit)
    : [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
      DRAFT: 'default',
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
      COMPLETED: 'info',
    };
    return colors[status.toUpperCase()] || 'default';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Recent Purchase Orders</Typography>
        <Button size="small" sx={{ color: 'primary.main' }}>
          View All
        </Button>
      </Box>

      {recentPOs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <DescriptionIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography color="text.secondary">No purchase orders found</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
            Create your first purchase order to see it here
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recentPOs.map((po) => (
            <Paper
              key={po.id}
              variant="outlined"
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                '&:hover': { bgcolor: 'grey.50' },
                transition: 'background-color 0.2s'
              }}
            >
              <Box sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.lighter',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <DescriptionIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <PONumberDisplay poNumber={po.poNumber} size="small" />
                  <Chip label={po.status} size="small" color={getStatusColor(po.status)} />
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {po.vendorName}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {formatDate(po.requestedDate)}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(po.amount)}
                </Typography>
                {po.division && (
                  <Typography variant="caption" color="text.secondary">
                    {po.division}
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Paper>
  );
}
