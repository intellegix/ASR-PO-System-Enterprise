'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';

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

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-blue-100 text-blue-800',
      Paid: 'bg-green-100 text-green-800',
      Disputed: 'bg-red-100 text-red-800',
      Draft: 'bg-gray-100 text-gray-800',
      Sent: 'bg-blue-100 text-blue-800',
      Overdue: 'bg-red-100 text-red-800',
      Cancelled: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredVendorInvoices = useMemo(() => {
    if (!vendorInvoices) return [];
    let result = [...vendorInvoices];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((inv: any) =>
        inv.invoice_number?.toLowerCase().includes(lower) ||
        inv.vendors?.vendor_name?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter) {
      result = result.filter((inv: any) => inv.status === statusFilter);
    }
    return result;
  }, [vendorInvoices, debouncedSearch, statusFilter]);

  const filteredCustomerInvoices = useMemo(() => {
    if (!customerInvoices) return [];
    let result = [...customerInvoices];
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((inv: any) =>
        inv.invoice_number?.toLowerCase().includes(lower) ||
        inv.customer_name?.toLowerCase().includes(lower) ||
        inv.projects?.project_code?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter) {
      result = result.filter((inv: any) => inv.status === statusFilter);
    }
    return result;
  }, [customerInvoices, debouncedSearch, statusFilter]);

  return (
    <AppLayout pageTitle="Invoices">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <p className="text-sm text-slate-500">Manage vendor and customer invoices</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <Link
              href="/invoices/vendor/create"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Vendor Invoice
            </Link>
            <Link
              href="/invoices/customer/create"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Customer Invoice
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('vendor')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'vendor'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Vendor Invoices (AP)
              {vendorInvoices?.length > 0 && (
                <span className="ml-2 bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                  {vendorInvoices.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'customer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Customer Invoices (AR)
              {customerInvoices?.length > 0 && (
                <span className="ml-2 bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                  {customerInvoices.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={activeTab === 'vendor' ? 'Invoice # or vendor...' : 'Invoice #, customer, or project...'}
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
                {activeTab === 'vendor' ? (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Paid">Paid</option>
                    <option value="Disputed">Disputed</option>
                  </>
                ) : (
                  <>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>
            {(debouncedSearch || statusFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setSearchText(''); setDebouncedSearch(''); setStatusFilter(''); }}
                  className="w-full px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Invoices Tab */}
        {activeTab === 'vendor' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {vendorLoading ? (
              <div className="p-8 text-center text-slate-500">Loading vendor invoices...</div>
            ) : filteredVendorInvoices.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 mb-3">
                  {(debouncedSearch || statusFilter) ? 'No invoices match your filters' : 'No vendor invoices recorded yet'}
                </p>
                {!(debouncedSearch || statusFilter) && (
                  <Link
                    href="/invoices/vendor/create"
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                  >
                    Record your first vendor invoice
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Invoice #</th>
                    <th className="px-6 py-3">Vendor</th>
                    <th className="px-6 py-3">PO #</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendorInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{inv.vendors?.vendor_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{inv.po_headers?.po_number || '-'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(inv.date_received).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Customer Invoices Tab */}
        {activeTab === 'customer' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {customerLoading ? (
              <div className="p-8 text-center text-slate-500">Loading customer invoices...</div>
            ) : filteredCustomerInvoices.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 mb-3">
                  {(debouncedSearch || statusFilter) ? 'No invoices match your filters' : 'No customer invoices created yet'}
                </p>
                {!(debouncedSearch || statusFilter) && (
                  <Link
                    href="/invoices/customer/create"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Create your first customer invoice
                  </Link>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Invoice #</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Project</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomerInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{inv.customer_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {inv.projects?.project_code} - {inv.projects?.project_name}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(inv.date_issued).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
