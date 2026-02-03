'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

// Icons
interface IconProps {
  className?: string;
}

const ArrowLeftIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const DownloadIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m-6 7h12a2 2 0 002-2V9a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const RefreshIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CalendarIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FilterIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
  </svg>
);

const ChartIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AlertIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

interface POSummaryData {
  summary: {
    totalDivisions: number;
    grandTotalAmount: number;
    grandTotalPOCount: number;
    overallAveragePOSize: number;
    overallCompletionRate: number;
  };
  divisions: Array<{
    division: {
      id: string;
      name: string;
      code: string;
    };
    metrics: {
      totalPOCount: number;
      totalAmount: number;
      averagePOSize: number;
      averageProcessingTime: number;
      completionRate: number;
    };
    statusBreakdown: Record<string, { count: number; amount: number }>;
    monthlyTrend: Array<{
      month: string;
      year: number;
      totalAmount: number;
      poCount: number;
    }>;
    topVendors: Array<{
      vendorId: string;
      vendorName: string;
      totalAmount: number;
      poCount: number;
      averagePOSize: number;
    }>;
  }>;
  reportType: string;
  parameters: any;
  generatedAt: string;
  generatedBy: any;
}

function POSummaryReport() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [startDate, setStartDate] = useState(() => {
    const param = searchParams?.get('startDate');
    return param || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    const param = searchParams?.get('endDate');
    return param || new Date().toISOString().split('T')[0];
  });

  const [selectedDivision, setSelectedDivision] = useState(() => {
    return searchParams?.get('divisionId') || '';
  });

  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch divisions for filter
  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await fetch('/api/divisions');
      if (!response.ok) throw new Error('Failed to fetch divisions');
      return response.json();
    },
  });

  // Fetch report data
  const { data: reportData, isLoading, error, refetch } = useQuery<POSummaryData>({
    queryKey: ['po-summary-report', startDate, endDate, selectedDivision],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: 'json',
      });

      if (selectedDivision) {
        params.append('divisionId', selectedDivision);
      }

      const response = await fetch(`/api/reports/po-summary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false, // 5 minutes if auto-refresh enabled
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleExport = async (format: 'csv' | 'json') => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      format,
    });

    if (selectedDivision) {
      params.append('divisionId', selectedDivision);
    }

    window.open(`/api/reports/po-summary?${params}`, '_blank');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!session) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-600">Please sign in to view reports.</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href="/reports"
                  className="flex items-center space-x-2 text-slate-600 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeftIcon />
                  <span>Back to Reports</span>
                </Link>
                <div className="h-6 w-px bg-slate-300" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">PO Summary by Division</h1>
                  <p className="text-slate-600">Executive overview of purchasing activity and spending</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <RefreshIcon />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <DownloadIcon />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <FilterIcon className="mr-2" />
            Report Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Divisions</option>
                {divisions?.map((division: any) => (
                  <option key={division.id} value={division.id}>
                    {division.division_name} ({division.division_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Options</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Auto-refresh</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Generating report...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
            <div className="flex items-center text-red-600 mb-2">
              <AlertIcon className="mr-2" />
              <span className="font-semibold">Error Loading Report</span>
            </div>
            <p className="text-red-700 text-sm">
              {error instanceof Error ? error.message : 'Failed to load report data'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Report Data */}
        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Divisions</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {reportData.summary.totalDivisions}
                    </p>
                  </div>
                  <ChartIcon className="text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Spend</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.summary.grandTotalAmount)}
                    </p>
                  </div>
                  <ChartIcon className="text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total POs</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {reportData.summary.grandTotalPOCount.toLocaleString()}
                    </p>
                  </div>
                  <ChartIcon className="text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Avg PO Size</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.summary.overallAveragePOSize)}
                    </p>
                  </div>
                  <ChartIcon className="text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatPercent(reportData.summary.overallCompletionRate)}
                    </p>
                  </div>
                  <ChartIcon className="text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Division Details Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Division Breakdown</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Division
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        PO Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Avg PO Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Processing Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {reportData.divisions.map((division) => (
                      <tr key={division.division.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {division.division.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              Code: {division.division.code}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                          {formatCurrency(division.metrics.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {division.metrics.totalPOCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatCurrency(division.metrics.averagePOSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {division.metrics.averageProcessingTime.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-slate-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, division.metrics.completionRate)}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-900">
                              {formatPercent(division.metrics.completionRate)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Metadata */}
            <div className="mt-6 bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>
                  Generated on {new Date(reportData.generatedAt).toLocaleString()} by {reportData.generatedBy.userName}
                </span>
                <span>
                  Report ID: {reportData.reportType} | Role: {reportData.generatedBy.userRole}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams() compatibility with static export
export default function POSummaryReportWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <POSummaryReport />
    </Suspense>
  );
}