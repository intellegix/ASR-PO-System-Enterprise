'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  aliases: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  _count?: { properties: number; projects: number };
}

export default function ClientsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Clients | ASR PO System';
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchClients();
  }, [isAuthenticated]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        // Fetch property/project counts
        const enriched = await Promise.all(
          data.map(async (c: Client) => {
            try {
              const detailRes = await fetch(`/api/clients/${c.id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                return {
                  ...c,
                  _count: {
                    properties: detail.properties?.length || 0,
                    projects: detail._count?.projects || 0,
                  },
                };
              }
            } catch {}
            return { ...c, _count: { properties: 0, projects: 0 } };
          })
        );
        setClients(enriched);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
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

  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      c.client_name.toLowerCase().includes(term) ||
      c.client_code.toLowerCase().includes(term) ||
      (c.parent_entity || '').toLowerCase().includes(term) ||
      (c.category || '').toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout pageTitle="Clients">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-sm text-slate-500">{clients.length} active clients</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search clients by name, code, or parent entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-slate-500">
              {searchQuery ? 'No clients match your search.' : 'No clients found.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Parent Entity</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Properties</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium text-slate-900 hover:text-orange-600"
                        >
                          {client.client_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{client.client_code}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.category || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{client.parent_entity || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{client._count?.properties || 0}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{client._count?.projects || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-orange-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{client.client_name}</p>
                      <p className="text-sm text-slate-500 font-mono">{client.client_code}</p>
                    </div>
                    {client.category && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {client.category}
                      </span>
                    )}
                  </div>
                  {client.parent_entity && (
                    <p className="text-xs text-slate-500 mt-1">{client.parent_entity}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>{client._count?.properties || 0} properties</span>
                    <span>{client._count?.projects || 0} projects</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
