'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';

export default function CreateVendorInvoicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  useEffect(() => {
    document.title = 'Record Vendor Invoice | ASR PO System';
  }, []);

  const [form, setForm] = useState({
    invoiceNumber: '',
    vendorId: '',
    poId: '',
    projectId: '',
    divisionId: '',
    amount: '',
    taxAmount: '',
    totalAmount: '',
    dateReceived: new Date().toISOString().split('T')[0],
    dateDue: '',
    notes: '',
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    },
  });

  // Fetch POs for selected vendor
  const { data: vendorPOs } = useQuery({
    queryKey: ['vendor-pos', selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const res = await fetch(`/api/po?vendorId=${selectedVendorId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedVendorId,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });

  // Fetch divisions
  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const res = await fetch('/api/divisions');
      if (!res.ok) throw new Error('Failed to fetch divisions');
      return res.json();
    },
  });

  interface PurchaseOrder {
    id: string;
    project_id?: string | null;
    division_id?: string | null;
    subtotal_amount?: unknown;
    tax_amount?: unknown;
    total_amount?: unknown;
    status: string;
    po_number: string;
  }

  // Auto-populate from linked PO
  useEffect(() => {
    if (form.poId && vendorPOs) {
      const po = vendorPOs.find((p: PurchaseOrder) => p.id === form.poId);
      if (po) {
        setForm(prev => ({
          ...prev,
          projectId: po.project_id || prev.projectId,
          divisionId: po.division_id || prev.divisionId,
          amount: Number(po.subtotal_amount || 0).toFixed(2),
          taxAmount: Number(po.tax_amount || 0).toFixed(2),
          totalAmount: Number(po.total_amount || 0).toFixed(2),
        }));
      }
    }
  }, [form.poId, vendorPOs]);

  // Calculate total when amount/tax change
  useEffect(() => {
    const amt = parseFloat(form.amount) || 0;
    const tax = parseFloat(form.taxAmount) || 0;
    setForm(prev => ({ ...prev, totalAmount: (amt + tax).toFixed(2) }));
  }, [form.amount, form.taxAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/invoices/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      router.push('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout pageTitle="Record Vendor Invoice">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-slate-500">Record a vendor invoice, optionally linked to a purchase order</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
            <select
              value={form.vendorId}
              onChange={(e) => {
                setForm(prev => ({ ...prev, vendorId: e.target.value, poId: '' }));
                setSelectedVendorId(e.target.value);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">Select vendor...</option>
              {(Array.isArray(vendors) ? vendors : []).map((v: { id: string; vendor_name: string; vendor_code: string }) => (
                <option key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</option>
              ))}
            </select>
          </div>

          {/* Link to PO (optional) */}
          {selectedVendorId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Link to Purchase Order (optional)</label>
              <select
                value={form.poId}
                onChange={(e) => setForm(prev => ({ ...prev, poId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">No PO linked</option>
                {(Array.isArray(vendorPOs) ? vendorPOs : [])
                  .filter((po: PurchaseOrder) => ['Issued', 'Received', 'Approved'].includes(po.status))
                  .map((po: PurchaseOrder) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} - ${Number(po.total_amount).toLocaleString()} ({po.status})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Invoice Number *</label>
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              placeholder="e.g. INV-12345"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          {/* Project & Division */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
              <select
                value={form.projectId}
                onChange={(e) => setForm(prev => ({ ...prev, projectId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select project...</option>
                {(Array.isArray(projects) ? projects : []).map((p: { id: string; project_code: string; project_name: string }) => (
                  <option key={p.id} value={p.id}>{p.project_code} - {p.project_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Division</label>
              <select
                value={form.divisionId}
                onChange={(e) => setForm(prev => ({ ...prev, divisionId: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select division...</option>
                {(Array.isArray(divisions) ? divisions : []).map((d: { id: string; division_name: string }) => (
                  <option key={d.id} value={d.id}>{d.division_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.taxAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.totalAmount}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm bg-slate-50 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Received *</label>
              <input
                type="date"
                value={form.dateReceived}
                onChange={(e) => setForm(prev => ({ ...prev, dateReceived: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dateDue}
                onChange={(e) => setForm(prev => ({ ...prev, dateDue: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Optional notes..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/invoices"
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Invoice'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
