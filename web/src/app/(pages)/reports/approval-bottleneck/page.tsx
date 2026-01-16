'use client';

// Force dynamic rendering since this page makes API calls
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Icons
interface IconProps {
  className?: string;
}

const ArrowLeftIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ClockIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserGroupIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const AlertTriangleIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.992-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const DownloadIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const RefreshIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface ApprovalBottleneck {
  poId: string;
  poNumber: string;
  vendorName: string;
  totalAmount: number;
  divisionName: string;
  currentStage: string;
  pendingSince: string;
  daysInStage: number;
  totalDaysPending: number;
  approverName: string;
  approverEmail: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  bottleneckReason: string;
  escalationLevel: number;
  lastContactDate: string | null;
  estimatedResolutionDate: string;
  impactScore: number;
}

interface ApproverPerformance {
  approverId: string;
  approverName: string;
  approverEmail: string;
  role: string;
  divisionName: string;
  totalPendingPOs: number;
  averageApprovalTime: number;
  longestPendingDays: number;
  performanceScore: number;
  bottleneckFrequency: number;
  workload: 'light' | 'moderate' | 'heavy' | 'overloaded';
  recommendations: string[];
}

interface WorkflowStageAnalysis {
  stage: string;
  averageTime: number;
  medianTime: number;
  maxTime: number;
  posInStage: number;
  completionRate: number;
  bottleneckFrequency: number;
  efficiency: 'excellent' | 'good' | 'poor' | 'critical';
  recommendations: string[];
}

