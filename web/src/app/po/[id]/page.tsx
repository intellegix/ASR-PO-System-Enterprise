'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhoneLink } from '@/components/ui/PhoneLink';

interface LineItem {
  id: string;
  line_number: number;
  item_description: string;
  quantity: string | number;
  unit_of_measure: string;
  unit_price: string | number;
  line_subtotal: string | number;
  is_taxable: boolean;
  status: string;
  gl_accounts: {
    gl_code_short: string;
    gl_account_name: string;
  } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  timestamp: string;
  notes: string | null;
  status_before: string | null;
  status_after: string | null;
  users: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PODetail {
  id: string;
  po_number: string;
  status: string;
  subtotal_amount: string | number;
  tax_amount: string | number;
  tax_rate: string | number;
  total_amount: string | number;
  created_at: string;
  updated_at: string;
  required_by_date: string | null;
  approved_at: string | null;
  issued_at: string | null;
  terms_code: string | null;
  notes_internal: string | null;
  notes_vendor: string | null;
  cost_center_code: string | null;
  vendors: {
    id: string;
    vendor_name: string;
    vendor_code: string;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
  } | null;
  projects: {
    id: string;
    project_code: string;
    project_name: string;
  } | null;
  divisions: {
    id: string;
    division_name: string;
    division_code: string;
  } | null;
  work_orders: {
    id: string;
    work_order_number: string;
    title: string;
  } | null;
  users_po_headers_requested_by_idTousers: {
    id: string;
    name: string;
    email: string;
  } | null;
  users_po_headers_approved_by_idTousers: {
    id: string;
    name: string;
    email: string;
  } | null;
  po_line_items: LineItem[];
  po_approvals: AuditEntry[];
}

const OWNER_APPROVAL_THRESHOLD = 25000;

export default function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [po, setPO] = useState<PODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchPO();
    }
  }, [authStatus, resolvedParams.id]);

  const fetchPO = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/po/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setPO(data);
      } else if (response.status === 404) {
        setError('Purchase order not found');
      } else {
        setError('Failed to load purchase order');
      }
    } catch (err) {
      setError('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!po) return;

    setDownloadingPdf(true);
    try {
      const response = await fetch(`/api/po/${po.id}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO-${po.po_number.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download PDF');
      }
    } catch (err) {
      setError('Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const performAction = async (action: string, notes?: string) => {
    if (!po) return;

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/po/${po.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const data = await response.json();

      if (response.ok) {
        setPO(data.po);
        setShowRejectModal(false);
        setRejectNotes('');
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (err) {
      setError('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (error && !po) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center max-w-md">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-900 mb-2">{error}</h2>
          <Link href="/po" className="text-blue-600 hover:text-blue-800">
            Back to PO List
          </Link>
        </div>
      </div>
    );
  }

  if (!po) return null;

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

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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
      PendingApproval: 'Pending Approval',
    };
    return labels[status] || status;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      POCreated: 'PO Created',
      POSubmitted: 'Submitted for Approval',
      POApproved: 'Approved',
      PORejected: 'Rejected',
      POIssued: 'Issued to Vendor',
      LineReceived: 'Marked as Received',
      POCancelled: 'Cancelled',
    };
    return labels[action] || action;
  };

  const poAmount = typeof po.total_amount === 'string' ? parseFloat(po.total_amount) : po.total_amount;
  const requiresOwnerApproval = poAmount > OWNER_APPROVAL_THRESHOLD;
  const userRole = session?.user?.role || '';
  const userDivisionId = session?.user?.divisionId || '';

  // Determine which actions are available
  const canSubmit = po.status === 'Draft';
  const canApprove = po.status === 'PendingApproval' && (
    userRole === 'MAJORITY_OWNER' ||
    (userRole === 'DIVISION_LEADER' && userDivisionId === po.divisions?.id && !requiresOwnerApproval) ||
    (userRole === 'OPERATIONS_MANAGER' && !requiresOwnerApproval)
  );
  const canReject = po.status === 'PendingApproval' && (
    userRole === 'MAJORITY_OWNER' ||
    userRole === 'DIVISION_LEADER' ||
    userRole === 'OPERATIONS_MANAGER'
  );
  const canIssue = po.status === 'Approved';
  const canReceive = po.status === 'Issued';
  const canCancel = ['Draft', 'PendingApproval', 'Approved'].includes(po.status);
  const canEdit = po.status === 'Draft';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/po" className="text-slate-500 hover:text-slate-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-mono">{po.po_number}</h1>
                <p className="text-sm text-slate-500">{po.divisions?.division_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                title="Download PDF"
              >
                {downloadingPdf ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span className="hidden sm:inline">PDF</span>
              </button>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(po.status)}`}>
                {getStatusLabel(po.status)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
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
        </div>
      )}

      {/* Threshold Warning */}
      {requiresOwnerApproval && po.status === 'PendingApproval' && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-800">
              This PO exceeds ${OWNER_APPROVAL_THRESHOLD.toLocaleString()} and requires owner approval.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(canSubmit || canApprove || canReject || canIssue || canReceive) && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap gap-3">
              {canSubmit && (
                <button
                  onClick={() => performAction('submit')}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit for Approval
                </button>
              )}

              {canApprove && (
                <button
                  onClick={() => performAction('approve')}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
              )}

              {canReject && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              )}

              {canIssue && (
                <button
                  onClick={() => performAction('issue')}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Issue to Vendor
                </button>
              )}

              {canReceive && (
                <button
                  onClick={() => performAction('receive')}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Mark as Received
                </button>
              )}

              {canCancel && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this PO?')) {
                      performAction('cancel');
                    }
                  }}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition font-medium disabled:opacity-50"
                >
                  Cancel PO
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vendor */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Vendor</h3>
            <p className="font-medium text-slate-900">{po.vendors?.vendor_name || '-'}</p>
            <p className="text-sm text-slate-500">{po.vendors?.vendor_code}</p>
            {po.vendors?.contact_name && (
              <p className="text-sm text-slate-600 mt-1">Contact: {po.vendors.contact_name}</p>
            )}
            <div className="flex flex-col gap-1 mt-2">
              <PhoneLink
                phone={po.vendors?.contact_phone}
                size="sm"
                className="text-sm"
              />
              {po.vendors?.contact_email && (
                <a
                  href={`mailto:${po.vendors.contact_email}`}
                  className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4zm2 0v12h10V4H5z"/>
                    <path d="m5.05 4.05 5.95 4.4 5.95-4.4"/>
                  </svg>
                  {po.vendors.contact_email}
                </a>
              )}
            </div>
          </div>

          {/* Project */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Project</h3>
            <p className="font-medium text-slate-900">{po.projects?.project_code || '-'}</p>
            <p className="text-sm text-slate-500">{po.projects?.project_name}</p>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Total Amount</h3>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(po.total_amount)}</p>
            <p className="text-sm text-slate-500">
              {formatCurrency(po.subtotal_amount)} + {formatCurrency(po.tax_amount)} tax
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-medium text-slate-900 mb-4">Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Work Order</p>
              <p className="font-medium text-slate-900">{po.work_orders?.work_order_number || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Cost Center</p>
              <p className="font-medium text-slate-900">{po.cost_center_code || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Terms</p>
              <p className="font-medium text-slate-900">{po.terms_code || 'Net30'}</p>
            </div>
            <div>
              <p className="text-slate-500">Required By</p>
              <p className="font-medium text-slate-900">{formatDate(po.required_by_date)}</p>
            </div>
            <div>
              <p className="text-slate-500">Requested By</p>
              <p className="font-medium text-slate-900">
                {po.users_po_headers_requested_by_idTousers?.name || '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Created</p>
              <p className="font-medium text-slate-900">{formatDateTime(po.created_at)}</p>
            </div>
            {po.approved_at && (
              <div>
                <p className="text-slate-500">Approved By</p>
                <p className="font-medium text-slate-900">
                  {po.users_po_headers_approved_by_idTousers?.name || '-'}
                </p>
              </div>
            )}
            {po.issued_at && (
              <div>
                <p className="text-slate-500">Issued</p>
                <p className="font-medium text-slate-900">{formatDateTime(po.issued_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">Line Items ({po.po_line_items.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-700">#</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-700">Description</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-700">GL</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-700">Qty</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-700">Unit Price</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-700">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.po_line_items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-500">{item.line_number}</td>
                    <td className="px-4 py-3 text-slate-900">{item.item_description}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.gl_accounts?.gl_code_short || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-900 text-right">
                      {item.quantity} {item.unit_of_measure}
                    </td>
                    <td className="px-4 py-3 text-slate-900 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-slate-900 text-right font-medium">
                      {formatCurrency(item.line_subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-slate-500">Subtotal</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {formatCurrency(po.subtotal_amount)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-right text-slate-500">
                    Tax ({((typeof po.tax_rate === 'string' ? parseFloat(po.tax_rate) : po.tax_rate) * 100).toFixed(2)}%)
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {formatCurrency(po.tax_amount)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={5} className="px-4 py-2 text-right text-slate-900">Total</td>
                  <td className="px-4 py-2 text-right text-slate-900">
                    {formatCurrency(po.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {(po.notes_internal || po.notes_vendor) && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 mb-4">Notes</h3>
            <div className="space-y-4">
              {po.notes_internal && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Internal Notes</p>
                  <p className="text-slate-900 bg-slate-50 rounded-lg p-3">{po.notes_internal}</p>
                </div>
              )}
              {po.notes_vendor && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Vendor Notes</p>
                  <p className="text-slate-900 bg-slate-50 rounded-lg p-3">{po.notes_vendor}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition"
          >
            <h3 className="font-medium text-slate-900">Activity Log ({po.po_approvals.length})</h3>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${showAuditLog ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAuditLog && (
            <div className="border-t border-slate-200 divide-y divide-slate-100">
              {po.po_approvals.map((entry) => (
                <div key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{getActionLabel(entry.action)}</p>
                      <p className="text-sm text-slate-500">
                        by {entry.users?.name || 'Unknown'}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 whitespace-nowrap">
                      {formatDateTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Reject PO</h2>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for rejection
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a reason..."
              />
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => performAction('reject', rejectNotes)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Reject PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
