'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// Icons
interface IconProps {
  className?: string;
}

const ClockIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DocumentIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TruckIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const CreditCardIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  po: {
    id: string;
    po_number: string;
    vendor_name: string;
    total_amount: number;
    division_name: string;
  };
  statusChange: {
    from: string | null;
    to: string | null;
  };
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditTrailProps {
  poId?: string; // If provided, show only audit trail for this PO
  limit?: number;
  className?: string;
}

export default function AuditTrail({ poId, limit = 50, className = '' }: AuditTrailProps) {
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch audit trail data
  const { data: auditData, isLoading, error, refetch } = useQuery({
    queryKey: ['audit-trail', poId, searchQuery, selectedAction, selectedUser, startDate, endDate, limit],
    queryFn: async (): Promise<{ entries: AuditTrailEntry[] }> => {
      const params = new URLSearchParams();
      if (poId) params.append('poId', poId);
      if (searchQuery) params.append('search', searchQuery);
      if (selectedAction) params.append('action', selectedAction);
      if (selectedUser) params.append('userId', selectedUser);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit-trail?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }
      return response.json();
    },
    refetchInterval: 30 * 1000, // 30 seconds
    staleTime: 15 * 1000, // 15 seconds
  });

  // Fetch available filters
  const { data: filters } = useQuery({
    queryKey: ['audit-filters'],
    queryFn: async () => {
      const response = await fetch('/api/audit-trail/filters');
      if (!response.ok) throw new Error('Failed to fetch filters');
      return response.json();
    },
  });

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedItems(newExpanded);
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return <DocumentIcon className="text-blue-600" />;
      case 'submitted':
        return <ClockIcon className="text-yellow-600" />;
      case 'approved':
        return <CheckIcon className="text-green-600" />;
      case 'rejected':
        return <XIcon className="text-red-600" />;
      case 'issued':
        return <TruckIcon className="text-purple-600" />;
      case 'received':
        return <CheckIcon className="text-emerald-600" />;
      case 'invoiced':
        return <DocumentIcon className="text-orange-600" />;
      case 'paid':
        return <CreditCardIcon className="text-green-700" />;
      case 'cancelled':
        return <XIcon className="text-gray-600" />;
      default:
        return <DocumentIcon className="text-slate-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'issued':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'received':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'invoiced':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'paid':
        return 'bg-green-100 text-green-900 border-green-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!session) {
    return <div className="text-slate-600">Please sign in to view audit trail.</div>;
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {poId ? 'PO Audit Trail' : 'System Audit Trail'}
            </h3>
            <p className="text-sm text-slate-500">
              Complete timeline of all purchase order activities and system changes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                // Export functionality would go here
                console.log('Export audit trail');
              }}
              className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {!poId && (
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="PO number, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Actions</option>
                <option value="Created">Created</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Issued">Issued</option>
                <option value="Received">Received</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Users</option>
                {filters?.users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading audit trail...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-6 py-8 text-center">
          <p className="text-red-600 mb-4">Failed to load audit trail data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Timeline */}
      {auditData && (
        <div className="px-6 py-4">
          {auditData.entries.length === 0 ? (
            <div className="text-center py-8">
              <DocumentIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-slate-500">No audit trail entries found</p>
              <p className="text-sm text-slate-400 mt-1">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-slate-200"></div>

              {/* Timeline entries */}
              <div className="space-y-4">
                {auditData.entries.map((entry, index) => (
                  <div key={entry.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute left-6 w-4 h-4 bg-white border-2 border-orange-400 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    </div>

                    {/* Entry content */}
                    <div className="ml-16 pb-4">
                      <div className="bg-slate-50 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                        {/* Entry header */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              {getActionIcon(entry.action)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(entry.action)}`}
                                  >
                                    {entry.action}
                                  </span>
                                  <span className="text-sm text-slate-600">
                                    {entry.po.po_number}
                                  </span>
                                  {entry.statusChange.from !== entry.statusChange.to && (
                                    <span className="text-xs text-slate-500">
                                      {entry.statusChange.from} → {entry.statusChange.to}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-slate-900">
                                  <span className="font-medium">{entry.actor.name}</span>
                                  {' '}performed{' '}
                                  <span className="font-medium">{entry.action.toLowerCase()}</span>
                                  {' '}on PO{' '}
                                  <span className="font-medium">{entry.po.po_number}</span>
                                  {' '}for{' '}
                                  <span className="font-medium">{entry.po.vendor_name}</span>
                                </p>
                                <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                                  <span className="flex items-center">
                                    <ClockIcon className="w-3 h-3 mr-1" />
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </span>
                                  <span className="flex items-center">
                                    <UserIcon className="w-3 h-3 mr-1" />
                                    {entry.actor.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                  </span>
                                  <span>
                                    {entry.po.division_name} • {formatCurrency(entry.po.total_amount)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <a
                                href={`/po/view?id=${entry.po.id}`}
                                className="text-orange-600 hover:text-orange-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLinkIcon />
                              </a>
                              <ChevronDownIcon
                                className={`text-slate-400 transition-transform ${
                                  expandedItems.has(entry.id) ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {expandedItems.has(entry.id) && (
                          <div className="border-t border-slate-200 p-4 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <h4 className="font-medium text-slate-900 mb-2">Action Details</h4>
                                <dl className="space-y-1">
                                  <div className="flex justify-between">
                                    <dt className="text-slate-500">Timestamp:</dt>
                                    <dd className="text-slate-900">
                                      {new Date(entry.timestamp).toLocaleString()}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-slate-500">Actor:</dt>
                                    <dd className="text-slate-900">{entry.actor.name}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-slate-500">Role:</dt>
                                    <dd className="text-slate-900">{entry.actor.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-slate-500">Email:</dt>
                                    <dd className="text-slate-900">{entry.actor.email}</dd>
                                  </div>
                                </dl>
                              </div>

                              <div>
                                <h4 className="font-medium text-slate-900 mb-2">System Info</h4>
                                <dl className="space-y-1">
                                  {entry.ipAddress && (
                                    <div className="flex justify-between">
                                      <dt className="text-slate-500">IP Address:</dt>
                                      <dd className="text-slate-900 font-mono text-xs">
                                        {entry.ipAddress}
                                      </dd>
                                    </div>
                                  )}
                                  {entry.userAgent && (
                                    <div>
                                      <dt className="text-slate-500 mb-1">User Agent:</dt>
                                      <dd className="text-slate-900 text-xs font-mono break-all">
                                        {entry.userAgent}
                                      </dd>
                                    </div>
                                  )}
                                  {entry.statusChange.from !== entry.statusChange.to && (
                                    <div className="flex justify-between">
                                      <dt className="text-slate-500">Status Change:</dt>
                                      <dd className="text-slate-900">
                                        {entry.statusChange.from || 'None'} → {entry.statusChange.to || 'None'}
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            </div>

                            {entry.notes && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <h4 className="font-medium text-slate-900 mb-2">Notes</h4>
                                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                                  {entry.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load more indicator */}
          {auditData.entries.length >= limit && (
            <div className="text-center pt-4 border-t border-slate-200 mt-6">
              <p className="text-sm text-slate-500">
                Showing {auditData.entries.length} entries.
                <button className="text-orange-600 hover:text-orange-700 ml-1">
                  Load more
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}