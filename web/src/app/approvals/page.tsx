'use client';

// Force dynamic rendering since this page requires authentication and makes API calls
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { PONumberDisplay } from '@/components/mui';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';

interface PendingPO {
  id: string;
  po_number: string;
  status: string;
  total_amount: string | number;
  created_at: string;
  required_by_date: string | null;
  requiresOwnerApproval: boolean;
  canApprove: boolean;
  lineItemCount: number;
  vendors: {
    vendor_name: string;
    vendor_code: string;
  } | null;
  projects: {
    project_code: string;
    project_name: string;
  } | null;
  divisions: {
    division_name: string;
    division_code: string;
  } | null;
  users_po_headers_requested_by_idTousers: {
    id: string;
    name: string;
  } | null;
}

const OWNER_APPROVAL_THRESHOLD = 25000;

export default function ApprovalsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Approvals | ASR PO System';
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingPOs();
    }
  }, [isAuthenticated]);

  const fetchPendingPOs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/po/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingPOs(data);
      }
    } catch (error) {
      console.error('Error fetching pending POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (poId: string, action: 'approve' | 'reject', notes?: string) => {
    setActionLoading(poId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/po/${poId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        setPendingPOs((prev) => prev.filter((po) => po.id !== poId));
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (_err) {
      setError('Failed to perform action');
    } finally {
      setActionLoading(null);
    }
  };

  const quickApprove = (po: PendingPO) => {
    if (!po.canApprove) {
      setError('You do not have permission to approve this PO');
      return;
    }
    performAction(po.id, 'approve');
  };

  const quickReject = (po: PendingPO) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason !== null) {
      performAction(po.id, 'reject', reason);
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <AppLayout pageTitle="Approvals">
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        {/* Pending count */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {pendingPOs.length} PO{pendingPOs.length !== 1 ? 's' : ''} awaiting your review
        </Typography>

        {/* Alerts */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <IconButton size="small" onClick={() => setError(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <IconButton size="small" onClick={() => setSuccessMessage(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {successMessage}
          </Alert>
        )}

        {/* Content */}
        {loading ? (
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </CardContent>
          </Card>
        ) : pendingPOs.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.light', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                All caught up!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No purchase orders are waiting for your approval.
              </Typography>
              <Button component={Link} href="/po" color="primary">
                View all POs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pendingPOs.map((po) => {
              const poAmount = typeof po.total_amount === 'string' ? parseFloat(po.total_amount) : po.total_amount;
              const isHighValue = poAmount > OWNER_APPROVAL_THRESHOLD;
              const isLoading = actionLoading === po.id;

              return (
                <Card
                  key={po.id}
                  sx={{
                    border: 1,
                    borderColor: isHighValue ? 'warning.light' : 'divider',
                  }}
                >
                  {isHighValue && (
                    <Box sx={{ bgcolor: '#fffbeb', px: 2, py: 1, borderBottom: 1, borderColor: '#fde68a', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.dark' }} />
                      <Typography variant="caption" sx={{ fontWeight: 500, color: 'warning.dark' }}>
                        High-value PO - Requires Owner Approval
                      </Typography>
                    </Box>
                  )}

                  <CardContent sx={{ p: 2.5 }}>
                    {/* Header Row */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Link href={`/po/view?id=${po.id}`} style={{ textDecoration: 'none' }}>
                            <PONumberDisplay poNumber={po.po_number} size="medium" />
                          </Link>
                          {!po.vendors && (
                            <Chip label="Needs Vendor Info" size="small" color="warning" variant="outlined" />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {po.vendors?.vendor_name || 'TBD'} &bull; {po.divisions?.division_name}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatCurrency(po.total_amount)}</Typography>
                        <Typography variant="caption" color="text.secondary">{po.lineItemCount} line items</Typography>
                      </Box>
                    </Box>

                    {/* Details Row */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Project</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{po.projects?.project_code || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Requested By</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{po.users_po_headers_requested_by_idTousers?.name || '-'}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Submitted</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{getTimeAgo(po.created_at)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Required By</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{formatDate(po.required_by_date)}</Typography>
                      </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Button
                        component={Link}
                        href={`/po/view?id=${po.id}`}
                        variant="outlined"
                        color="secondary"
                        startIcon={<VisibilityIcon />}
                        size="small"
                      >
                        View Details
                      </Button>

                      {po.canApprove ? (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => quickApprove(po)}
                            disabled={isLoading}
                            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutlineIcon />}
                            size="small"
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => quickReject(po)}
                            disabled={isLoading}
                            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <CancelOutlinedIcon />}
                            size="small"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Chip
                          icon={<WarningAmberIcon />}
                          label={isHighValue ? 'Owner approval required' : 'Cannot approve'}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </AppLayout>
  );
}
