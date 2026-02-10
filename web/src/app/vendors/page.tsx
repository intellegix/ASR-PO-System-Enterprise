'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms_default: string | null;
}

const vendorTypeBadge = (type: string | null): string => {
  const styles: Record<string, string> = {
    Subcontractor: 'bg-blue-100 text-blue-700',
    Supplier: 'bg-green-100 text-green-700',
    Service: 'bg-purple-100 text-purple-700',
    Equipment: 'bg-orange-100 text-orange-700',
  };
  return styles[type || ''] || 'bg-slate-100 text-slate-700';
};

export default function VendorsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchVendors();
    }
  }, [isAuthenticated]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
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

  const filteredVendors = vendors.filter((vendor) => {
    const matchesType = !typeFilter || vendor.vendor_type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      vendor.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <AppLayout pageTitle="Vendors">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500">{filteredVendors.length} vendors</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="Subcontractor">Subcontractor</option>
                <option value="Supplier">Supplier</option>
                <option value="Service">Service</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by vendor name..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {(typeFilter || searchQuery) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setTypeFilter('');
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-slate-500">No vendors found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Code</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Type</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Contact</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Phone</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Payment Terms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredVendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">
                          {vendor.vendor_code}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                          {vendor.vendor_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${vendorTypeBadge(vendor.vendor_type)}`}>
                            {vendor.vendor_type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {vendor.contact_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {vendor.contact_phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {vendor.contact_email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {vendor.payment_terms_default || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-200">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="p-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{vendor.vendor_name}</p>
                        <p className="text-xs font-mono text-slate-500">{vendor.vendor_code}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${vendorTypeBadge(vendor.vendor_type)}`}>
                        {vendor.vendor_type || 'N/A'}
                      </span>
                    </div>
                    {vendor.contact_name && (
                      <p className="text-sm text-slate-600 mb-1">{vendor.contact_name}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      {vendor.contact_phone && (
                        <span>{vendor.contact_phone}</span>
                      )}
                      {vendor.contact_email && (
                        <span>{vendor.contact_email}</span>
                      )}
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
