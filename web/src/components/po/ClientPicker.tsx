'use client';

import { useState } from 'react';

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  aliases: string | null;
}

interface ClientPickerProps {
  clients: Client[];
  loading: boolean;
  onSelect: (client: Client) => void;
  onSkip: () => void;
}

export default function ClientPicker({ clients, loading, onSelect, onSkip }: ClientPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      c.client_name.toLowerCase().includes(term) ||
      c.client_code.toLowerCase().includes(term) ||
      (c.parent_entity || '').toLowerCase().includes(term) ||
      (c.aliases || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Pick Client</h2>
        <p className="text-sm text-slate-500">Which client is this purchase for?</p>
      </div>

      <input
        type="text"
        placeholder="Search clients..."
        aria-label="Search clients"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-slate-600 font-medium">No clients found</p>
          <p className="text-sm text-slate-500 mt-1">
            {search ? 'Try a different search term' : 'No active clients'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition"
            >
              <p className="font-medium text-slate-900">{client.client_name}</p>
              <p className="text-sm text-slate-500">
                {client.client_code}
                {client.category ? ` \u2022 ${client.category}` : ''}
                {client.parent_entity ? ` \u2022 ${client.parent_entity}` : ''}
              </p>
            </button>
          ))}
        </div>
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
