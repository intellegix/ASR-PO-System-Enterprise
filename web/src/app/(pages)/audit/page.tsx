'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuditTrail from '@/components/audit/AuditTrail';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShieldIcon from '@mui/icons-material/Shield';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';

export default function AuditPage() {
  const { user, isAuthenticated } = useAuth();

  const _userRole = user?.role || 'OPERATIONS_MANAGER';

  // Check if user has access to audit trail
  const canViewAudit = ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'MAJORITY_OWNER', 'DIVISION_LEADER', 'ACCOUNTING'].includes(_userRole);

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <ShieldIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography color="text.secondary">Please sign in to view the audit trail.</Typography>
        </Box>
      </Box>
    );
  }

  if (!canViewAudit) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'error.light' }}>
            <ShieldIcon sx={{ fontSize: 48, color: 'error.light', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Access Restricted</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You don&apos;t have permission to view the audit trail. This feature is available to:
            </Typography>
            <Box component="ul" sx={{ textAlign: 'left', display: 'inline-block', mb: 3, color: 'text.secondary', fontSize: '0.875rem' }}>
              <li>• Majority Owners</li>
              <li>• Division Leaders</li>
              <li>• Accounting Team</li>
            </Box>
            <Box>
              <Button
                component={Link}
                href="/dashboard"
                variant="contained"
                sx={{ bgcolor: 'orange.600', '&:hover': { bgcolor: 'orange.700' } }}
                startIcon={<ArrowBackIcon />}
              >
                Return to Dashboard
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  component={Link}
                  href="/dashboard"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'orange.600' } }}
                  startIcon={<ArrowBackIcon />}
                >
                  Back to Dashboard
                </Button>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ShieldIcon sx={{ color: 'orange.600' }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">System Audit Trail</Typography>
                    <Typography variant="body2" color="text.secondary">Complete timeline of purchase order activities and system changes</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">Welcome back, {user?.name?.split(' ')[0]}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {user?.divisionName || 'All Divisions'} • {_userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Info Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                  <SearchIcon sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.secondary">Audit Tracking</Typography>
                  <Typography variant="h6" fontWeight="bold">Complete</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Every action is logged with full attribution
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: 'success.lighter', borderRadius: 2 }}>
                  <VerifiedUserIcon sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.secondary">User Attribution</Typography>
                  <Typography variant="h6" fontWeight="bold">Verified</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                All actions tied to authenticated users
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: '#e9d5ff', borderRadius: 2 }}>
                  <AccessTimeIcon sx={{ color: '#9333ea' }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.secondary">Timestamps</Typography>
                  <Typography variant="h6" fontWeight="bold">Precise</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Down-to-the-second accuracy
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: '#ffedd5', borderRadius: 2 }}>
                  <ShieldIcon sx={{ color: '#ea580c' }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.secondary">Compliance</Typography>
                  <Typography variant="h6" fontWeight="bold">Ready</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Export-ready for audits
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Audit Trail Component */}
        <AuditTrail limit={100} />

        {/* Compliance Notice */}
        <Paper sx={{ mt: 4, p: 3, bgcolor: 'grey.100' }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <ShieldIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight="semibold" sx={{ mb: 1 }}>Compliance & Security Notice</Typography>
              <Box sx={{ fontSize: '0.875rem', color: 'text.primary', '& > p': { mb: 1 } }}>
                <Typography variant="body2" paragraph>
                  <strong>Data Retention:</strong> All audit trail entries are permanently retained for compliance purposes.
                  This data cannot be deleted or modified by users.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Access Control:</strong> Access to the audit trail is restricted to authorized personnel only.
                  All access attempts are logged and monitored.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>IP Tracking:</strong> System actions are tracked with IP addresses and user agent information
                  for security auditing and forensic analysis.
                </Typography>
                <Typography variant="body2">
                  <strong>Export Capabilities:</strong> Audit data can be exported for external compliance requirements,
                  regulatory audits, or forensic investigation purposes.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Quick Actions */}
        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              component={Link}
              href="/reports"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                border: 1,
                borderColor: 'divider',
                '&:hover': { borderColor: 'orange.200', boxShadow: 1, '& .icon-bg': { bgcolor: '#ffedd5' }, '& .icon': { color: '#ea580c' } }
              }}
            >
              <Box className="icon-bg" sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 2, transition: 'background-color 0.3s' }}>
                <DescriptionIcon className="icon" sx={{ color: 'primary.main', transition: 'color 0.3s' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="medium">Business Reports</Typography>
                <Typography variant="body2" color="text.secondary">View comprehensive business analytics</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              component={Link}
              href="/approvals"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                border: 1,
                borderColor: 'divider',
                '&:hover': { borderColor: 'orange.200', boxShadow: 1, '& .icon-bg': { bgcolor: '#ffedd5' }, '& .icon': { color: '#ea580c' } }
              }}
            >
              <Box className="icon-bg" sx={{ p: 1, bgcolor: 'success.lighter', borderRadius: 2, transition: 'background-color 0.3s' }}>
                <CheckCircleIcon className="icon" sx={{ color: 'success.main', transition: 'color 0.3s' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="medium">Pending Approvals</Typography>
                <Typography variant="body2" color="text.secondary">Review and approve purchase orders</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              component={Link}
              href="/dashboard"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                border: 1,
                borderColor: 'divider',
                '&:hover': { borderColor: 'orange.200', boxShadow: 1, '& .icon-bg': { bgcolor: '#ffedd5' }, '& .icon': { color: '#ea580c' } }
              }}
            >
              <Box className="icon-bg" sx={{ p: 1, bgcolor: '#e9d5ff', borderRadius: 2, transition: 'background-color 0.3s' }}>
                <AssignmentIcon className="icon" sx={{ color: '#9333ea', transition: 'color 0.3s' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="medium">Live Dashboard</Typography>
                <Typography variant="body2" color="text.secondary">Real-time system metrics and KPIs</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
