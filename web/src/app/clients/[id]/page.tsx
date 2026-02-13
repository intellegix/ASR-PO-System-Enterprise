'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface Property {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  _count: { projects: number };
}

interface ClientDetail {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  properties: Property[];
  _count: { projects: number; po_headers: number };
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add property form
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [addingProperty, setAddingProperty] = useState(false);

  useEffect(() => {
    if (isAuthenticated && id) fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        document.title = `${data.client_name} | ASR PO System`;
      } else {
        setError('Client not found');
      }
    } catch {
      setError('Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newPropName.trim()) return;
    setAddingProperty(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: id,
          propertyName: newPropName.trim(),
          propertyAddress: newPropAddress.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowAddProperty(false);
        setNewPropName('');
        setNewPropAddress('');
        await fetchClient();
      }
    } catch {
      console.error('Failed to create property');
    } finally {
      setAddingProperty(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout pageTitle="Client">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (error || !client) {
    return (
      <AppLayout pageTitle="Client">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Client not found'}</p>
          <Link href="/clients" className="text-orange-600 hover:text-orange-700">Back to Clients</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={client.client_name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500">
          <Link href="/clients" className="hover:text-orange-600">Clients</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 font-medium">{client.client_name}</span>
        </nav>

        {/* Client info header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{client.client_name}</h1>
              <p className="text-sm text-slate-500 font-mono">{client.client_code}</p>
              {client.parent_entity && (
                <p className="text-sm text-slate-600 mt-1">{client.parent_entity}</p>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              {client.category && (
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{client.category}</span>
              )}
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{client._count.projects} projects</span>
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">{client._count.po_headers} POs</span>
            </div>
          </div>

          {(client.contact_name || client.contact_email || client.contact_phone) && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {client.contact_name && (
                <div>
                  <span className="text-slate-500">Contact:</span>
                  <span className="ml-2 text-slate-900">{client.contact_name}</span>
                </div>
              )}
              {client.contact_email && (
                <div>
                  <span className="text-slate-500">Email:</span>
                  <span className="ml-2 text-slate-900">{client.contact_email}</span>
                </div>
              )}
              {client.contact_phone && (
                <div>
                  <span className="text-slate-500">Phone:</span>
                  <span className="ml-2 text-slate-900">{client.contact_phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Properties section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Properties ({client.properties.length})
            </h2>
            <button
              onClick={() => setShowAddProperty(true)}
              className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Property
            </button>
          </div>

          {/* Add property form */}
          {showAddProperty && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Name *</label>
                <input
                  type="text"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="e.g., Main Office Building"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, San Diego, CA"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddProperty(false); setNewPropName(''); setNewPropAddress(''); }}
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProperty}
                  disabled={!newPropName.trim() || addingProperty}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {addingProperty ? 'Adding...' : 'Add Property'}
                </button>
              </div>
            </div>
          )}

          {/* Property cards */}
          {client.properties.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No properties yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.properties.map((prop) => (
                <Link
                  key={prop.id}
                  href={`/clients/${client.id}/properties/${prop.id}`}
                  className="bg-white rounded-lg border border-slate-200 p-4 hover:border-orange-300 hover:shadow-sm transition"
                >
                  <h3 className="font-medium text-slate-900">{prop.property_name}</h3>
                  {prop.property_address && (
                    <p className="text-sm text-slate-500 mt-1">{prop.property_address}</p>
                  )}
                  {(prop.city || prop.state) && (
                    <p className="text-sm text-slate-500">
                      {[prop.city, prop.state, prop.zip].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{prop._count.projects} projects</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
