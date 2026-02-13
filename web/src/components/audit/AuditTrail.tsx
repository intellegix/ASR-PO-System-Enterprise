'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { PONumberDisplay } from '@/components/mui';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  Paper,
  CircularProgress,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Grid,
  Link as MuiLink,
} from '@mui/material';
import {
  Schedule as ClockIcon,
  Person as UserIcon,
  Description as DocumentIcon,
  Check as CheckIcon,
  Close as XIcon,
  LocalShipping as TruckIcon,
  CreditCard as CreditCardIcon,
  ExpandMore as ChevronDownIcon,
  OpenInNew as ExternalLinkIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  po: {
    id: string;
    po_number: string;
    vendor_name: string;
    total_amount: number;
    division_name: string;
  };
  statusChange: {
    from: string | null;
    to: string | null;
  };
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditTrailProps {
  poId?: string;
  limit?: number;
  className?: string;
}

export default function AuditTrail({ poId, limit = 50, className = '' }: AuditTrailProps) {
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: auditData, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-trail', poId, searchQuery, selectedAction, selectedUser, startDate, endDate, limit],
    queryFn: async (): Promise<{ entries: AuditTrailEntry[] }> => {
      const params = new URLSearchParams();
      if (poId) params.append('poId', poId);
      if (searchQuery) params.append('search', searchQuery);
      if (selectedAction) params.append('action', selectedAction);
      if (selectedUser) params.append('userId', selectedUser);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit-trail?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }
      return response.json();
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });

  const { data: filters } = useQuery({
    queryKey: ['audit-filters'],
    queryFn: async () => {
      const response = await fetch('/api/audit-trail/filters');
      if (!response.ok) throw new Error('Failed to fetch filters');
      return response.json();
    },
  });

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedItems(newExpanded);
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <DocumentIcon sx={{ color: 'primary.main' }} />;
      case 'submitted':
        return <ClockIcon sx={{ color: 'warning.main' }} />;
      case 'approved':
        return <CheckIcon sx={{ color: 'success.main' }} />;
      case 'rejected':
        return <XIcon sx={{ color: 'error.main' }} />;
      case 'issued':
        return <TruckIcon sx={{ color: '#9333ea' }} />;
      case 'received':
        return <CheckIcon sx={{ color: '#10b981' }} />;
      case 'invoiced':
        return <DocumentIcon sx={{ color: '#f97316' }} />;
      case 'paid':
        return <CreditCardIcon sx={{ color: '#15803d' }} />;
      case 'cancelled':
        return <XIcon sx={{ color: 'text.secondary' }} />;
      default:
        return <DocumentIcon sx={{ color: 'text.disabled' }} />;
    }
  };

  const getActionColor = (action: string): 'primary' | 'warning' | 'success' | 'error' | 'info' | 'secondary' => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'primary';
      case 'submitted':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'issued':
        return 'secondary';
      case 'received':
        return 'success';
      case 'invoiced':
        return 'warning';
      case 'paid':
        return 'success';
      case 'cancelled':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!session) {
    return <Typography color="text.secondary">Please sign in to view audit trail.</Typography>;
  }

  return (
    <Paper
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
      }}
      className={className}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {poId ? 'PO Audit Trail' : 'System Audit Trail'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete timeline of all purchase order activities and system changes
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
            >
              Refresh
            </Button>
            <Button
              onClick={() => console.log('Export audit trail')}
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              sx={{ bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' } }}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      {!poId && (
        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography variant="caption" fontWeight={500} display="block" sx={{ mb: 0.5 }}>
                Search
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="PO number, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography variant="caption" fontWeight={500} display="block" sx={{ mb: 0.5 }}>
                Action
              </Typography>
              <TextField
                fullWidth
                size="small"
                select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="Created">Created</MenuItem>
                <MenuItem value="Submitted">Submitted</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
                <MenuItem value="Issued">Issued</MenuItem>
                <MenuItem value="Received">Received</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography variant="caption" fontWeight={500} display="block" sx={{ mb: 0.5 }}>
                User
              </Typography>
              <TextField
                fullWidth
                size="small"
                select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <MenuItem value="">All Users</MenuItem>
                {(filters?.users as Array<{ id: string; name: string; email: string }> | undefined)?.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography variant="caption" fontWeight={500} display="block" sx={{ mb: 0.5 }}>
                Start Date
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography variant="caption" fontWeight={500} display="block" sx={{ mb: 0.5 }}>
                End Date
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2, color: '#ea580c' }} />
          <Typography color="text.secondary">Loading audit trail...</Typography>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Box sx={{ px: 3, py: 4, textAlign: 'center' }}>
          <Typography color="error" sx={{ mb: 2 }}>
            Failed to load audit trail data
          </Typography>
          <Button onClick={() => refetch()} variant="contained" color="error">
            Retry
          </Button>
        </Box>
      )}

      {/* Timeline */}
      {auditData && (
        <Box sx={{ px: 3, py: 2 }}>
          {auditData.entries.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DocumentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">No audit trail entries found</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                Try adjusting your filters or check back later
              </Typography>
            </Box>
          ) : (
            <Box sx={{ position: 'relative' }}>
              {/* Timeline line */}
              <Box
                sx={{
                  position: 'absolute',
                  left: 32,
                  top: 24,
                  bottom: 24,
                  width: '2px',
                  bgcolor: 'divider',
                }}
              />

              {/* Timeline entries */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {auditData.entries.map((entry) => (
                  <Box key={entry.id} sx={{ position: 'relative' }}>
                    {/* Timeline dot */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 24,
                        width: 16,
                        height: 16,
                        bgcolor: 'background.paper',
                        border: 2,
                        borderColor: '#fb923c',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box sx={{ width: 6, height: 6, bgcolor: '#ea580c', borderRadius: '50%' }} />
                    </Box>

                    {/* Entry content */}
                    <Box sx={{ ml: 8, pb: 2 }}>
                      <Paper
                        variant="outlined"
                        sx={{
                          bgcolor: 'grey.50',
                          transition: 'box-shadow 0.2s',
                          '&:hover': { boxShadow: 1 },
                        }}
                      >
                        {/* Entry header */}
                        <Box
                          sx={{ p: 2, cursor: 'pointer' }}
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                              {getActionIcon(entry.action)}
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Chip
                                    label={entry.action}
                                    size="small"
                                    color={getActionColor(entry.action)}
                                    variant="outlined"
                                  />
                                  <PONumberDisplay poNumber={entry.po.po_number} size="small" />
                                  {entry.statusChange.from !== entry.statusChange.to && (
                                    <Typography variant="caption" color="text.secondary">
                                      {entry.statusChange.from} → {entry.statusChange.to}
                                    </Typography>
                                  )}
                                </Box>
                                <Typography variant="body2">
                                  <Typography component="span" fontWeight={500}>
                                    {entry.actor.name}
                                  </Typography>
                                  {' '}performed{' '}
                                  <Typography component="span" fontWeight={500}>
                                    {entry.action.toLowerCase()}
                                  </Typography>
                                  {' '}on PO{' '}
                                  <PONumberDisplay poNumber={entry.po.po_number} size="small" showTooltip={false} />
                                  {' '}for{' '}
                                  <Typography component="span" fontWeight={500}>
                                    {entry.po.vendor_name}
                                  </Typography>
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ClockIcon sx={{ fontSize: 12 }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(entry.timestamp).toLocaleString()}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <UserIcon sx={{ fontSize: 12 }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {entry.actor.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </Typography>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {entry.po.division_name} • {formatCurrency(entry.po.total_amount)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MuiLink
                                href={`/po/view?id=${entry.po.id}`}
                                color="#ea580c"
                                sx={{ '&:hover': { color: '#c2410c' } }}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <ExternalLinkIcon fontSize="small" />
                              </MuiLink>
                              <ChevronDownIcon
                                sx={{
                                  color: 'text.disabled',
                                  transition: 'transform 0.2s',
                                  transform: expandedItems.has(entry.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>

                        {/* Expanded details */}
                        <Collapse in={expandedItems.has(entry.id)}>
                          <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2, bgcolor: 'background.paper' }}>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1 }}>
                                  Action Details
                                </Typography>
                                <TableContainer>
                                  <Table size="small">
                                    <TableBody>
                                      <TableRow>
                                        <TableCell sx={{ color: 'text.secondary' }}>Timestamp:</TableCell>
                                        <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                                      </TableRow>
                                      <TableRow>
                                        <TableCell sx={{ color: 'text.secondary' }}>Actor:</TableCell>
                                        <TableCell>{entry.actor.name}</TableCell>
                                      </TableRow>
                                      <TableRow>
                                        <TableCell sx={{ color: 'text.secondary' }}>Role:</TableCell>
                                        <TableCell>
                                          {entry.actor.role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                        </TableCell>
                                      </TableRow>
                                      <TableRow>
                                        <TableCell sx={{ color: 'text.secondary' }}>Email:</TableCell>
                                        <TableCell>{entry.actor.email}</TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Grid>

                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1 }}>
                                  System Info
                                </Typography>
                                <TableContainer>
                                  <Table size="small">
                                    <TableBody>
                                      {entry.ipAddress && (
                                        <TableRow>
                                          <TableCell sx={{ color: 'text.secondary' }}>IP Address:</TableCell>
                                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                            {entry.ipAddress}
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      {entry.userAgent && (
                                        <TableRow>
                                          <TableCell sx={{ color: 'text.secondary' }}>User Agent:</TableCell>
                                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                            {entry.userAgent}
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      {entry.statusChange.from !== entry.statusChange.to && (
                                        <TableRow>
                                          <TableCell sx={{ color: 'text.secondary' }}>Status Change:</TableCell>
                                          <TableCell>
                                            {entry.statusChange.from || 'None'} → {entry.statusChange.to || 'None'}
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Grid>
                            </Grid>

                            {entry.notes && (
                              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                <Typography variant="subtitle2" fontWeight={500} sx={{ mb: 1 }}>
                                  Notes
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                                  <Typography variant="body2">{entry.notes}</Typography>
                                </Paper>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </Paper>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Load more indicator */}
          {auditData.entries.length >= limit && (
            <Box sx={{ textAlign: 'center', pt: 2, borderTop: 1, borderColor: 'divider', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {auditData.entries.length} entries.{' '}
                <Button variant="text" sx={{ color: '#ea580c', '&:hover': { color: '#c2410c' } }}>
                  Load more
                </Button>
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
