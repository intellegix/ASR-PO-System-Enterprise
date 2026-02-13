'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { PONumberDisplay, PONumberLegend } from '@/components/mui';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';

interface PO {
  id: string;
  po_number: string;
  status: string;
  vendor_id: string | null;
  total_amount: string | number;
  created_at: string;
  required_by_date: string | null;
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
}

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
}

type SortField = 'po_number' | 'vendor' | 'amount' | 'created_at' | 'status';
type SortDirection = 'asc' | 'desc';

function getNumericAmount(amount: string | number): number {
  return typeof amount === 'string' ? parseFloat(amount) : amount;
}

function buildCSV(items: PO[]): string {
  const headers = ['PO Number', 'Vendor', 'Project', 'Division', 'Amount', 'Status', 'Created'];
  const rows = items.map((po) => [
    po.po_number,
    po.vendors?.vendor_name || '',
    po.projects?.project_code || '',
    po.divisions?.division_name || '',
    getNumericAmount(po.total_amount).toFixed(2),
    po.status,
    po.created_at ? new Date(po.created_at).toLocaleDateString('en-US') : '',
  ]);
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Draft: { bg: '#f1f5f9', color: '#475569' },
  Submitted: { bg: '#fef3c7', color: '#92400e' },
  Approved: { bg: '#dcfce7', color: '#166534' },
  Issued: { bg: '#dbeafe', color: '#1e40af' },
  Received: { bg: '#f3e8ff', color: '#6b21a8' },
  Invoiced: { bg: '#e0e7ff', color: '#3730a3' },
  Paid: { bg: '#d1fae5', color: '#065f46' },
  Cancelled: { bg: '#f3f4f6', color: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  Submitted: 'Pending Approval',
};

export default function POListPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [pos, setPOs] = useState<PO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = 'Purchase Orders | ASR PO System';
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPOs();
      fetchVendors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, statusFilter, divisionFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, vendorFilter, dateFrom, dateTo, amountMin, amountMax, statusFilter, divisionFilter, sortField, sortDirection, rowsPerPage]);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'Incomplete') params.set('status', statusFilter);
      if (divisionFilter) params.set('divisionId', divisionFilter);
      params.set('limit', '100');

      const response = await fetch(`/api/po?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPOs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const filteredPOs = useMemo(() => {
    let result = [...pos];

    if (statusFilter === 'Incomplete') {
      result = result.filter((po) => po.status === 'Draft' && !po.vendor_id);
    }

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter(
        (po) =>
          po.po_number.toLowerCase().includes(lower) ||
          (po.vendors?.vendor_name || '').toLowerCase().includes(lower)
      );
    }

    if (vendorFilter) {
      result = result.filter((po) => po.vendors?.vendor_name === vendorFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((po) => new Date(po.created_at) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((po) => new Date(po.created_at) <= to);
    }

    if (amountMin) {
      const min = parseFloat(amountMin);
      if (!isNaN(min)) {
        result = result.filter((po) => getNumericAmount(po.total_amount) >= min);
      }
    }

    if (amountMax) {
      const max = parseFloat(amountMax);
      if (!isNaN(max)) {
        result = result.filter((po) => getNumericAmount(po.total_amount) <= max);
      }
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'po_number':
          cmp = a.po_number.localeCompare(b.po_number);
          break;
        case 'vendor':
          cmp = (a.vendors?.vendor_name || '').localeCompare(b.vendors?.vendor_name || '');
          break;
        case 'amount':
          cmp = getNumericAmount(a.total_amount) - getNumericAmount(b.total_amount);
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, debouncedSearch, vendorFilter, dateFrom, dateTo, amountMin, amountMax, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredPOs.length / rowsPerPage));
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredPOs.length);
  const paginatedPOs = filteredPOs.slice(startIndex, endIndex);

  const allCurrentPageSelected = paginatedPOs.length > 0 && paginatedPOs.every((po) => selectedIds.has(po.id));

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        paginatedPOs.forEach((po) => next.delete(po.id));
      } else {
        paginatedPOs.forEach((po) => next.add(po.id));
      }
      return next;
    });
  }, [allCurrentPageSelected, paginatedPOs]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const hasActiveFilters = statusFilter || divisionFilter || debouncedSearch || vendorFilter || dateFrom || dateTo || amountMin || amountMax;

  const clearAllFilters = useCallback(() => {
    setStatusFilter('');
    setDivisionFilter('');
    setSearchText('');
    setDebouncedSearch('');
    setVendorFilter('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  }, []);

  const handleExportAll = useCallback(() => {
    const csv = buildCSV(filteredPOs);
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(csv, `purchase-orders-${date}.csv`);
  }, [filteredPOs]);

  const handleExportSelected = useCallback(() => {
    const selected = pos.filter((po) => selectedIds.has(po.id));
    const csv = buildCSV(selected);
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(csv, `purchase-orders-selected-${date}.csv`);
  }, [pos, selectedIds]);

  const getPageNumbers = useCallback((): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

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

  const getStatusChip = (status: string, vendorId: string | null) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.Draft;
    const label = STATUS_LABELS[status] || status;
    return (
      <Box sx={{ display: 'inline-flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Chip
          label={label}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500, fontSize: '0.75rem' }}
        />
        {status === 'Draft' && !vendorId && (
          <Chip
            label="Incomplete"
            size="small"
            sx={{ bgcolor: '#fef9c3', color: '#a16207', fontWeight: 500, fontSize: '0.75rem' }}
          />
        )}
      </Box>
    );
  };

  const SortableHeaderCell = ({ field, label, align = 'left' }: { field: SortField; label: React.ReactNode; align?: 'left' | 'right' | 'center' }) => (
    <TableCell
      align={align}
      sx={{
        fontWeight: 600,
        fontSize: '0.8125rem',
        color: 'text.secondary',
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { bgcolor: 'action.hover' },
        whiteSpace: 'nowrap',
      }}
      onClick={() => handleSort(field)}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUpwardIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          ) : (
            <ArrowDownwardIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          )
        ) : (
          <ArrowUpwardIcon sx={{ fontSize: 16, color: 'action.disabled' }} />
        )}
      </Box>
    </TableCell>
  );

  return (
    <AppLayout pageTitle="Purchase Orders">
      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
        {/* Header bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredPOs.length} POs found
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              onClick={handleExportAll}
              disabled={filteredPOs.length === 0}
              variant="outlined"
              color="secondary"
              startIcon={<FileDownloadIcon />}
              size="small"
            >
              Export CSV
            </Button>
            <Button
              component={Link}
              href="/po/create"
              variant="contained"
              startIcon={<AddIcon />}
              size="small"
            >
              New PO
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="PO number or vendor..."
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  select
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Incomplete">Incomplete (No Vendor)</MenuItem>
                  <MenuItem value="Submitted">Pending Approval</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Issued">Issued</MenuItem>
                  <MenuItem value="Received">Received</MenuItem>
                  <MenuItem value="Invoiced">Invoiced</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Vendor"
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  select
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">All Vendors</MenuItem>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.vendor_name}>
                      {v.vendor_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Date From"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Date To"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Min Amount"
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0.00"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <TextField
                  label="Max Amount"
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="0.00"
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              </Grid>
              {hasActiveFilters && (
                <Grid size={{ xs: 12, sm: 6, lg: 3 }} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    onClick={clearAllFilters}
                    startIcon={<FilterListOffIcon />}
                    color="primary"
                    fullWidth
                    size="small"
                    sx={{ height: 40 }}
                  >
                    Clear all filters
                  </Button>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Table / Cards */}
        <Card sx={{ mb: 10 }}>
          {loading ? (
            <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </CardContent>
          ) : filteredPOs.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <DescriptionOutlinedIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {hasActiveFilters ? 'No purchase orders match your filters' : 'No purchase orders found'}
              </Typography>
              {hasActiveFilters ? (
                <Button onClick={clearAllFilters} startIcon={<FilterListOffIcon />}>
                  Clear filters
                </Button>
              ) : (
                <Button component={Link} href="/po/create" variant="contained" startIcon={<AddIcon />}>
                  Create your first PO
                </Button>
              )}
            </CardContent>
          ) : (
            <>
              {/* Desktop Table */}
              <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAll}
                          size="small"
                          sx={{ color: 'action.active', '&.Mui-checked': { color: 'primary.main' } }}
                        />
                      </TableCell>
                      <SortableHeaderCell
                        field="po_number"
                        label={
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            PO Number <PONumberLegend />
                          </Box>
                        }
                      />
                      <SortableHeaderCell field="vendor" label="Vendor" />
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary' }}>Project</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary' }}>Division</TableCell>
                      <SortableHeaderCell field="amount" label="Amount" align="right" />
                      <SortableHeaderCell field="status" label="Status" align="center" />
                      <SortableHeaderCell field="created_at" label="Created" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPOs.map((po) => (
                      <TableRow
                        key={po.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          bgcolor: selectedIds.has(po.id) ? 'rgba(249, 115, 22, 0.04)' : 'transparent',
                        }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(po.id)}
                            onChange={() => toggleSelect(po.id)}
                            size="small"
                            sx={{ color: 'action.active', '&.Mui-checked': { color: 'primary.main' } }}
                          />
                        </TableCell>
                        <TableCell onClick={() => router.push(`/po/view?id=${po.id}`)}>
                          <PONumberDisplay poNumber={po.po_number} size="medium" />
                        </TableCell>
                        <TableCell onClick={() => router.push(`/po/view?id=${po.id}`)} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          {po.vendors?.vendor_name || (po.vendor_id ? '-' : (
                            <Typography component="span" sx={{ color: 'warning.dark', fontStyle: 'italic', fontSize: '0.875rem' }}>TBD</Typography>
                          ))}
                        </TableCell>
                        <TableCell onClick={() => router.push(`/po/view?id=${po.id}`)} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          {po.projects?.project_code || '-'}
                        </TableCell>
                        <TableCell onClick={() => router.push(`/po/view?id=${po.id}`)} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          {po.divisions?.division_name || '-'}
                        </TableCell>
                        <TableCell
                          align="right"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                          sx={{ fontWeight: 500, fontSize: '0.875rem' }}
                        >
                          {formatCurrency(po.total_amount)}
                        </TableCell>
                        <TableCell align="center" onClick={() => router.push(`/po/view?id=${po.id}`)}>
                          {getStatusChip(po.status, po.vendor_id)}
                        </TableCell>
                        <TableCell onClick={() => router.push(`/po/view?id=${po.id}`)} sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          {formatDate(po.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Cards */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {paginatedPOs.map((po) => (
                  <Box
                    key={po.id}
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      cursor: 'pointer',
                      bgcolor: selectedIds.has(po.id) ? 'rgba(249, 115, 22, 0.04)' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Checkbox
                        checked={selectedIds.has(po.id)}
                        onChange={() => toggleSelect(po.id)}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        sx={{ mt: 0.25, color: 'action.active', '&.Mui-checked': { color: 'primary.main' } }}
                      />
                      <Box sx={{ flex: 1 }} onClick={() => router.push(`/po/view?id=${po.id}`)}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <PONumberDisplay poNumber={po.po_number} size="medium" />
                            <Typography variant="body2" color="text.secondary">
                              {po.vendors?.vendor_name || (po.vendor_id ? '-' : (
                                <Typography component="span" sx={{ color: 'warning.dark', fontStyle: 'italic', fontSize: 'inherit' }}>TBD</Typography>
                              ))}
                            </Typography>
                          </Box>
                          {getStatusChip(po.status, po.vendor_id)}
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {po.divisions?.division_name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(po.total_amount)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Pagination */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderTop: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {startIndex + 1}-{endIndex} of {filteredPOs.length}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">Rows:</Typography>
                    <Select
                      value={rowsPerPage}
                      onChange={(e: SelectChangeEvent<number>) => setRowsPerPage(Number(e.target.value))}
                      size="small"
                      sx={{ minWidth: 60, '& .MuiSelect-select': { py: 0.5, fontSize: '0.875rem' } }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </Select>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={<NavigateBeforeIcon />}
                    sx={{ minWidth: 'auto', px: 1.5 }}
                  >
                    Prev
                  </Button>
                  {getPageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                      <Typography key={`ellipsis-${i}`} variant="body2" sx={{ px: 1, color: 'text.disabled' }}>
                        ...
                      </Typography>
                    ) : (
                      <Button
                        key={p}
                        onClick={() => setPage(p)}
                        size="small"
                        variant={page === p ? 'contained' : 'outlined'}
                        color={page === p ? 'primary' : 'secondary'}
                        sx={{ minWidth: 36, px: 1 }}
                      >
                        {p}
                      </Button>
                    )
                  )}
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    endIcon={<NavigateNextIcon />}
                    sx={{ minWidth: 'auto', px: 1.5 }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Card>
      </Box>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'grey.900',
            color: 'white',
            borderRadius: 3,
            px: 3,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            zIndex: 50,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {selectedIds.size} selected
          </Typography>
          <Button
            onClick={handleExportSelected}
            variant="contained"
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Export Selected
          </Button>
          <IconButton onClick={clearSelection} size="small" sx={{ color: 'grey.400', '&:hover': { color: 'white' } }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}
    </AppLayout>
  );
}
