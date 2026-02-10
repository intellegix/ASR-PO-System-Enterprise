'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

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
  const { user, isAuthenticated, isLoading } = useAuth();
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
    fetchInvoices(true);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
    };
    return styles[status || ''] || 'bg-slate-100 text-slate-800';
  };

  return (
    <AppLayout pageTitle="Invoice Archive">
      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_invoices.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_amount)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Paid</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid_count.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_count.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto py-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice #, vendor, notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Vendor Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name || 'Unnamed'}</option>
                ))}
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(search || vendorId || projectId || paymentStatus || dateFrom || dateTo) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearch('');
                  setVendorId('');
                  setProjectId('');
                  setPaymentStatus('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice List */}
      <div className="max-w-7xl mx-auto pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Invoice #</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Vendor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Project</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Date</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Amount</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => fetchInvoiceDetail(invoice)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {invoice.invoice_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {invoice.vendor_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {invoice.project_code || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(invoice.payment_status)}`}>
                        {invoice.payment_status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => fetchInvoiceDetail(invoice)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{invoice.invoice_number || 'N/A'}</p>
                    <p className="text-sm text-slate-500">{invoice.vendor_name || '-'}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(invoice.payment_status)}`}>
                    {invoice.payment_status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{formatDate(invoice.invoice_date)}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {!loading && invoices.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-500">No invoices found matching your filters.</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Load More */}
          {!loading && hasMore && invoices.length > 0 && (
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setOffset(prev => prev + limit);
                  fetchInvoices(false);
                }}
                className="w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">
                Invoice {selectedInvoice.invoice_number || 'Details'}
              </h2>
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setInvoiceFiles([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-6">
              {/* Status */}
              <div className="flex justify-between items-center">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(selectedInvoice.payment_status)}`}>
                  {selectedInvoice.payment_status || 'Unknown'}
                </span>
                {selectedInvoice.document_type && (
                  <span className="text-sm text-slate-500">{selectedInvoice.document_type}</span>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Vendor</p>
                  <p className="font-medium text-slate-900">{selectedInvoice.vendor_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Project</p>
                  <p className="font-medium text-slate-900">{selectedInvoice.project_code || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Invoice Date</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedInvoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Due Date</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedInvoice.due_date)}</p>
                </div>
                {selectedInvoice.payment_date && (
                  <div>
                    <p className="text-sm text-slate-500">Payment Date</p>
                    <p className="font-medium text-slate-900">{formatDate(selectedInvoice.payment_date)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="font-medium text-slate-900">
                    {selectedInvoice.category || '-'}
                    {selectedInvoice.subcategory && ` / ${selectedInvoice.subcategory}`}
                  </p>
                </div>
              </div>

              {/* Amounts */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-900">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span className="text-slate-900">{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t border-slate-200">
                    <span className="text-slate-900">Total</span>
                    <span className="text-slate-900">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Notes</p>
                  <p className="text-slate-900 text-sm bg-slate-50 rounded-lg p-3">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Files */}
              {invoiceFiles.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Attached Files</p>
                  <div className="space-y-2">
                    {invoiceFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{file.original_filename}</p>
                          {file.file_size && (
                            <p className="text-xs text-slate-500">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                        {file.file_extension?.toUpperCase() && (
                          <span className="text-xs text-slate-500 uppercase">{file.file_extension}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4">
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setInvoiceFiles([]);
                }}
                className="w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
