'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PhoneLink } from '@/components/ui/PhoneLink';
import AppLayout from '@/components/layout/AppLayout';

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
  status_after: string;
  created_by: string | null;
  authorized_by: string | null;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  division_id: string;
  description: string;
  requested_by: string;
  authorized_by: string | null;
  vendor_id: string | null;
  total_amount: string | number;
  priority: string;
  status: string;
  project_id: string | null;
  department_id: string | null;
  gl_account_id: string | null;
  notes: string | null;
  delivery_date: string | null;
  attachments: string | null;
  is_taxable: boolean;
  tax_rate: string | number;
  tax_amount: string | number;
  shipping_amount: string | number;
  total_with_tax: string | number;
  created_at: string;
  updated_at: string;
  line_items: LineItem[];
  audit_log: AuditEntry[];
  vendor?: {
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  project?: {
    project_name: string;
  } | null;
  division?: {
    division_name: string;
  } | null;
}

function ViewPurchaseOrder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get ID from URL parameters instead of route parameters
  const id = searchParams.get('id');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && id) {
      fetchPurchaseOrder(id);
    }
  }, [status, id, router]);

  const fetchPurchaseOrder = async (poId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/po/${poId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch purchase order: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Normalize API response to match component interface
      const reqUser = data.users_po_headers_requested_by_user_idTousers;
      const appUser = data.users_po_headers_approved_by_user_idTousers;
      const normalized: PurchaseOrder = {
        ...data,
        description: data.notes_internal || '',
        requested_by: reqUser ? `${reqUser.first_name} ${reqUser.last_name}` : '',
        authorized_by: appUser ? `${appUser.first_name} ${appUser.last_name}` : null,
        priority: data.priority || '',
        notes: data.notes_vendor || data.notes_internal || null,
        is_taxable: Number(data.tax_amount) > 0,
        shipping_amount: 0,
        total_with_tax: data.total_amount,
        line_items: (data.po_line_items || []).map((li: any) => ({
          ...li,
          gl_accounts: li.gl_accounts || (li.gl_account_code ? {
            gl_code_short: li.gl_account_code,
            gl_account_name: li.gl_account_name || '',
          } : null),
        })),
        audit_log: (data.po_approvals || []).map((a: any) => ({
          id: a.id,
          action: a.action,
          timestamp: a.created_at,
          notes: a.notes,
          status_before: a.status_before,
          status_after: a.status_after,
          created_by: a.actor_user?.first_name ? `${a.actor_user.first_name} ${a.actor_user.last_name}` : null,
          authorized_by: null,
        })),
        vendor: data.vendors ? {
          name: data.vendors.vendor_name,
          contact_person: data.vendors.contact_name || null,
          phone: data.vendors.contact_phone || data.vendors.phone_main || null,
          email: data.vendors.contact_email || null,
        } : null,
        project: data.projects ? {
          project_name: `${data.projects.project_code} - ${data.projects.project_name}`,
        } : null,
        division: data.divisions ? {
          division_name: data.divisions.division_name,
        } : null,
      };
      setPo(normalized);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  // Handle approval/rejection actions
  const handleAction = async (action: 'approve' | 'reject', notes?: string) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/po/${id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to process action');
      }

      // Refresh the purchase order data
      await fetchPurchaseOrder(id);
    } catch (error) {
      console.error('Error processing action:', error);
      alert('Failed to process action. Please try again.');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Purchase Order</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => id && fetchPurchaseOrder(id)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Invalid Purchase Order</h2>
              <p className="text-gray-600 mb-4">No purchase order ID provided</p>
              <Link href="/po" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Back to Purchase Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchase Order Not Found</h2>
              <p className="text-gray-600 mb-4">The requested purchase order could not be found</p>
              <Link href="/po" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Back to Purchase Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canApprove = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
  const isPending = po.status.toLowerCase() === 'pending';

  return (
    <AppLayout pageTitle={`PO ${po.po_number}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchase Order #{po.po_number}</h1>
              <p className="text-gray-600">{po.description}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
              {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
            </span>
          </div>

          {/* Action buttons for managers/admins */}
          {canApprove && isPending && (
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => handleAction('approve')}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const notes = prompt('Rejection reason (optional):');
                  handleAction('reject', notes || undefined);
                }}
                className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}

          {/* Purchase Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Information</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Requested By</dt>
                  <dd className="text-sm text-gray-900">{po.requested_by}</dd>
                </div>
                {po.authorized_by && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Authorized By</dt>
                    <dd className="text-sm text-gray-900">{po.authorized_by}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-600">Division</dt>
                  <dd className="text-sm text-gray-900">{po.division?.division_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Project</dt>
                  <dd className="text-sm text-gray-900">{po.project?.project_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Priority</dt>
                  <dd className="text-sm text-gray-900">{po.priority}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Vendor & Financial</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Vendor</dt>
                  <dd className="text-sm text-gray-900">{po.vendor?.name || 'TBD'}</dd>
                </div>
                {po.vendor?.contact_person && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Contact</dt>
                    <dd className="text-sm text-gray-900">{po.vendor.contact_person}</dd>
                  </div>
                )}
                {po.vendor?.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Phone</dt>
                    <dd className="text-sm text-gray-900">
                      <PhoneLink phone={po.vendor.phone} />
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-600">Subtotal</dt>
                  <dd className="text-sm text-gray-900">${Number(po.total_amount).toFixed(2)}</dd>
                </div>
                {po.is_taxable && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Tax</dt>
                    <dd className="text-sm text-gray-900">${Number(po.tax_amount).toFixed(2)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-600 font-bold">Total</dt>
                  <dd className="text-sm text-gray-900 font-bold">${Number(po.total_with_tax).toFixed(2)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {po.notes && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{po.notes}</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        {po.line_items && po.line_items.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">#</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Description</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Qty</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Unit Price</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.line_items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2 text-sm text-gray-900">{item.line_number}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.item_description}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.quantity} {item.unit_of_measure}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">${Number(item.line_subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Log */}
        {po.audit_log && po.audit_log.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h3>
            <div className="space-y-3">
              {po.audit_log.map((entry) => (
                <div key={entry.id} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                      <p className="text-xs text-gray-600">
                        by {entry.created_by || 'System'} at {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-gray-600 mt-1">{entry.notes}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.status_before} → {entry.status_after}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Link
            href="/po"
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Back to Purchase Orders
          </Link>
          <div className="space-x-4 no-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Wrap with Suspense for useSearchParams() compatibility with static export
export default function ViewPurchaseOrderWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ViewPurchaseOrder />
    </Suspense>
  );
}