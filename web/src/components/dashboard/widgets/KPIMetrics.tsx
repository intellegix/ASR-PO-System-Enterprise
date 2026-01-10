'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface KPIData {
  timeframe: {
    period: string;
    label: string;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalSpend: number;
    totalCount: number;
    averagePOValue: number;
    pendingCount: number;
    pendingAmount: number;
  };
  status: Record<string, number>;
  alerts: {
    highValuePending: number;
    approvalBottlenecks: number;
  };
  scope: {
    divisionId: string | null;
    divisionName: string | null;
    isCompanyWide: boolean;
  };
}

interface KPIMetricsProps {
  divisionId?: string;
  timeframe?: 'current_month' | 'ytd' | 'last_30_days';
  className?: string;
}

const TrendIcon = ({ isPositive, isNeutral }: { isPositive: boolean; isNeutral: boolean }) => {
  if (isNeutral) {
    return (
      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  }

  return isPositive ? (
    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
    </svg>
  );
};

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

export default function KPIMetrics({ divisionId, timeframe = 'current_month', className = '' }: KPIMetricsProps) {
  const [refreshInterval, setRefreshInterval] = useState<number | false>(5 * 60 * 1000); // 5 minutes

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['kpis', divisionId, timeframe],
    queryFn: async (): Promise<{ kpis: KPIData; lastUpdated: string }> => {
      const params = new URLSearchParams();
      if (divisionId) params.append('divisionId', divisionId);
      params.append('timeframe', timeframe);
      params.append('includeHealth', 'false');

      const response = await fetch(`/api/dashboards/kpis?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch KPI data');
      }

      return response.json();
    },
    refetchInterval: refreshInterval,
    staleTime: 60 * 1000, // 1 minute
    retry: 3,
  });

  // Manual refresh function
  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
            <div className="h-4 bg-slate-200 rounded mb-3"></div>
            <div className="h-8 bg-slate-200 rounded mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-800">
          <AlertIcon />
          <span className="font-medium">Failed to load KPI data</span>
        </div>
        <p className="text-red-600 text-sm mt-1">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const kpis = data?.kpis;
  if (!kpis) return null;

  // Calculate some derived metrics for trends
  const avgPOValue = kpis.metrics.totalCount > 0 ? kpis.metrics.totalSpend / kpis.metrics.totalCount : 0;
  const pendingRate = kpis.metrics.totalCount > 0 ? (kpis.metrics.pendingCount / kpis.metrics.totalCount) * 100 : 0;
  const hasAlerts = kpis.alerts.highValuePending > 0 || kpis.alerts.approvalBottlenecks > 0;

  return (
    <div className={className}>
      {/* Header with timeframe and refresh */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {kpis.scope.divisionName || 'Company-wide'} Metrics
          </h3>
          <p className="text-sm text-slate-500">{kpis.timeframe.label}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium transition"
        >
          Refresh
        </button>
      </div>

      {/* Alerts banner */}
      {hasAlerts && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertIcon />
            <span className="text-amber-800 font-medium text-sm">Attention Required</span>
          </div>
          <div className="text-amber-700 text-sm mt-1 space-y-1">
            {kpis.alerts.highValuePending > 0 && (
              <div>{kpis.alerts.highValuePending} high-value POs pending approval ($25K+)</div>
            )}
            {kpis.alerts.approvalBottlenecks > 0 && (
              <div>{kpis.alerts.approvalBottlenecks} POs pending {'>'} 24 hours</div>
            )}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approval */}
        <Link
          href="/approvals"
          className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <p className="text-sm text-slate-500 mb-1">Pending Approval</p>
          <p className="text-2xl font-bold text-slate-900">{kpis.metrics.pendingCount}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-medium ${hasAlerts ? 'text-amber-600' : 'text-slate-500'}`}>
              ${(kpis.metrics.pendingAmount / 1000).toFixed(0)}k value
            </span>
            {hasAlerts && <AlertIcon />}
          </div>
        </Link>

        {/* Total POs */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Total POs</p>
          <p className="text-2xl font-bold text-slate-900">{kpis.metrics.totalCount}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon
              isPositive={pendingRate < 20}
              isNeutral={pendingRate >= 20 && pendingRate <= 30}
            />
            <span className={`text-xs font-medium ${
              pendingRate < 20 ? 'text-green-600' :
              pendingRate <= 30 ? 'text-slate-500' : 'text-red-600'
            }`}>
              {pendingRate.toFixed(0)}% pending
            </span>
          </div>
        </div>

        {/* Total Spend */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">{kpis.timeframe.label} Spend</p>
          <p className="text-2xl font-bold text-slate-900">
            ${kpis.metrics.totalSpend >= 1000000
              ? `${(kpis.metrics.totalSpend / 1000000).toFixed(1)}M`
              : `${(kpis.metrics.totalSpend / 1000).toFixed(0)}k`
            }
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Avg: ${avgPOValue.toLocaleString()}
          </p>
        </div>

        {/* Average PO Value */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">Avg PO Value</p>
          <p className="text-2xl font-bold text-slate-900">
            ${avgPOValue >= 10000
              ? `${(avgPOValue / 1000).toFixed(0)}k`
              : avgPOValue.toLocaleString()
            }
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon
              isPositive={avgPOValue > 5000}
              isNeutral={avgPOValue >= 1000 && avgPOValue <= 5000}
            />
            <span className={`text-xs font-medium ${
              avgPOValue > 5000 ? 'text-green-600' :
              avgPOValue >= 1000 ? 'text-slate-500' : 'text-orange-600'
            }`}>
              {kpis.metrics.totalCount > 0 ? 'Active' : 'No data'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      {Object.keys(kpis.status).length > 0 && (
        <div className="mt-4 bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">PO Status Breakdown</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(kpis.status).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  status === 'Draft' ? 'bg-gray-400' :
                  status === 'Submitted' ? 'bg-amber-400' :
                  status === 'Approved' ? 'bg-green-400' :
                  status === 'Issued' ? 'bg-blue-400' :
                  status === 'Received' ? 'bg-purple-400' :
                  'bg-slate-400'
                }`} />
                <span className="text-sm text-slate-600">
                  {status}: <span className="font-medium">{count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last updated */}
      <div className="mt-3 text-xs text-slate-400 text-right">
        Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}