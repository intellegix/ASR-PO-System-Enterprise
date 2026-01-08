'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PO {
  id: string;
  po_number: string;
  status: string;
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

export default function POListPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [pos, setPOs] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchPOs();
    }
  }, [authStatus, statusFilter, divisionFilter]);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (divisionFilter) params.set('divisionId', divisionFilter);

      const response = await fetch(`/api/po?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPOs(data);
      }
    } catch (error) {
      console.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
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
      PendingApproval: 'bg-amber-100 text-amber-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
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
      PendingApproval: 'Pending',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-500 hover:text-slate-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Purchase Orders</h1>
                <p className="text-sm text-slate-500">{pos.length} POs found</p>
              </div>
            </div>
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
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="PendingApproval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Issued">Issued</option>
                <option value="Received">Received</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {(statusFilter || divisionFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setDivisionFilter('');
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PO List */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : pos.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 mb-4">No purchase orders found</p>
              <Link
                href="/po/create"
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create your first PO
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">PO Number</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Vendor</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Project</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Division</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Amount</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pos.map((po) => (
                      <tr
                        key={po.id}
                        onClick={() => router.push(`/po/${po.id}`)}
                        className="hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">
                          {po.po_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {po.vendors?.vendor_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {po.projects?.project_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {po.divisions?.division_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(po.status)}`}>
                            {getStatusLabel(po.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {formatDate(po.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-200">
                {pos.map((po) => (
                  <div
                    key={po.id}
                    onClick={() => router.push(`/po/${po.id}`)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono font-medium text-slate-900">{po.po_number}</p>
                        <p className="text-sm text-slate-500">{po.vendors?.vendor_name || '-'}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(po.status)}`}>
                        {getStatusLabel(po.status)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">{po.divisions?.division_name}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(po.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
