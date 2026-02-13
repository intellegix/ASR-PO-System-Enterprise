'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  primary_trade: string | null;
  status: string;
  division_id: string | null;
  project_id: string | null;
  divisions?: {
    division_name: string;
  } | null;
  projects?: {
    project_code: string;
    project_name: string;
  } | null;
}

type StatusFilter = '' | 'Pending' | 'InProgress' | 'Completed' | 'OnHold' | 'Cancelled';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function getStatusColor(status: string): 'warning' | 'info' | 'success' | 'error' {
  const colors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
    Pending: 'warning',
    InProgress: 'info',
    Completed: 'success',
    OnHold: 'error',
    Cancelled: 'error',
  };
  return colors[status] || 'info';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    InProgress: 'In Progress',
    OnHold: 'On Hold',
  };
  return labels[status] || status;
}

export default function WorkOrdersPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkOrders();
    }
  }, [isAuthenticated]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-orders');
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
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

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (statusFilter && wo.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = wo.title.toLowerCase().includes(query);
      const matchesNumber = wo.work_order_number.toLowerCase().includes(query);
      if (!matchesTitle && !matchesNumber) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppLayout pageTitle="Work Orders">
      <Box sx={{ maxWidth: '1280px', mx: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            Work Orders
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {filteredWorkOrders.length} work order{filteredWorkOrders.length !== 1 ? 's' : ''} found
          </Typography>
        </Box>

        <Card sx={{ p: 2, mb: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                Status
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                Search
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or WO number..."
              />
            </Box>
            {(statusFilter || searchQuery) && (
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setStatusFilter('');
                    setSearchQuery('');
                  }}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Clear filters
                </Button>
              </Box>
            )}
          </Box>
        </Card>

        <Card sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredWorkOrders.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                {statusFilter || searchQuery
                  ? 'No work orders match your filters'
                  : 'No work orders found'}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell>WO Number</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Division</TableCell>
                        <TableCell>Trade</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredWorkOrders.map((wo) => (
                        <TableRow
                          key={wo.id}
                          hover
                          sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
                            {wo.work_order_number}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {wo.title}
                          </TableCell>
                          <TableCell>
                            {wo.projects?.project_code || '-'}
                          </TableCell>
                          <TableCell>
                            {wo.divisions?.division_name || '-'}
                          </TableCell>
                          <TableCell>
                            {wo.primary_trade || '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={getStatusLabel(wo.status)}
                              color={getStatusColor(wo.status)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {filteredWorkOrders.map((wo) => (
                  <Box
                    key={wo.id}
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'grey.50' },
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 'medium' }} color="text.primary">
                          {wo.work_order_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {wo.title}
                        </Typography>
                      </Box>
                      <Chip
                        label={getStatusLabel(wo.status)}
                        color={getStatusColor(wo.status)}
                        size="small"
                        sx={{ flexShrink: 0, ml: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.875rem', mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {wo.projects?.project_code || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {wo.divisions?.division_name || '-'}
                      </Typography>
                      {wo.primary_trade && (
                        <Typography variant="body2" color="text.secondary">
                          {wo.primary_trade}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Card>
      </Box>
    </AppLayout>
  );
}
