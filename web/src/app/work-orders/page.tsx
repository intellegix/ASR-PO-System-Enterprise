'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description: string | null;
  primary_trade: string | null;
  status: string;
  division_id: string | null;
  project_id: string | null;
  divisions?: {
    division_name: string;
  } | null;
  projects?: {
    project_code: string;
    project_name: string;
  } | null;
}

type StatusFilter = '' | 'Pending' | 'InProgress' | 'Completed' | 'OnHold' | 'Cancelled';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Cancelled', label: 'Cancelled' },
];

function getStatusBadge(status: string): string {
  const styles: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-700',
    InProgress: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    OnHold: 'bg-orange-100 text-orange-700',
    Cancelled: 'bg-gray-100 text-gray-500',
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    InProgress: 'In Progress',
    OnHold: 'On Hold',
  };
  return labels[status] || status;
}

export default function WorkOrdersPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkOrders();
    }
  }, [isAuthenticated]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-orders');
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
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

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (statusFilter && wo.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = wo.title.toLowerCase().includes(query);
      const matchesNumber = wo.work_order_number.toLowerCase().includes(query);
      if (!matchesTitle && !matchesNumber) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppLayout pageTitle="Work Orders">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredWorkOrders.length} work order{filteredWorkOrders.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or WO number..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {(statusFilter || searchQuery) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('');
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
          ) : filteredWorkOrders.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-500">
                {statusFilter || searchQuery
                  ? 'No work orders match your filters'
                  : 'No work orders found'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">WO Number</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Title</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Project</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Division</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Trade</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredWorkOrders.map((wo) => (
                      <tr
                        key={wo.id}
                        className="hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">
                          {wo.work_order_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                          {wo.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {wo.projects?.project_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {wo.divisions?.division_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {wo.primary_trade || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(wo.status)}`}>
                            {getStatusLabel(wo.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-slate-200">
                {filteredWorkOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-mono font-medium text-slate-900">{wo.work_order_number}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{wo.title}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full shrink-0 ml-2 ${getStatusBadge(wo.status)}`}>
                        {getStatusLabel(wo.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
                      <span className="text-slate-500">
                        {wo.projects?.project_code || '-'}
                      </span>
                      <span className="text-slate-500">
                        {wo.divisions?.division_name || '-'}
                      </span>
                      {wo.primary_trade && (
                        <span className="text-slate-500">{wo.primary_trade}</span>
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
