'use client';

import { useState } from 'react';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  primary_trade: string | null;
}

interface WorkOrderPickerProps {
  workOrders: WorkOrder[];
  loading: boolean;
  onSelect: (workOrderId: string | null, createTitle?: string) => void;
}

export default function WorkOrderPicker({ workOrders, loading, onSelect }: WorkOrderPickerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onSelect(null, newTitle.trim());
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Pick or Create Work Order</h2>
        <p className="text-sm text-slate-500">Select an existing work order or create a new one</p>
      </div>

      {/* Create New WO */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New Work Order</span>
        </button>
      ) : (
        <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
          <h3 className="font-medium text-slate-800">New Work Order</h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Material purchase for Phase 2"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreate(false); setNewTitle(''); }}
              className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim()}
              className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg disabled:opacity-50 font-medium"
            >
              Create & Generate PO
            </button>
          </div>
        </div>
      )}

      {/* Existing Work Orders */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        </div>
      ) : workOrders.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">Existing Work Orders</p>
          {workOrders.map((wo) => (
            <button
              key={wo.id}
              onClick={() => onSelect(wo.id)}
              className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition"
            >
              <p className="font-mono text-sm text-slate-500">{wo.work_order_number}</p>
              <p className="font-medium text-slate-900">{wo.title}</p>
              {wo.primary_trade && (
                <p className="text-sm text-slate-500">{wo.primary_trade}</p>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500">No work orders for this project yet</p>
          <p className="text-xs text-slate-400 mt-1">Create one above, or one will be auto-created</p>
        </div>
      )}

      {/* Skip / Auto-create option */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={() => onSelect(null)}
          className="w-full py-3 px-4 text-slate-500 hover:text-slate-700 text-sm transition"
        >
          Skip - Auto-create work order
        </button>
      </div>
    </div>
  );
}
