'use client';

// Force dynamic rendering since this page requires authentication and makes API calls
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface PendingPO {
  id: string;
  po_number: string;
  status: string;
  total_amount: string | number;
  created_at: string;
  required_by_date: string | null;
  requiresOwnerApproval: boolean;
  canApprove: boolean;
  lineItemCount: number;
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
  users_po_headers_requested_by_idTousers: {
    id: string;
    name: string;
  } | null;
}

const OWNER_APPROVAL_THRESHOLD = 25000;

export default function ApprovalsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Approvals | ASR PO System';
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingPOs();
    }
  }, [isAuthenticated]);

  const fetchPendingPOs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/po/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingPOs(data);
      }
    } catch (error) {
      console.error('Error fetching pending POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (poId: string, action: 'approve' | 'reject', notes?: string) => {
    setActionLoading(poId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/po/${poId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        // Remove from list
        setPendingPOs((prev) => prev.filter((po) => po.id !== poId));
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (err) {
      setError('Failed to perform action');
    } finally {
      setActionLoading(null);
    }
  };

  const quickApprove = (po: PendingPO) => {
    if (!po.canApprove) {
      setError('You do not have permission to approve this PO');
      return;
    }
    performAction(po.id, 'approve');
  };

  const quickReject = (po: PendingPO) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason !== null) {
      performAction(po.id, 'reject', reason);
    }
  };

  if (authLoading) {
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

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const userRole = user?.role || '';

  return (
    <AppLayout pageTitle="Approvals">
      {/* Pending count subtitle */}
      <div className="max-w-5xl mx-auto mb-4">
        <p className="text-sm text-slate-500">
          {pendingPOs.length} PO{pendingPOs.length !== 1 ? 's' : ''} awaiting your review
        </p>
      </div>

      {/* Alerts */}
      <div className="max-w-5xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <p className="text-green-800">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto py-6">
        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : pendingPOs.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-bold text-slate-900 mb-2">All caught up!</h2>
            <p className="text-slate-500 mb-4">No purchase orders are waiting for your approval.</p>
            <Link
              href="/po"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              View all POs
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPOs.map((po) => {
              const poAmount = typeof po.total_amount === 'string' ? parseFloat(po.total_amount) : po.total_amount;
              const isHighValue = poAmount > OWNER_APPROVAL_THRESHOLD;
              const isLoading = actionLoading === po.id;

              return (
                <div
                  key={po.id}
                  className={`bg-white rounded-lg border ${
                    isHighValue ? 'border-amber-300' : 'border-slate-200'
                  } overflow-hidden`}
                >
                  {isHighValue && (
                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium text-amber-700">
                        High-value PO - Requires Owner Approval
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <Link
                          href={`/po/view?id=${po.id}`}
                          className="font-mono font-bold text-lg text-slate-900 hover:text-blue-600"
                        >
                          {po.po_number}
                        </Link>
                        <p className="text-sm text-slate-500">
                          {po.vendors?.vendor_name} &bull; {po.divisions?.division_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(po.total_amount)}</p>
                        <p className="text-sm text-slate-500">{po.lineItemCount} line items</p>
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-slate-500">Project</p>
                        <p className="font-medium text-slate-900">{po.projects?.project_code || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Requested By</p>
                        <p className="font-medium text-slate-900">
                          {po.users_po_headers_requested_by_idTousers?.name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Submitted</p>
                        <p className="font-medium text-slate-900">{getTimeAgo(po.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Required By</p>
                        <p className="font-medium text-slate-900">{formatDate(po.required_by_date)}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                      <Link
                        href={`/po/view?id=${po.id}`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </Link>

                      {po.canApprove ? (
                        <>
                          <button
                            onClick={() => quickApprove(po)}
                            disabled={isLoading}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                          >
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => quickReject(po)}
                            disabled={isLoading}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                          >
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            Reject
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {isHighValue ? 'Owner approval required' : 'Cannot approve'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
