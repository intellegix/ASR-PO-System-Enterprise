'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface PendingApprovalItem {
  id: string;
  poNumber: string;
  amount: number;
  status: string;
  division: {
    id: string;
    name: string;
    code: string;
  };
  vendor: {
    name: string;
    code: string;
  };
  timing: {
    createdAt: string;
    daysPending: number;
    requiredByDate?: string;
    isOverdue: boolean;
  };
  urgency: {
    score: number;
    level: 'critical' | 'high' | 'medium' | 'low';
  };
  approval: {
    canApprove: boolean;
    reason?: string;
    requiresOwnerApproval: boolean;
  };
  preview: {
    itemsCount: number;
    firstItems: string[];
    notes?: string;
  };
}

interface PendingApprovalsData {
  summary: {
    total: number;
    byUrgency: Record<string, number>;
    totalValue: number;
    averageAge: number;
    actionable: number;
  };
  items: PendingApprovalItem[];
}

interface PendingApprovalsProps {
  limit?: number;
  urgencyFilter?: 'critical' | 'high' | 'medium' | 'low';
  className?: string;
}

const UrgencyBadge = ({ level, score }: { level: string; score: number }) => {
  const colors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[level as keyof typeof colors] || colors.low}`}>
      {level} ({score})
    </span>
  );
};

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function PendingApprovals({ limit = 10, urgencyFilter, className = '' }: PendingApprovalsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pending-approvals', urgencyFilter, limit],
    queryFn: async (): Promise<PendingApprovalsData> => {
      const params = new URLSearchParams();
      if (urgencyFilter) params.append('urgencyLevel', urgencyFilter);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/dashboards/pending-approvals?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }

      const result = await response.json();
      return {
        summary: result.summary,
        items: result.items,
      };
    },
    refetchInterval: 30 * 1000, // 30 seconds for real-time updates
    staleTime: 15 * 1000, // 15 seconds
  });

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm ${className}`}>
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-6 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <AlertTriangleIcon />
          <span className="font-medium">Failed to load pending approvals</span>
        </div>
        <p className="text-red-500 text-sm">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm ${className}`}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Pending Approvals</h3>
        </div>
        <div className="px-6 py-8 text-center">
          <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500 mb-3" />
          <p className="text-slate-500">No pending approvals</p>
          <p className="text-sm text-slate-400 mt-1">All POs are up to date!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Pending Approvals</h3>
            <p className="text-sm text-slate-500 mt-1">
              {data.summary.total} items • ${(data.summary.totalValue / 1000).toFixed(0)}k total value
            </p>
          </div>
          <Link href="/approvals" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            View all
          </Link>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs text-slate-600">
              Critical: {data.summary.byUrgency.critical || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-slate-600">
              High: {data.summary.byUrgency.high || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span className="text-xs text-slate-600">
              Avg age: {data.summary.averageAge.toFixed(1)} days
            </span>
          </div>
        </div>
      </div>

      {/* Pending items list */}
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {data.items.slice(0, limit).map((item) => (
          <Link
            key={item.id}
            href={`/po/${item.id}`}
            className="block px-6 py-4 hover:bg-slate-50 transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* PO Number and Vendor */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-900 font-mono text-sm">
                    {item.poNumber}
                  </p>
                  <UrgencyBadge level={item.urgency.level} score={item.urgency.score} />
                </div>

                <p className="text-sm text-slate-600 truncate mb-1">
                  {item.vendor.name} • {item.division.name}
                </p>

                {/* Preview and timing */}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{item.preview.itemsCount} items</span>
                  <div className="flex items-center gap-1">
                    <ClockIcon />
                    <span>
                      {item.timing.daysPending} day{item.timing.daysPending !== 1 ? 's' : ''} pending
                    </span>
                  </div>
                  {item.timing.isOverdue && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangleIcon />
                      <span>Overdue</span>
                    </div>
                  )}
                </div>

                {/* First items preview */}
                {item.preview.firstItems.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {item.preview.firstItems.slice(0, 2).join(', ')}
                    {item.preview.itemsCount > 2 && '...'}
                  </p>
                )}
              </div>

              {/* Amount and approval status */}
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-slate-900">
                  ${item.amount >= 1000000
                    ? `${(item.amount / 1000000).toFixed(1)}M`
                    : `${(item.amount / 1000).toFixed(0)}k`
                  }
                </p>

                {/* Approval capability indicator */}
                <div className="mt-1">
                  {item.approval.canApprove ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircleIcon className="w-3 h-3" />
                      Can approve
                    </span>
                  ) : item.approval.requiresOwnerApproval ? (
                    <span className="text-xs text-orange-600">Owner approval</span>
                  ) : (
                    <span className="text-xs text-slate-500">View only</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Show more link if there are more items */}
      {data.summary.total > limit && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
          <Link
            href="/approvals"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            View {data.summary.total - limit} more pending approvals →
          </Link>
        </div>
      )}
    </div>
  );
}