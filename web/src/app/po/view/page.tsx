'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PhoneLink } from '@/components/ui/PhoneLink';
import AppLayout from '@/components/layout/AppLayout';

// Interfaces for completion form
interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string;
  payment_terms_default: string | null;
}

interface GLAccount {
  id: string;
  gl_code_short: string;
  gl_account_number: string;
  gl_account_name: string;
  is_taxable_default: boolean;
}

interface NewLineItem {
  id: string;
  itemDescription: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  glAccountId: string;
  glAccountName?: string;
  isTaxable: boolean;
}

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
  subtotal_amount: string | number;
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
  client?: {
    client_name: string;
    category: string | null;
  } | null;
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

  // Phase 2 completion form state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);
  const [completionVendorId, setCompletionVendorId] = useState('');
  const [completionVendorSearch, setCompletionVendorSearch] = useState('');
  const [completionLineItems, setCompletionLineItems] = useState<NewLineItem[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionVendorNotes, setCompletionVendorNotes] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUOM, setNewItemUOM] = useState('EA');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemGLId, setNewItemGLId] = useState('');
  const [newItemTaxable, setNewItemTaxable] = useState(true);
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

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
          timestamp: a.timestamp,
          notes: a.notes,
          status_before: a.status_before,
          status_after: a.status_after,
          created_by: (a.users || a.actor_user)?.first_name ? `${(a.users || a.actor_user).first_name} ${(a.users || a.actor_user).last_name}` : null,
          authorized_by: null,
        })),
        client: data.clients ? {
          client_name: data.clients.client_name,
          category: data.clients.category || null,
        } : null,
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

  // Fetch vendors and GL accounts if PO is incomplete draft
  useEffect(() => {
    if (po && po.status === 'Draft' && !po.vendor_id) {
      const fetchCompletionData = async () => {
        try {
          const [vendorRes, glRes] = await Promise.all([
            fetch('/api/vendors'),
            fetch('/api/gl-accounts'),
          ]);
          if (vendorRes.ok) setVendors(await vendorRes.json());
          if (glRes.ok) setGLAccounts(await glRes.json());
        } catch (err) {
          console.error('Error fetching completion data:', err);
        }
      };
      fetchCompletionData();
    }
  }, [po]);

  const isIncompleteDraft = po && po.status === 'Draft' && !po.vendor_id;

  const addCompletionLineItem = () => {
    if (!newItemDesc || !newItemGLId || newItemPrice <= 0) return;
    const glAccount = glAccounts.find((g) => g.id === newItemGLId);
    setCompletionLineItems([
      ...completionLineItems,
      {
        id: Date.now().toString(),
        itemDescription: newItemDesc,
        quantity: newItemQty,
        unitOfMeasure: newItemUOM,
        unitPrice: newItemPrice,
        glAccountId: newItemGLId,
        glAccountName: glAccount?.gl_account_name,
        isTaxable: newItemTaxable,
      },
    ]);
    setShowAddItem(false);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemUOM('EA');
    setNewItemPrice(0);
    setNewItemGLId('');
    setNewItemTaxable(true);
  };

  const removeCompletionLineItem = (itemId: string) => {
    setCompletionLineItems(completionLineItems.filter((i) => i.id !== itemId));
  };

  const completionSubtotal = completionLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const completionTaxable = completionLineItems.filter((i) => i.isTaxable).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const completionTax = completionTaxable * 0.0775;
  const completionTotal = completionSubtotal + completionTax;

  const handleCompletePO = async (status: 'Draft' | 'Submitted') => {
    if (!id || !completionVendorId || completionLineItems.length === 0) return;
    setCompletionSubmitting(true);
    setCompletionError(null);

    try {
      const res = await fetch(`/api/po/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: completionVendorId,
          lineItems: completionLineItems.map((item) => ({
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            unitPrice: item.unitPrice,
            glAccountId: item.glAccountId,
            isTaxable: item.isTaxable,
          })),
          notesInternal: completionNotes || undefined,
          notesVendor: completionVendorNotes || undefined,
          status,
        }),
      });

      if (res.ok) {
        await fetchPurchaseOrder(id);
        setCompletionLineItems([]);
        setCompletionVendorId('');
      } else {
        const errData = await res.json();
        setCompletionError(errData.error || 'Failed to complete PO');
      }
    } catch (err) {
      console.error('Error completing PO:', err);
      setCompletionError('Network error. Please try again.');
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (!completionVendorSearch) return true;
    const term = completionVendorSearch.toLowerCase();
    return v.vendor_name.toLowerCase().includes(term) || v.vendor_code.toLowerCase().includes(term);
  });

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
                {po.client && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Client</dt>
                    <dd className="text-sm text-gray-900">{po.client.client_name}{po.client.category ? ` (${po.client.category})` : ''}</dd>
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
                  <dd className="text-sm text-gray-900">${Number(po.subtotal_amount).toFixed(2)}</dd>
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

        {/* Phase 2 Completion Form — Incomplete Draft */}
        {isIncompleteDraft && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm font-medium text-amber-800">
                  This PO needs vendor and line item details. Complete the form below.
                </p>
              </div>
            </div>

            {completionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {completionError}
              </div>
            )}

            {/* Vendor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={completionVendorSearch}
                onChange={(e) => {
                  setCompletionVendorSearch(e.target.value);
                  if (completionVendorId) setCompletionVendorId('');
                }}
                placeholder="Search vendors..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2"
              />
              {completionVendorSearch && !completionVendorId && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  {filteredVendors.length === 0 ? (
                    <p className="p-3 text-sm text-slate-500">No vendors match</p>
                  ) : (
                    filteredVendors.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setCompletionVendorId(v.id);
                          setCompletionVendorSearch(v.vendor_name);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 transition text-sm border-b border-slate-100 last:border-b-0"
                      >
                        <span className="font-medium text-slate-900">{v.vendor_name}</span>
                        <span className="text-slate-500 ml-2">({v.vendor_code})</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {completionVendorId && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Vendor selected
                </p>
              )}
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Line Items <span className="text-red-500">*</span>
                </label>
                {!showAddItem && (
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                )}
              </div>

              {/* Existing items list */}
              {completionLineItems.length > 0 && (
                <div className="space-y-2 mb-4">
                  {completionLineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.itemDescription}</p>
                        <p className="text-xs text-slate-500">
                          {item.quantity} {item.unitOfMeasure} x ${item.unitPrice.toFixed(2)} = ${(item.quantity * item.unitPrice).toFixed(2)}
                          {item.glAccountName && <span className="ml-2 text-slate-400">| {item.glAccountName}</span>}
                          {item.isTaxable && <span className="ml-2 text-amber-600">Taxable</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => removeCompletionLineItem(item.id)}
                        className="ml-2 text-red-400 hover:text-red-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add item form */}
              {showAddItem && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                    <input
                      type="text"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="e.g., Roofing shingles"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                      <input
                        type="number"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Number(e.target.value))}
                        min="0.01"
                        step="0.01"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">UOM</label>
                      <select
                        value={newItemUOM}
                        onChange={(e) => setNewItemUOM(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="EA">Each</option>
                        <option value="LF">Linear Ft</option>
                        <option value="SF">Sq Ft</option>
                        <option value="HR">Hour</option>
                        <option value="LOT">Lot</option>
                        <option value="BX">Box</option>
                        <option value="CS">Case</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price *</label>
                      <input
                        type="number"
                        value={newItemPrice || ''}
                        onChange={(e) => setNewItemPrice(Number(e.target.value))}
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">GL Account *</label>
                      <select
                        value={newItemGLId}
                        onChange={(e) => setNewItemGLId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select...</option>
                        {glAccounts.map((gl) => (
                          <option key={gl.id} value={gl.id}>
                            {gl.gl_code_short} - {gl.gl_account_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newItemTaxable}
                        onChange={(e) => setNewItemTaxable(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      Taxable (7.75%)
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowAddItem(false); setNewItemDesc(''); setNewItemPrice(0); setNewItemGLId(''); }}
                      className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addCompletionLineItem}
                      disabled={!newItemDesc || !newItemGLId || newItemPrice <= 0}
                      className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium transition"
                    >
                      Add Line Item
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Totals */}
            {completionLineItems.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900 font-medium">${completionSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax (7.75%)</span>
                  <span className="text-slate-900">${completionTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1">
                  <span className="text-slate-900">Total</span>
                  <span className="text-slate-900">${completionTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Notes</label>
                <textarea
                  value={completionVendorNotes}
                  onChange={(e) => setCompletionVendorNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes for vendor..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleCompletePO('Draft')}
                disabled={completionSubmitting || !completionVendorId || completionLineItems.length === 0}
                className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
              >
                {completionSubmitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => handleCompletePO('Submitted')}
                disabled={completionSubmitting || !completionVendorId || completionLineItems.length === 0}
                className="flex-1 py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                {completionSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}

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
                        by {entry.created_by || 'System'} at {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
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