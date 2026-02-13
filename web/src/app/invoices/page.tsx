'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';

type TabType = 'vendor' | 'customer';

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('vendor');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = 'Invoices | ASR PO System';
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchText]);

  const { data: vendorInvoices, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices/vendor');
      if (!res.ok) throw new Error('Failed to fetch vendor invoices');
      return res.json();
    },
  });

  const { data: customerInvoices, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices/customer');
      if (!res.ok) throw new Error('Failed to fetch customer invoices');
      return res.json();
    },
  });

  const getChipColor = (status: string): 'warning' | 'info' | 'success' | 'error' => {
    const colors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
      Pending: 'warning',
      Approved: 'info',
      Paid: 'success',
      Disputed: 'error',
      Draft: 'warning',
      Sent: 'info',
      Overdue: 'error',
      Cancelled: 'error',
    };
    return colors[status] || 'warning';
  };

  interface VendorInvoice {
    id: string;
    invoice_number: string;
    status: string;
    vendors?: { vendor_name: string } | null;
    po_headers?: { po_number: string } | null;
    total_amount: unknown;
    date_received: string | Date;
  }

  const filteredVendorInvoices = useMemo(() => {
    if (!vendorInvoices) return [];
    let result = [...vendorInvoices];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((inv: VendorInvoice) =>
        inv.invoice_number?.toLowerCase().includes(lower) ||
        inv.vendors?.vendor_name?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter) {
      result = result.filter((inv: VendorInvoice) => inv.status === statusFilter);
    }
    return result;
  }, [vendorInvoices, debouncedSearch, statusFilter]);

  interface CustomerInvoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    status: string;
    projects?: { project_code: string; project_name: string } | null;
    total_amount: unknown;
    date_issued: string | Date;
  }

  const filteredCustomerInvoices = useMemo(() => {
    if (!customerInvoices) return [];
    let result = [...customerInvoices];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((inv: CustomerInvoice) =>
        inv.invoice_number?.toLowerCase().includes(lower) ||
        inv.customer_name?.toLowerCase().includes(lower) ||
        inv.projects?.project_code?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter) {
      result = result.filter((inv: CustomerInvoice) => inv.status === statusFilter);
    }
    return result;
  }, [customerInvoices, debouncedSearch, statusFilter]);

  return (
    <AppLayout pageTitle="Invoices">
      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: { sm: 'space-between' }, mb: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Manage vendor and customer invoices</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mt: { xs: 2, sm: 0 } }}>
            <Button
              component={Link}
              href="/invoices/vendor/create"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ bgcolor: 'orange.main', '&:hover': { bgcolor: 'orange.dark' } }}
            >
              Record Vendor Invoice
            </Button>
            <Button
              component={Link}
              href="/invoices/customer/create"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
            >
              Create Customer Invoice
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Vendor Invoices (AP)
                  {vendorInvoices?.length > 0 && (
                    <Chip label={vendorInvoices.length} size="small" sx={{ bgcolor: 'grey.200', color: 'grey.700' }} />
                  )}
                </Box>
              }
              value="vendor"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Customer Invoices (AR)
                  {customerInvoices?.length > 0 && (
                    <Chip label={customerInvoices.length} size="small" sx={{ bgcolor: 'grey.200', color: 'grey.700' }} />
                  )}
                </Box>
              }
              value="customer"
            />
          </Tabs>
        </Box>

        {/* Search & Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <TextField
              label="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={activeTab === 'vendor' ? 'Invoice # or vendor...' : 'Invoice #, customer, or project...'}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="">All Statuses</MenuItem>
              {activeTab === 'vendor' ? (
                <>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Disputed">Disputed</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Sent">Sent</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </>
              )}
            </TextField>
            {(debouncedSearch || statusFilter) && (
              <Box sx={{ display: 'flex', alignItems: 'end' }}>
                <Button
                  onClick={() => { setSearchText(''); setDebouncedSearch(''); setStatusFilter(''); }}
                  variant="outlined"
                  color="primary"
                  fullWidth
                >
                  Clear filters
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Vendor Invoices Tab */}
        {activeTab === 'vendor' && (
          <Paper>
            {vendorLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : filteredVendorInvoices.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1.5 }} />
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  {(debouncedSearch || statusFilter) ? 'No invoices match your filters' : 'No vendor invoices recorded yet'}
                </Typography>
                {!(debouncedSearch || statusFilter) && (
                  <Button component={Link} href="/invoices/vendor/create" color="primary">
                    Record your first vendor invoice
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>PO #</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Received</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVendorInvoices.map((inv: VendorInvoice) => (
                      <TableRow key={inv.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{inv.invoice_number}</TableCell>
                        <TableCell>{inv.vendors?.vendor_name}</TableCell>
                        <TableCell>{inv.po_headers?.po_number || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Chip label={inv.status} color={getChipColor(inv.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(inv.date_received).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

        {/* Customer Invoices Tab */}
        {activeTab === 'customer' && (
          <Paper>
            {customerLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : filteredCustomerInvoices.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1.5 }} />
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  {(debouncedSearch || statusFilter) ? 'No invoices match your filters' : 'No customer invoices created yet'}
                </Typography>
                {!(debouncedSearch || statusFilter) && (
                  <Button component={Link} href="/invoices/customer/create" color="primary">
                    Create your first customer invoice
                  </Button>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Project</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Issued</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCustomerInvoices.map((inv: CustomerInvoice) => (
                      <TableRow key={inv.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{inv.invoice_number}</TableCell>
                        <TableCell>{inv.customer_name}</TableCell>
                        <TableCell>
                          {inv.projects?.project_code} - {inv.projects?.project_name}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Chip label={inv.status} color={getChipColor(inv.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(inv.date_issued).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}

      </Box>
    </AppLayout>
  );
}
