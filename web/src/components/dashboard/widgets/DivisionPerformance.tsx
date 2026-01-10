'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface DivisionMetric {
  division: {
    id: string;
    name: string;
    code: string;
  };
  metrics: {
    currentMonthSpend: number;
    currentMonthCount: number;
    ytdSpend: number;
    ytdCount: number;
    pendingApprovals: number;
    averagePOValue: number;
  };
}

interface CrossDivisionData {
  companyWide: {
    currentMonth: {
      totalSpend: number;
      totalCount: number;
      averagePOValue: number;
    };
    yearToDate: {
      totalSpend: number;
      totalCount: number;
    };
    alerts: {
      highValuePendingCount: number;
      approvalBottlenecks: number;
    };
  };
  divisionBreakdown: DivisionMetric[];
  approvalVelocity: Array<{
    divisionName: string;
    approvedCount: number;
    avgApprovalTimeHours: number;
  }>;
}

interface DivisionPerformanceProps {
  className?: string;
}

const TrendIcon = ({ value, isTime = false }: { value: number; isTime?: boolean }) => {
  const isGood = isTime ? value < 24 : value > 0; // For time: <24 hours is good, for others: positive is good
  const isNeutral = isTime ? value >= 24 && value <= 48 : value === 0;

  if (isNeutral) {
    return (
      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  }

  return isGood ? (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
};

const AlertIcon = () => (
  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default function DivisionPerformance({ className = '' }: DivisionPerformanceProps) {
  const { data: session } = useSession();

  // Only show to MAJORITY_OWNER and ACCOUNTING
  const canViewCrossDivision = ['MAJORITY_OWNER', 'ACCOUNTING'].includes(session?.user?.role || '');

  const { data, isLoading, error } = useQuery({
    queryKey: ['cross-division-kpis'],
    queryFn: async (): Promise<CrossDivisionData> => {
      const response = await fetch('/api/dashboards/cross-division');

      if (!response.ok) {
        throw new Error('Failed to fetch cross-division data');
      }

      const result = await response.json();
      return result.kpis;
    },
    enabled: canViewCrossDivision,
    refetchInterval: 3 * 60 * 1000, // 3 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (!canViewCrossDivision) {
    return null; // Don't show this widget for users without cross-division access
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm ${className}`}>
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-6 bg-slate-200 rounded animate-pulse w-1/3"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between animate-pulse">
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertIcon />
          <span className="font-medium">Failed to load division performance</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Sort divisions by current month spend (highest first)
  const sortedDivisions = data.divisionBreakdown.sort(
    (a, b) => b.metrics.currentMonthSpend - a.metrics.currentMonthSpend
  );

  // Find best and worst performing divisions by approval velocity
  const velocityData = data.approvalVelocity.filter(v => v.approvedCount > 0);
  const fastestApproval = velocityData.reduce(
    (min, current) => current.avgApprovalTimeHours < min.avgApprovalTimeHours ? current : min,
    velocityData[0]
  );
  const slowestApproval = velocityData.reduce(
    (max, current) => current.avgApprovalTimeHours > max.avgApprovalTimeHours ? current : max,
    velocityData[0]
  );

  const hasAlerts = data.companyWide.alerts.highValuePendingCount > 0 ||
                   data.companyWide.alerts.approvalBottlenecks > 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChartBarIcon />
            <div>
              <h3 className="font-semibold text-slate-900">Division Performance</h3>
              <p className="text-sm text-slate-500">Current month overview</p>
            </div>
          </div>
          <Link href="/reports" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            View reports
          </Link>
        </div>

        {/* Company-wide summary */}
        <div className="mt-4 bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Total Spend</p>
              <p className="text-lg font-bold text-slate-900">
                ${(data.companyWide.currentMonth.totalSpend / 1000000).toFixed(1)}M
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Total POs</p>
              <p className="text-lg font-bold text-slate-900">
                {data.companyWide.currentMonth.totalCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Avg PO Value</p>
              <p className="text-lg font-bold text-slate-900">
                ${(data.companyWide.currentMonth.averagePOValue / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasAlerts && <AlertIcon />}
              <div>
                <p className="text-xs text-slate-500 mb-1">Alerts</p>
                <p className={`text-lg font-bold ${hasAlerts ? 'text-amber-600' : 'text-green-600'}`}>
                  {hasAlerts ? data.companyWide.alerts.highValuePendingCount + data.companyWide.alerts.approvalBottlenecks : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Division breakdown */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-slate-700 mb-4">Division Breakdown</h4>
        <div className="space-y-3">
          {sortedDivisions.map((division) => {
            const efficiency = division.metrics.pendingApprovals === 0 ? 100 :
              Math.max(0, 100 - (division.metrics.pendingApprovals / division.metrics.currentMonthCount) * 100);

            return (
              <div key={division.division.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-700">
                      {division.division.code}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {division.division.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        ${(division.metrics.currentMonthSpend / 1000).toFixed(0)}k spend
                      </span>
                      <span>
                        {division.metrics.currentMonthCount} POs
                      </span>
                      {division.metrics.pendingApprovals > 0 && (
                        <span className="text-amber-600">
                          {division.metrics.pendingApprovals} pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendIcon value={efficiency} />
                    <span className={`text-sm font-medium ${
                      efficiency >= 90 ? 'text-green-600' :
                      efficiency >= 75 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {efficiency.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">efficiency</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Approval velocity highlights */}
        {velocityData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Approval Velocity</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {fastestApproval && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendIcon value={fastestApproval.avgApprovalTimeHours} isTime={true} />
                    <span className="text-sm font-medium text-green-800">Fastest</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {fastestApproval.divisionName}
                  </p>
                  <p className="text-xs text-green-600">
                    {fastestApproval.avgApprovalTimeHours.toFixed(1)} hours avg
                  </p>
                </div>
              )}

              {slowestApproval && slowestApproval !== fastestApproval && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendIcon value={slowestApproval.avgApprovalTimeHours} isTime={true} />
                    <span className="text-sm font-medium text-red-800">Needs attention</span>
                  </div>
                  <p className="text-sm text-red-700">
                    {slowestApproval.divisionName}
                  </p>
                  <p className="text-xs text-red-600">
                    {slowestApproval.avgApprovalTimeHours.toFixed(1)} hours avg
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}