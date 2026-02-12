'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  budget_total: string | number | null;
  po_count: number | null;
  primary_division_id: string | null;
}

interface PropertyDetail {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  clients: { id: string; client_name: string; client_code: string };
  projects: Project[];
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string; propId: string }>;
}) {
  const { id: clientId, propId } = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && propId) fetchProperty();
  }, [isAuthenticated, propId]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propId}`);
      if (res.ok) {
        const data = await res.json();
        setProperty(data);
        document.title = `${data.property_name} | ASR PO System`;
      } else {
        setError('Property not found');
      }
    } catch {
      setError('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout pageTitle="Property">
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

  if (error || !property) {
    return (
      <AppLayout pageTitle="Property">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Property not found'}</p>
          <Link href="/clients" className="text-orange-600 hover:text-orange-700">Back to Clients</Link>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <AppLayout pageTitle={property.property_name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-500">
          <Link href="/clients" className="hover:text-orange-600">Clients</Link>
          <span className="mx-2">/</span>
          <Link href={`/clients/${clientId}`} className="hover:text-orange-600">{property.clients.client_name}</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 font-medium">{property.property_name}</span>
        </nav>

        {/* Property info header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900">{property.property_name}</h1>
          {property.property_address && (
            <p className="text-sm text-slate-600 mt-1">{property.property_address}</p>
          )}
          {(property.city || property.state) && (
            <p className="text-sm text-slate-500">
              {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
            </p>
          )}
          {property.notes && (
            <p className="text-sm text-slate-500 mt-2 italic">{property.notes}</p>
          )}
        </div>

        {/* Projects table */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Projects ({property.projects.length})
          </h2>

          {property.projects.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No projects linked to this property.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Budget</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">POs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {property.projects.map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{project.project_code}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{project.project_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            project.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatCurrency(project.budget_total)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 text-center">{project.po_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {property.projects.map((project) => (
                  <div key={project.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{project.project_name}</p>
                        <p className="text-sm text-slate-500 font-mono">{project.project_code}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        project.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>Budget: {formatCurrency(project.budget_total)}</span>
                      <span>{project.po_count || 0} POs</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
