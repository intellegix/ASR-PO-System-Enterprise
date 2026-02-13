'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PONumberDisplay } from '@/components/mui';
import { Box, Paper, Typography, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface PendingApprovalItem {
  id: string;
  poNumber: string;
  amount: number;
  status: string;
  division: {
    id: string;
    name: string;
    code: string;
  };
  vendor: {
    name: string;
    code: string;
  };
  timing: {
    createdAt: string;
    daysPending: number;
    requiredByDate?: string;
    isOverdue: boolean;
  };
  urgency: {
    score: number;
    level: 'critical' | 'high' | 'medium' | 'low';
  };
  approval: {
    canApprove: boolean;
    reason?: string;
    requiresOwnerApproval: boolean;
  };
  preview: {
    itemsCount: number;
    firstItems: string[];
    notes?: string;
  };
}

interface PendingApprovalsData {
  summary: {
    total: number;
    byUrgency: Record<string, number>;
    totalValue: number;
    averageAge: number;
    actionable: number;
  };
  items: PendingApprovalItem[];
}

interface PendingApprovalsProps {
  limit?: number;
  urgencyFilter?: 'critical' | 'high' | 'medium' | 'low';
  className?: string;
}

const UrgencyBadge = ({ level, score }: { level: string; score: number }) => {
  const getColor = () => {
    switch (level) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  };

  return (
    <Chip
      label={`${level} (${score})`}
      color={getColor()}
      size="small"
      sx={{ fontSize: '0.75rem', height: 20 }}
    />
  );
};

export default function PendingApprovals({ limit = 10, urgencyFilter, className = '' }: PendingApprovalsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-approvals', urgencyFilter, limit],
    queryFn: async (): Promise<PendingApprovalsData> => {
      const params = new URLSearchParams();
      if (urgencyFilter) params.append('urgencyLevel', urgencyFilter);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/dashboards/pending-approvals?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }

      const result = await response.json();
      return {
        summary: result.summary,
        items: result.items,
      };
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });

  if (isLoading) {
    return (
      <Paper className={className}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ height: 24, bgcolor: 'grey.200', borderRadius: 1, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ px: 3, py: 2, animation: 'pulse 1.5s ease-in-out infinite' }}>
              <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ height: 16, bgcolor: 'grey.200', borderRadius: 1, width: '33%' }} />
                  <Box sx={{ height: 12, bgcolor: 'grey.200', borderRadius: 1, width: '67%' }} />
                </Box>
                <Box sx={{ height: 24, bgcolor: 'grey.200', borderRadius: 1, width: 64 }} />
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className={className} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', mb: 1 }}>
          <WarningIcon />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>Failed to load pending approvals</Typography>
        </Box>
        <Typography variant="body2" color="error.light">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </Typography>
      </Paper>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Paper className={className}>
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Pending Approvals</Typography>
        </Box>
        <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ width: 32, height: 32, color: 'success.main', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary">No pending approvals</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>All POs are up to date!</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper className={className}>
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Pending Approvals</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {data.summary.total} items • ${(data.summary.totalValue / 1000).toFixed(0)}k total value
            </Typography>
          </Box>
          <Link href="/approvals" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500, '&:hover': { color: 'warning.dark' } }}>
              View all
            </Typography>
          </Link>
        </Box>

        {/* Summary stats */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, bgcolor: 'error.main', borderRadius: '50%' }} />
            <Typography variant="caption" color="text.secondary">
              Critical: {data.summary.byUrgency.critical || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, bgcolor: 'warning.main', borderRadius: '50%' }} />
            <Typography variant="caption" color="text.secondary">
              High: {data.summary.byUrgency.high || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ width: 16, height: 16 }} />
            <Typography variant="caption" color="text.secondary">
              Avg age: {data.summary.averageAge.toFixed(1)} days
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Pending items list */}
      <Box sx={{ maxHeight: 384, overflowY: 'auto' }}>
        {data.items.slice(0, limit).map((item) => (
          <Link
            key={item.id}
            href={`/po/view?id=${item.id}`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: 1,
                borderColor: 'divider',
                transition: 'background-color 0.2s',
                '&:hover': {
                  bgcolor: 'grey.50'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* PO Number and Vendor */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PONumberDisplay poNumber={item.poNumber} size="small" />
                    <UrgencyBadge level={item.urgency.level} score={item.urgency.score} />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.vendor.name} • {item.division.name}
                  </Typography>

                  {/* Preview and timing */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.preview.itemsCount} items
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ width: 12, height: 12 }} />
                      <Typography variant="caption" color="text.secondary">
                        {item.timing.daysPending} day{item.timing.daysPending !== 1 ? 's' : ''} pending
                      </Typography>
                    </Box>
                    {item.timing.isOverdue && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WarningIcon sx={{ width: 12, height: 12, color: 'error.main' }} />
                        <Typography variant="caption" color="error.main">Overdue</Typography>
                      </Box>
                    )}
                  </Box>

                  {/* First items preview */}
                  {item.preview.firstItems.length > 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.preview.firstItems.slice(0, 2).join(', ')}
                      {item.preview.itemsCount > 2 && '...'}
                    </Typography>
                  )}
                </Box>

                {/* Amount and approval status */}
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    ${item.amount >= 1000000
                      ? `${(item.amount / 1000000).toFixed(1)}M`
                      : `${(item.amount / 1000).toFixed(0)}k`
                    }
                  </Typography>

                  {/* Approval capability indicator */}
                  <Box sx={{ mt: 0.5 }}>
                    {item.approval.canApprove ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ width: 12, height: 12, color: 'success.main' }} />
                        <Typography variant="caption" color="success.main">Can approve</Typography>
                      </Box>
                    ) : item.approval.requiresOwnerApproval ? (
                      <Typography variant="caption" color="warning.main">Owner approval</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">View only</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Link>
        ))}
      </Box>

      {/* Show more link if there are more items */}
      {data.summary.total > limit && (
        <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Link href="/approvals" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 500, '&:hover': { color: 'warning.dark' } }}>
              View {data.summary.total - limit} more pending approvals →
            </Typography>
          </Link>
        </Box>
      )}
    </Paper>
  );
}