interface ApprovalBottleneckData {
  summary: {
    totalBottlenecks: number;
    averageApprovalTime: number;
    posOver24Hours: number;
    posOver48Hours: number;
    posOver7Days: number;
    totalValueStuck: number;
    averageImpactScore: number;
    criticalBottlenecks: number;
  };
  bottlenecks: ApprovalBottleneck[];
  approverPerformance: ApproverPerformance[];
  stageAnalysis: WorkflowStageAnalysis[];
  trends: {
    dailyBottlenecks: Array<{
      date: string;
      count: number;
      value: number;
      averageTime: number;
    }>;
    weeklyCompletion: Array<{
      week: string;
      submitted: number;
      approved: number;
      backlog: number;
    }>;
  };
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export default function ApprovalBottleneckPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ApprovalBottleneckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0],
    divisionId: '',
    approverId: '',
    minDays: '',
    minAmount: '',
    priority: '',
    stage: '',
  });
  const [autoRefresh, setAutoRefresh] = useState(true); // Auto-refresh for real-time data
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const user = session?.user;
  const userRole = user?.role || 'OPERATIONS_MANAGER';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.approverId) params.set('approverId', filters.approverId);
      if (filters.minDays) params.set('minDays', filters.minDays);
      if (filters.minAmount) params.set('minAmount', filters.minAmount);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.stage) params.set('stage', filters.stage);

      const response = await fetch(`/api/reports/approval-bottleneck?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch approval bottleneck data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.approverId) params.set('approverId', filters.approverId);
      if (filters.minDays) params.set('minDays', filters.minDays);
      if (filters.minAmount) params.set('minAmount', filters.minAmount);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.stage) params.set('stage', filters.stage);
      params.set('format', 'pdf');

      const response = await fetch(`/api/reports/approval-bottleneck?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approval-bottleneck-${filters.startDate}-to-${filters.endDate}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed');
    }
  };

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.approverId) params.set('approverId', filters.approverId);
      if (filters.minDays) params.set('minDays', filters.minDays);
      if (filters.minAmount) params.set('minAmount', filters.minAmount);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.stage) params.set('stage', filters.stage);
      params.set('format', 'excel');

      const response = await fetch(`/api/reports/approval-bottleneck?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approval-bottleneck-${filters.startDate}-to-${filters.endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed');
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 2 * 60 * 1000); // 2 minutes for real-time updates
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDays = (days: number) => {
    if (days < 1) return `${(days * 24).toFixed(1)}h`;
    if (days === 1) return '1 day';
    return `${Math.floor(days)} days`;
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'overloaded': return 'text-red-600';
      case 'heavy': return 'text-orange-600';
      case 'moderate': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'critical': return 'text-red-600';
      case 'poor': return 'text-orange-600';
      case 'good': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getPerformanceScore = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-600' };
    if (score >= 80) return { text: 'Good', color: 'text-yellow-600' };
    if (score >= 70) return { text: 'Fair', color: 'text-orange-600' };
    return { text: 'Poor', color: 'text-red-600' };
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600">Please sign in to view approval bottleneck reports.</p>
        </div>
      </div>
    );
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
                <div className="flex items-center space-x-3">
                  <ClockIcon className="text-orange-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Approval Bottleneck Analysis</h1>
                    <p className="text-slate-600">Workflow efficiency and approval delays</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-slate-500">Last updated: {lastRefresh.toLocaleTimeString()}</p>
                  <p className="text-xs text-slate-400">Welcome, {user?.name?.split(' ')[0]}</p>
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-slate-600">Auto-refresh</span>
                </label>

                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshIcon className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Division</label>
              <select
                value={filters.divisionId}
                onChange={(e) => setFilters(prev => ({ ...prev, divisionId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Divisions</option>
                {/* Division options would be populated from API */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Approver</label>
              <select
                value={filters.approverId}
                onChange={(e) => setFilters(prev => ({ ...prev, approverId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Approvers</option>
                {/* Approver options would be populated from API */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Min Days</label>
              <select
                value={filters.minDays}
                onChange={(e) => setFilters(prev => ({ ...prev, minDays: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Any Time</option>
                <option value="1">1+ days</option>
                <option value="2">2+ days</option>
                <option value="7">7+ days</option>
                <option value="14">14+ days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Min Amount</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Stage</label>
              <select
                value={filters.stage}
                onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Stages</option>
                <option value="Division Leader Review">Division Leader Review</option>
                <option value="Accounting Review">Accounting Review</option>
                <option value="Final Approval">Final Approval</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Export Options</h3>
              <p className="text-sm text-slate-600">Download approval bottleneck analysis in various formats</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToExcel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <DownloadIcon />
                <span>Excel</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <DownloadIcon />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading approval bottleneck data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-red-900">Error loading data</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Bottlenecks</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.totalBottlenecks}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.summary.criticalBottlenecks} critical
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangleIcon className="text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Avg Approval Time</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatDays(data.summary.averageApprovalTime)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ClockIcon className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">POs Over 48hrs</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.posOver48Hours}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.summary.posOver7Days} over 7 days
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.992-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Value Stuck</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(data.summary.totalValueStuck)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Bottlenecks Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Current Approval Bottlenecks</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        PO Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Current Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Days Pending
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Approver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Bottleneck Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.bottlenecks.slice(0, 10).map((bottleneck) => (
                      <tr key={bottleneck.poId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{bottleneck.poNumber}</p>
                            <p className="text-xs text-slate-500">{bottleneck.vendorName}</p>
                            <p className="text-xs text-slate-400">{bottleneck.divisionName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatCurrency(bottleneck.totalAmount)}</div>
                          <div className="text-xs text-slate-500">
                            Impact: {bottleneck.impactScore}/100
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{bottleneck.currentStage}</div>
                          <div className="text-xs text-slate-500">
                            Since: {new Date(bottleneck.pendingSince).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {formatDays(bottleneck.totalDaysPending)}
                          </div>
                          <div className="text-xs text-slate-500">
                            In stage: {formatDays(bottleneck.daysInStage)}
                          </div>
                          {bottleneck.escalationLevel > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              Escalation Level {bottleneck.escalationLevel}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{bottleneck.approverName}</div>
                          <div className="text-xs text-slate-500">{bottleneck.approverEmail}</div>
                          {bottleneck.lastContactDate && (
                            <div className="text-xs text-slate-400 mt-1">
                              Last contact: {new Date(bottleneck.lastContactDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeColor(bottleneck.priority)}`}>
                            {bottleneck.priority.charAt(0).toUpperCase() + bottleneck.priority.slice(1)}
                          </span>
                          <div className="text-xs text-slate-500 mt-1">
                            ETA: {new Date(bottleneck.estimatedResolutionDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900 max-w-xs truncate">
                            {bottleneck.bottleneckReason}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approver Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Approver Performance Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Approver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Pending POs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Avg Approval Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Longest Pending
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Performance Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Workload
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Recommendations
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.approverPerformance.slice(0, 8).map((approver) => {
                      const performance = getPerformanceScore(approver.performanceScore);
                      return (
                        <tr key={approver.approverId} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{approver.approverName}</p>
                              <p className="text-xs text-slate-500">{approver.role}</p>
                              <p className="text-xs text-slate-400">{approver.divisionName}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">
                              {approver.totalPendingPOs}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {formatDays(approver.averageApprovalTime)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${approver.longestPendingDays > 7 ? 'text-red-600' : 'text-slate-900'}`}>
                              {formatDays(approver.longestPendingDays)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${performance.color}`}>
                                {approver.performanceScore}
                              </span>
                              <span className={`text-xs ${performance.color}`}>
                                {performance.text}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${getWorkloadColor(approver.workload)}`}>
                              {approver.workload.charAt(0).toUpperCase() + approver.workload.slice(1)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Bottlenecks: {approver.bottleneckFrequency}%
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              {approver.recommendations.slice(0, 2).map((rec, index) => (
                                <div key={index} className="text-xs text-slate-600 mb-1">
                                  • {rec}
                                </div>
                              ))}
                              {approver.recommendations.length > 2 && (
                                <div className="text-xs text-slate-400">
                                  +{approver.recommendations.length - 2} more
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Stage Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Workflow Stage Analysis</h3>
                <div className="space-y-4">
                  {data.stageAnalysis.map((stage, index) => (
                    <div key={index} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-slate-900">{stage.stage}</h4>
                          <p className="text-sm text-slate-500">{stage.posInStage} POs currently</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getEfficiencyColor(stage.efficiency)}`}>
                            {stage.efficiency.charAt(0).toUpperCase() + stage.efficiency.slice(1)}
                          </p>
                          <p className="text-sm text-slate-600">{stage.completionRate}% completion</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Avg:</span>
                          <span className="font-medium ml-2">{formatDays(stage.averageTime)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Median:</span>
                          <span className="font-medium ml-2">{formatDays(stage.medianTime)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Max:</span>
                          <span className="font-medium ml-2">{formatDays(stage.maxTime)}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-slate-500 mb-1">
                          Bottleneck Frequency: {stage.bottleneckFrequency}%
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              stage.bottleneckFrequency > 30 ? 'bg-red-600' :
                              stage.bottleneckFrequency > 15 ? 'bg-yellow-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${stage.bottleneckFrequency}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Process Improvement Recommendations</h3>
                <div className="space-y-4">
                  {data.recommendations.slice(0, 6).map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                      rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{rec.category}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            rec.effort === 'high' ? 'bg-slate-100 text-slate-800' :
                            rec.effort === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {rec.effort} effort
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{rec.action}</p>
                      <p className="text-xs text-slate-600">
                        <strong>Expected Impact:</strong> {rec.expectedImpact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}