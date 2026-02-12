'use client';

import { useState } from 'react';

interface Property {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface PropertyPickerProps {
  properties: Property[];
  loading: boolean;
  clientName: string;
  onSelect: (property: Property) => void;
  onSkip: () => void;
  onAddProperty: (name: string, address: string) => Promise<void>;
}

export default function PropertyPicker({
  properties,
  loading,
  clientName,
  onSelect,
  onSkip,
  onAddProperty,
}: PropertyPickerProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = properties.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(term) ||
      (p.property_address || '').toLowerCase().includes(term) ||
      (p.city || '').toLowerCase().includes(term)
    );
  });

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddProperty(newName.trim(), newAddress.trim());
      setShowAdd(false);
      setNewName('');
      setNewAddress('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Pick Property</h2>
        <p className="text-sm text-slate-500">Select a property for <span className="font-medium text-slate-700">{clientName}</span></p>
      </div>

      <input
        type="text"
        placeholder="Search properties..."
        aria-label="Search properties"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          {filtered.length === 0 && !showAdd ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-600 font-medium">No properties found</p>
              <p className="text-sm text-slate-500 mt-1">Add a new property for this client</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {filtered.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onSelect(prop)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition"
                >
                  <p className="font-medium text-slate-900">{prop.property_name}</p>
                  {prop.property_address && (
                    <p className="text-sm text-slate-500">{prop.property_address}</p>
                  )}
                  {(prop.city || prop.state) && (
                    <p className="text-sm text-slate-500">
                      {[prop.city, prop.state, prop.zip].filter(Boolean).join(', ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Add new property inline */}
          {showAdd ? (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Property Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Main Office"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, San Diego, CA"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAdd(false); setNewName(''); setNewAddress(''); }}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim() || adding}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {adding ? 'Adding...' : 'Add & Select'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Property
            </button>
          )}
        </>
      )}

      <button
        onClick={onSkip}
        className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 transition"
      >
        Skip — go directly to project selection
      </button>
    </div>
  );
}
