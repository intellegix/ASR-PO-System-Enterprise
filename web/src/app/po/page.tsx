'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-slate-100 text-slate-700',
      Submitted: 'bg-amber-100 text-amber-700',
      Approved: 'bg-green-100 text-green-700',
      Issued: 'bg-blue-100 text-blue-700',
      Received: 'bg-purple-100 text-purple-700',
      Invoiced: 'bg-indigo-100 text-indigo-700',
      Paid: 'bg-emerald-100 text-emerald-700',
      Cancelled: 'bg-gray-100 text-gray-500',
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Submitted: 'Pending Approval',
    };
    return labels[status] || status;
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">{'\u25B2'}</span>;
    return (
      <span className="text-orange-500 ml-1">
        {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  const SortableHeader = ({ field, label, align = 'left' }: { field: SortField; label: string; align?: 'left' | 'right' | 'center' }) => (
    <th
      className={`px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition text-${align}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortIndicator(field)}
      </span>
    </th>
  );

  return (
    <AppLayout pageTitle="Purchase Orders">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{filteredPOs.length} POs found</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              disabled={filteredPOs.length === 0}
              className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <Link
              href="/po/create"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New PO</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="PO number or vendor..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Incomplete">Incomplete (No Vendor)</option>
                <option value="Submitted">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Issued">Issued</option>
                <option value="Received">Received</option>
                <option value="Invoiced">Invoiced</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.vendor_name}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount</label>
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount</label>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  className="w-full px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pb-20">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 mb-4">
                {hasActiveFilters ? 'No purchase orders match your filters' : 'No purchase orders found'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href="/po/create"
                  className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create your first PO
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                      </th>
                      <SortableHeader field="po_number" label="PO Number" />
                      <SortableHeader field="vendor" label="Vendor" />
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Project</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Division</th>
                      <SortableHeader field="amount" label="Amount" align="right" />
                      <SortableHeader field="status" label="Status" align="center" />
                      <SortableHeader field="created_at" label="Created" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedPOs.map((po) => (
                      <tr
                        key={po.id}
                        className={`hover:bg-slate-50 cursor-pointer transition ${selectedIds.has(po.id) ? 'bg-orange-50' : ''}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(po.id)}
                            onChange={() => toggleSelect(po.id)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                          />
                        </td>
                        <td
                          className="px-4 py-3 text-sm font-mono font-medium text-slate-900"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          {po.po_number}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-600"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          {po.vendors?.vendor_name || (po.vendor_id ? '-' : <span className="text-yellow-600 italic">TBD</span>)}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-600"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          {po.projects?.project_code || '-'}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-600"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          {po.divisions?.division_name || '-'}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-900 text-right font-medium"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(po.status)}`}>
                            {getStatusLabel(po.status)}
                          </span>
                          {po.status === 'Draft' && !po.vendor_id && (
                            <span className="inline-flex ml-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                              Incomplete
                            </span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-slate-500"
                          onClick={() => router.push(`/po/view?id=${po.id}`)}
                        >
                          {formatDate(po.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-200">
                {paginatedPOs.map((po) => (
                  <div
                    key={po.id}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition ${selectedIds.has(po.id) ? 'bg-orange-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(po.id)}
                        onChange={() => toggleSelect(po.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1" onClick={() => router.push(`/po/view?id=${po.id}`)}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-mono font-medium text-slate-900">{po.po_number}</p>
                            <p className="text-sm text-slate-500">{po.vendors?.vendor_name || (po.vendor_id ? '-' : <span className="text-yellow-600 italic">TBD</span>)}</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(po.status)}`}>
                              {getStatusLabel(po.status)}
                            </span>
                            {po.status === 'Draft' && !po.vendor_id && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                                Incomplete
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">{po.divisions?.division_name}</span>
                          <span className="font-medium text-slate-900">{formatCurrency(po.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>
                    Showing {startIndex + 1}-{endIndex} of {filteredPOs.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <label htmlFor="rowsPerPage" className="text-slate-500">Rows:</label>
                    <select
                      id="rowsPerPage"
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                          page === p
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-6 py-3 shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button
            onClick={handleExportSelected}
            className="text-sm font-medium bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-lg transition"
          >
            Export Selected
          </button>
          <button
            onClick={clearSelection}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Clear
          </button>
        </div>
      )}
    </AppLayout>
  );
}
