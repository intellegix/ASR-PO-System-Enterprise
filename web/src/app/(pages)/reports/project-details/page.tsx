'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const FolderOpenIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

interface DivisionSpend {
  divisionId: string;
  divisionName: string;
  totalSpend: number;
  budgetAllocated: number;
  varianceAmount: number;
  variancePercentage: number;
  poCount: number;
  averagePOValue: number;
  topVendors: Array<{
    vendorName: string;
    amount: number;
    poCount: number;
  }>;
  workOrders: Array<{
    workOrderNumber: string;
    description: string;
    amount: number;
    status: string;
  }>;
}

interface ProjectSpendingPattern {
  month: string;
  budgetedSpend: number;
  actualSpend: number;
  variance: number;
  posCreated: number;
  posCompleted: number;
  averageProcessingTime: number;
}

interface WorkOrderCorrelation {
  workOrderNumber: string;
  description: string;
  projectPhase: string;
  totalBudget: number;
  actualSpend: number;
  relatedPOs: number;
  completionPercentage: number;
  schedule: {
    plannedStart: string;
    plannedEnd: string;
    actualStart: string;
    estimatedEnd: string;
  };
  divisions: Array<{
    divisionName: string;
    spend: number;
    percentage: number;
  }>;
}

interface ProjectDetailsData {
  projectInfo: {
    projectId: string;
    projectName: string;
    description: string;
    projectManager: string;
    status: string;
    totalBudget: number;
    actualSpend: number;
    forecastToComplete: number;
    varianceAmount: number;
    variancePercentage: number;
    timeline: {
      startDate: string;
      plannedEndDate: string;
      revisedEndDate: string;
      percentComplete: number;
    };
    riskLevel: 'low' | 'medium' | 'high';
    lastUpdated: string;
  };
  divisionSpending: DivisionSpend[];
  spendingPatterns: ProjectSpendingPattern[];
  workOrderCorrelations: WorkOrderCorrelation[];
  keyMetrics: {
    costVariance: number;
    scheduleVariance: number;
    costPerformanceIndex: number;
    schedulePerformanceIndex: number;
    estimateAtCompletion: number;
    varianceAtCompletion: number;
    budgetEfficiency: number;
    spendVelocity: number;
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    date: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    impact: string;
    actionItems: string[];
  }>;
}

