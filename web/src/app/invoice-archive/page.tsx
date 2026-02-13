'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  CircularProgress,
  Grid,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Card,
  CardContent,
  Modal,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';

interface ArchiveInvoice {
  id: string;
  invoice_number: string | null;
  document_type: string | null;
  vendor_id: string | null;
  project_id: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_date: string | null;
  payment_status: 'PENDING' | 'PAID' | 'PARTIAL' | null;
  invoice_status: string | null;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  vendor_name?: string;
  project_code?: string;
}

interface ArchiveVendor {
  id: string;
  name: string;
  code: string | null;
}

interface ArchiveProject {
  id: string;
  code: string;
  name: string | null;
}

interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_count: number;
  pending_count: number;
  vendor_count: number;
}

export default function InvoiceArchivePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<ArchiveInvoice[]>([]);
  const [vendors, setVendors] = useState<ArchiveVendor[]>([]);
  const [projects, setProjects] = useState<ArchiveProject[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 25;

  // Selected invoice for detail view
  const [selectedInvoice, setSelectedInvoice] = useState<ArchiveInvoice | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<Array<{
    id: string;
    original_filename: string;
    file_path: string;
    file_extension: string | null;
    file_size: number | null;
  }>>([]);

  useEffect(() => {
    document.title = 'Invoice Archive | ASR PO System';
  }, []);

  // Fetch filter options
  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        fetch('/api/invoice-archive?action=stats').then(r => r.json()),
        fetch('/api/invoice-archive?action=vendors').then(r => r.json()),
        fetch('/api/invoice-archive?action=projects').then(r => r.json()),
      ]).then(([statsData, vendorsData, projectsData]) => {
        setStats(statsData);
        setVendors(vendorsData);
        setProjects(projectsData);
      }).catch(err => {
        console.error('Error fetching filter options:', err);
      });
    }
  }, [isAuthenticated]);

  // Fetch invoices
  const fetchInvoices = useCallback(async (resetOffset = false) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    const currentOffset = resetOffset ? 0 : offset;
    if (resetOffset) setOffset(0);

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (vendorId) params.set('vendor_id', vendorId);
    if (projectId) params.set('project_id', projectId);
    if (paymentStatus) params.set('payment_status', paymentStatus);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('limit', String(limit));
    params.set('offset', String(currentOffset));

    try {
      const response = await fetch(`/api/invoice-archive?${params}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();

      if (resetOffset) {
        setInvoices(data);
      } else {
        setInvoices(prev => [...prev, ...data]);
      }
      setHasMore(data.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, search, vendorId, projectId, paymentStatus, dateFrom, dateTo, offset]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, vendorId, projectId, paymentStatus, dateFrom, dateTo, isAuthenticated]);

  // Fetch invoice detail
  const fetchInvoiceDetail = async (invoice: ArchiveInvoice) => {
    setSelectedInvoice(invoice);
    try {
      const response = await fetch(`/api/invoice-archive/${invoice.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoiceFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching invoice detail:', err);
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string | null): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'PARTIAL': return 'error';
      default: return 'default';
    }
  };

  return (
    <AppLayout pageTitle="Invoice Archive">
      {/* Stats Cards */}
      {stats && (
        <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
                <Typography variant="h5" fontWeight="bold">{stats.total_invoices.toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.total_amount)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">Paid</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">{stats.paid_count.toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
                <Typography variant="h5" fontWeight="bold" color="warning.main">{stats.pending_count.toLocaleString()}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 2 }}>
        <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            {/* Search */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice #, vendor, notes..."
              />
            </Grid>

            {/* Vendor Filter */}
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Vendor</InputLabel>
                <Select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  label="Vendor"
                >
                  <MenuItem value="">All Vendors</MenuItem>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Project Filter */}
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Project</InputLabel>
                <Select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  label="Project"
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.code} - {p.name || 'Unnamed'}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Payment Status */}
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="PAID">Paid</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="PARTIAL">Partial</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range */}
            <Grid size={{ xs: 12, md: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  type="date"
                  size="small"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="date"
                  size="small"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Clear Filters */}
          {(search || vendorId || projectId || paymentStatus || dateFrom || dateTo) && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSearch('');
                  setVendorId('');
                  setProjectId('');
                  setPaymentStatus('');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear all filters
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Invoice List */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', border: 1, borderColor: 'error.main' }}>
            <Typography color="error.dark">{error}</Typography>
          </Paper>
        )}

        <Paper sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {/* Desktop Table */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    onClick={() => fetchInvoiceDetail(invoice)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{invoice.invoice_number || 'N/A'}</TableCell>
                    <TableCell>{invoice.vendor_name || '-'}</TableCell>
                    <TableCell>{invoice.project_code || '-'}</TableCell>
                    <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={invoice.payment_status || 'Unknown'}
                        color={getStatusColor(invoice.payment_status)}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Mobile Cards */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            {invoices.map((invoice) => (
              <Card
                key={invoice.id}
                onClick={() => fetchInvoiceDetail(invoice)}
                sx={{ cursor: 'pointer', borderBottom: 1, borderColor: 'divider', borderRadius: 0, '&:hover': { bgcolor: 'grey.50' } }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography fontWeight={500}>{invoice.invoice_number || 'N/A'}</Typography>
                      <Typography variant="body2" color="text.secondary">{invoice.vendor_name || '-'}</Typography>
                    </Box>
                    <Chip
                      label={invoice.payment_status || 'Unknown'}
                      color={getStatusColor(invoice.payment_status)}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">{formatDate(invoice.invoice_date)}</Typography>
                    <Typography fontWeight={500}>{formatCurrency(invoice.total_amount)}</Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Empty State */}
          {!loading && invoices.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No invoices found matching your filters.</Typography>
            </Box>
          )}

          {/* Loading */}
          {loading && (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          )}

          {/* Load More */}
          {!loading && hasMore && invoices.length > 0 && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                onClick={() => {
                  setOffset(prev => prev + limit);
                  fetchInvoices(false);
                }}
              >
                Load More
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Invoice Detail Modal */}
      <Modal
        open={!!selectedInvoice}
        onClose={() => {
          setSelectedInvoice(null);
          setInvoiceFiles([]);
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 600 },
          maxHeight: '90vh',
          overflow: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
        }}>
          {selectedInvoice && (
            <>
              {/* Modal Header */}
              <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  Invoice {selectedInvoice.invoice_number || 'Details'}
                </Typography>
                <IconButton
                  onClick={() => {
                    setSelectedInvoice(null);
                    setInvoiceFiles([]);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Modal Body */}
              <Box sx={{ p: 3 }}>
                {/* Status */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Chip
                    label={selectedInvoice.payment_status || 'Unknown'}
                    color={getStatusColor(selectedInvoice.payment_status)}
                  />
                  {selectedInvoice.document_type && (
                    <Typography variant="body2" color="text.secondary">{selectedInvoice.document_type}</Typography>
                  )}
                </Box>

                {/* Details Grid */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Vendor</Typography>
                    <Typography fontWeight={500}>{selectedInvoice.vendor_name || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Project</Typography>
                    <Typography fontWeight={500}>{selectedInvoice.project_code || '-'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Invoice Date</Typography>
                    <Typography fontWeight={500}>{formatDate(selectedInvoice.invoice_date)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Due Date</Typography>
                    <Typography fontWeight={500}>{formatDate(selectedInvoice.due_date)}</Typography>
                  </Grid>
                  {selectedInvoice.payment_date && (
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                      <Typography fontWeight={500}>{formatDate(selectedInvoice.payment_date)}</Typography>
                    </Grid>
                  )}
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Category</Typography>
                    <Typography fontWeight={500}>
                      {selectedInvoice.category || '-'}
                      {selectedInvoice.subcategory && ` / ${selectedInvoice.subcategory}`}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Amounts */}
                <Paper sx={{ bgcolor: 'grey.50', p: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2">{formatCurrency(selectedInvoice.subtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Tax</Typography>
                    <Typography variant="body2">{formatCurrency(selectedInvoice.tax_amount)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography fontWeight={500}>Total</Typography>
                    <Typography fontWeight={500}>{formatCurrency(selectedInvoice.total_amount)}</Typography>
                  </Box>
                </Paper>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Notes</Typography>
                    <Paper sx={{ bgcolor: 'grey.50', p: 1.5 }}>
                      <Typography variant="body2">{selectedInvoice.notes}</Typography>
                    </Paper>
                  </Box>
                )}

                {/* Files */}
                {invoiceFiles.length > 0 && (
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Attached Files</Typography>
                    {invoiceFiles.map((file) => (
                      <Paper key={file.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                        <DescriptionIcon sx={{ color: 'text.secondary' }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>{file.original_filename}</Typography>
                          {file.file_size && (
                            <Typography variant="caption" color="text.secondary">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </Typography>
                          )}
                        </Box>
                        {file.file_extension?.toUpperCase() && (
                          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                            {file.file_extension}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Modal Footer */}
              <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', p: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setInvoiceFiles([]);
                  }}
                >
                  Close
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </AppLayout>
  );
}