export default function ProjectDetailsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ProjectDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0],
    projectId: '',
    divisionId: '',
    workOrderFilter: '',
    includeCompleted: 'true',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
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
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.workOrderFilter) params.set('workOrderFilter', filters.workOrderFilter);
      if (filters.includeCompleted) params.set('includeCompleted', filters.includeCompleted);

      const response = await fetch(`/api/reports/project-details?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch project details data:', err);
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
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.workOrderFilter) params.set('workOrderFilter', filters.workOrderFilter);
      if (filters.includeCompleted) params.set('includeCompleted', filters.includeCompleted);
      params.set('format', 'pdf');

      const response = await fetch(`/api/reports/project-details?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-details-${filters.startDate}-to-${filters.endDate}.pdf`;
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
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.workOrderFilter) params.set('workOrderFilter', filters.workOrderFilter);
      if (filters.includeCompleted) params.set('includeCompleted', filters.includeCompleted);
      params.set('format', 'excel');

      const response = await fetch(`/api/reports/project-details?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-details-${filters.startDate}-to-${filters.endDate}.xlsx`;
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
      const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600'; // Over budget
    if (variance < -5) return 'text-green-600'; // Under budget
    return 'text-slate-600'; // On budget
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'on hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getPerformanceIndicator = (value: number, threshold: number = 1.0) => {
    if (value >= threshold) return { color: 'text-green-600', trend: 'positive' };
    if (value >= threshold * 0.9) return { color: 'text-yellow-600', trend: 'neutral' };
    return { color: 'text-red-600', trend: 'negative' };
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FolderOpenIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600">Please sign in to view project detail reports.</p>
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
                  <FolderOpenIcon className="text-orange-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Project Details Analysis</h1>
                    <p className="text-slate-600">Cross-divisional project spending and performance</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Project</label>
              <select
                value={filters.projectId}
                onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Projects</option>
                {/* Project options would be populated from API */}
              </select>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Work Order</label>
              <input
                type="text"
                placeholder="WO number or description"
                value={filters.workOrderFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, workOrderFilter: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Include Completed</label>
              <select
                value={filters.includeCompleted}
                onChange={(e) => setFilters(prev => ({ ...prev, includeCompleted: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Export Options</h3>
              <p className="text-sm text-slate-600">Download project analysis in various formats</p>
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
            <p className="text-slate-600">Loading project details data...</p>
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
            {/* Project Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{data.projectInfo.projectName}</h2>
                  <p className="text-slate-600">{data.projectInfo.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                    <span>PM: {data.projectInfo.projectManager}</span>
                    <span>•</span>
                    <span>Updated: {new Date(data.projectInfo.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(data.projectInfo.status)}`}>
                    {data.projectInfo.status}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskBadgeColor(data.projectInfo.riskLevel)}`}>
                    {data.projectInfo.riskLevel.charAt(0).toUpperCase() + data.projectInfo.riskLevel.slice(1)} Risk
                  </span>
                </div>
              </div>

              {/* Project Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Budget</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(data.projectInfo.totalBudget)}</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Actual Spend</p>
                      <p className="text-xl font-bold text-slate-900">{formatCurrency(data.projectInfo.actualSpend)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatPercentage((data.projectInfo.actualSpend / data.projectInfo.totalBudget) * 100)} of budget
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Variance</p>
                      <p className={`text-xl font-bold ${getVarianceColor(data.projectInfo.variancePercentage)}`}>
                        {formatCurrency(Math.abs(data.projectInfo.varianceAmount))}
                      </p>
                      <p className={`text-xs mt-1 ${getVarianceColor(data.projectInfo.variancePercentage)}`}>
                        {formatPercentage(Math.abs(data.projectInfo.variancePercentage))}
                        {data.projectInfo.variancePercentage > 0 ? ' over' : ' under'}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${data.projectInfo.varianceAmount > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {data.projectInfo.varianceAmount > 0 ?
                        <TrendingUpIcon className="text-red-600" /> :
                        <TrendingDownIcon className="text-green-600" />
                      }
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Progress</p>
                      <p className="text-xl font-bold text-slate-900">
                        {formatPercentage(data.projectInfo.timeline.percentComplete)}
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${data.projectInfo.timeline.percentComplete}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CalendarIcon className="text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Start Date:</span>
                  <span className="font-medium ml-2">{new Date(data.projectInfo.timeline.startDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Planned End:</span>
                  <span className="font-medium ml-2">{new Date(data.projectInfo.timeline.plannedEndDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">Revised End:</span>
                  <span className="font-medium ml-2">{new Date(data.projectInfo.timeline.revisedEndDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Key Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Key Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className={`text-2xl font-bold ${getPerformanceIndicator(data.keyMetrics.costPerformanceIndex).color}`}>
                      {data.keyMetrics.costPerformanceIndex.toFixed(2)}
                    </span>
                    <div className={`ml-2 ${getPerformanceIndicator(data.keyMetrics.costPerformanceIndex).color}`}>
                      {data.keyMetrics.costPerformanceIndex >= 1.0 ?
                        <TrendingUpIcon className="w-5 h-5" /> :
                        <TrendingDownIcon className="w-5 h-5" />
                      }
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600">Cost Performance Index</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.keyMetrics.costPerformanceIndex >= 1.0 ? 'Under budget' : 'Over budget'}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className={`text-2xl font-bold ${getPerformanceIndicator(data.keyMetrics.schedulePerformanceIndex).color}`}>
                      {data.keyMetrics.schedulePerformanceIndex.toFixed(2)}
                    </span>
                    <div className={`ml-2 ${getPerformanceIndicator(data.keyMetrics.schedulePerformanceIndex).color}`}>
                      {data.keyMetrics.schedulePerformanceIndex >= 1.0 ?
                        <TrendingUpIcon className="w-5 h-5" /> :
                        <TrendingDownIcon className="w-5 h-5" />
                      }
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-600">Schedule Performance Index</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.keyMetrics.schedulePerformanceIndex >= 1.0 ? 'Ahead of schedule' : 'Behind schedule'}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {formatCurrency(data.keyMetrics.estimateAtCompletion)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600">Estimate at Completion</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Forecasted final cost
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className={`text-2xl font-bold ${getVarianceColor(data.keyMetrics.varianceAtCompletion)}`}>
                      {formatCurrency(Math.abs(data.keyMetrics.varianceAtCompletion))}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-600">Variance at Completion</p>
                  <p className={`text-xs mt-1 ${getVarianceColor(data.keyMetrics.varianceAtCompletion)}`}>
                    {data.keyMetrics.varianceAtCompletion > 0 ? 'Over budget' : 'Under budget'}
                  </p>
                </div>
              </div>
            </div>

            {/* Division Spending Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Division Spending Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Division
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Budget Allocated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        PO Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Top Vendor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.divisionSpending.map((division) => (
                      <tr key={division.divisionId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{division.divisionName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatCurrency(division.budgetAllocated)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatCurrency(division.totalSpend)}</div>
                          <div className="text-xs text-slate-500">
                            {formatPercentage((division.totalSpend / division.budgetAllocated) * 100)} utilized
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getVarianceColor(division.variancePercentage)}`}>
                            {formatCurrency(Math.abs(division.varianceAmount))}
                          </div>
                          <div className={`text-xs ${getVarianceColor(division.variancePercentage)}`}>
                            {formatPercentage(Math.abs(division.variancePercentage))}
                            {division.variancePercentage > 0 ? ' over' : ' under'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{division.poCount} POs</div>
                          <div className="text-xs text-slate-500">
                            Avg: {formatCurrency(division.averagePOValue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {division.topVendors[0] && (
                            <div>
                              <div className="text-sm text-slate-900">{division.topVendors[0].vendorName}</div>
                              <div className="text-xs text-slate-500">
                                {formatCurrency(division.topVendors[0].amount)} ({division.topVendors[0].poCount} POs)
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Work Order Correlations */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Work Order Analysis</h3>
              <div className="space-y-6">
                {data.workOrderCorrelations.slice(0, 5).map((workOrder, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-slate-900">{workOrder.workOrderNumber}</h4>
                        <p className="text-sm text-slate-600">{workOrder.description}</p>
                        <p className="text-xs text-slate-500 mt-1">Phase: {workOrder.projectPhase}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {formatCurrency(workOrder.actualSpend)} / {formatCurrency(workOrder.totalBudget)}
                        </p>
                        <p className="text-xs text-slate-500">{workOrder.relatedPOs} related POs</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600">Completion Progress</span>
                        <span className="font-medium">{formatPercentage(workOrder.completionPercentage)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${workOrder.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Planned Start:</span>
                        <div className="font-medium">{new Date(workOrder.schedule.plannedStart).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Actual Start:</span>
                        <div className="font-medium">{new Date(workOrder.schedule.actualStart).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Planned End:</span>
                        <div className="font-medium">{new Date(workOrder.schedule.plannedEnd).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Estimated End:</span>
                        <div className="font-medium">{new Date(workOrder.schedule.estimatedEnd).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {workOrder.divisions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Division Breakdown:</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {workOrder.divisions.map((div, divIndex) => (
                            <div key={divIndex} className="flex justify-between items-center text-xs bg-slate-50 rounded p-2">
                              <span className="text-slate-600">{div.divisionName}</span>
                              <div className="text-right">
                                <div className="font-medium text-slate-900">{formatCurrency(div.spend)}</div>
                                <div className="text-slate-500">{formatPercentage(div.percentage)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alerts */}
              {data.alerts.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Project Alerts</h3>
                  <div className="space-y-3">
                    {data.alerts.slice(0, 5).map((alert, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-900">{alert.type}</h4>
                          <span className="text-xs text-slate-500">{new Date(alert.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Recommendations</h3>
                <div className="space-y-4">
                  {data.recommendations.slice(0, 4).map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                      rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{rec.category}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{rec.recommendation}</p>
                      <p className="text-xs text-slate-600 mb-2">
                        <strong>Impact:</strong> {rec.impact}
                      </p>
                      {rec.actionItems.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-700 mb-1">Action Items:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {rec.actionItems.slice(0, 3).map((item, itemIndex) => (
                              <li key={itemIndex}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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