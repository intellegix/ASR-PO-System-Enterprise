'use client';

// Force dynamic rendering since this page makes API calls
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// Icons
interface IconProps {
  className?: string;
}

const ArrowLeftIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CalculatorIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const TrendingUpIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
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

const AlertTriangleIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.992-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

interface ProjectBudgetAnalysis {
  projectId: string;
  projectName: string;
  divisionName: string;
  originalBudget: number;
  revisedBudget: number;
  actualSpend: number;
  commitments: number;
  availableBudget: number;
  varianceAmount: number;
  variancePercentage: number;
  budgetUtilization: number;
  forecastToComplete: number;
  estimateAtCompletion: number;
  costPerformanceIndex: number;
  schedulePerformanceIndex: number;
  riskLevel: 'low' | 'medium' | 'high';
  alerts: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  timeline: {
    startDate: string;
    originalEndDate: string;
    revisedEndDate: string;
    percentComplete: number;
    daysRemaining: number;
  };
  recommendations: Array<{
    priority: string;
    action: string;
    impact: string;
  }>;
}

interface BudgetAnalysisData {
  summary: {
    totalProjects: number;
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
    projectsOverBudget: number;
    projectsAtRisk: number;
    averageCPI: number;
    averageSPI: number;
  };
  projects: ProjectBudgetAnalysis[];
  divisionSummary: Array<{
    divisionName: string;
    totalBudget: number;
    totalActual: number;
    variance: number;
    variancePercentage: number;
    projectCount: number;
    averageCPI: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    budgetSpend: number;
    actualSpend: number;
    variance: number;
    cumulativeVariance: number;
  }>;
  forecastAnalysis: {
    projectedOverrun: number;
    confidenceLevel: number;
    keyRisks: Array<{
      risk: string;
      impact: number;
      mitigation: string;
    }>;
  };
}

export default function BudgetVsActualPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<BudgetAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0],
    divisionId: '',
    projectId: '',
    riskLevel: '',
    varianceThreshold: '',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const userRole = user?.role || 'OPERATIONS_MANAGER';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
      if (filters.varianceThreshold) params.set('varianceThreshold', filters.varianceThreshold);

      const response = await fetch(`/api/reports/budget-vs-actual?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch budget analysis data:', err);
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
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
      if (filters.varianceThreshold) params.set('varianceThreshold', filters.varianceThreshold);
      params.set('format', 'pdf');

      const response = await fetch(`/api/reports/budget-vs-actual?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-analysis-${filters.startDate}-to-${filters.endDate}.pdf`;
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
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
      if (filters.varianceThreshold) params.set('varianceThreshold', filters.varianceThreshold);
      params.set('format', 'excel');

      const response = await fetch(`/api/reports/budget-vs-actual?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budget-analysis-${filters.startDate}-to-${filters.endDate}.xlsx`;
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

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default: return <AlertTriangleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <CalculatorIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600">Please sign in to view budget analysis reports.</p>
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
                  <CalculatorIcon className="w-6 h-6 text-orange-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Budget vs Actual Analysis</h1>
                    <p className="text-slate-600">Project budget variance and forecasting</p>
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
                  <RefreshIcon className={loading ? 'w-5 h-5 animate-spin' : 'w-5 h-5'} />
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Risk Levels</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Variance Threshold</label>
              <select
                value={filters.varianceThreshold}
                onChange={(e) => setFilters(prev => ({ ...prev, varianceThreshold: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Any Variance</option>
                <option value="5">Over 5%</option>
                <option value="10">Over 10%</option>
                <option value="15">Over 15%</option>
                <option value="20">Over 20%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Export Options</h3>
              <p className="text-sm text-slate-600">Download budget analysis in various formats</p>
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
            <p className="text-slate-600">Loading budget analysis data...</p>
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
                    <p className="text-sm font-medium text-slate-600">Total Budget</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.summary.totalBudget)}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CalculatorIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Actual Spend</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.summary.totalActual)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Variance</p>
                    <p className={`text-2xl font-bold ${getVarianceColor(data.summary.totalVariance)}`}>
                      {formatCurrency(Math.abs(data.summary.totalVariance))}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.summary.totalVariance > 0 ? 'Over budget' : 'Under budget'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${data.summary.totalVariance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    {data.summary.totalVariance > 0 ?
                      <TrendingUpIcon className="w-6 h-6 text-red-600" /> :
                      <TrendingDownIcon className="w-6 h-6 text-green-600" />
                    }
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Projects at Risk</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.projectsAtRisk}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      of {data.summary.totalProjects} total
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Indices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost Performance Index (CPI)</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-slate-900">{data.summary.averageCPI.toFixed(2)}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {data.summary.averageCPI >= 1.0 ? 'Under budget' : 'Over budget'}
                    </p>
                  </div>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    data.summary.averageCPI >= 1.0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-2xl font-bold ${
                      data.summary.averageCPI >= 1.0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {data.summary.averageCPI >= 1.0 ? '✓' : '!'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  CPI {'>'}= 1.0 indicates project is under budget
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Schedule Performance Index (SPI)</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-slate-900">{data.summary.averageSPI.toFixed(2)}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {data.summary.averageSPI >= 1.0 ? 'Ahead of schedule' : 'Behind schedule'}
                    </p>
                  </div>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    data.summary.averageSPI >= 1.0 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <span className={`text-2xl font-bold ${
                      data.summary.averageSPI >= 1.0 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {data.summary.averageSPI >= 1.0 ? '✓' : '⚠'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  SPI {'>'}= 1.0 indicates project is ahead of schedule
                </div>
              </div>
            </div>

            {/* Project Details Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Project Budget Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Budget
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        CPI / SPI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Completion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.projects.slice(0, 10).map((project) => (
                      <tr key={project.projectId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{project.projectName}</p>
                            <p className="text-xs text-slate-500">{project.divisionName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatCurrency(project.revisedBudget)}</div>
                          {project.originalBudget !== project.revisedBudget && (
                            <div className="text-xs text-slate-500">
                              Original: {formatCurrency(project.originalBudget)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatCurrency(project.actualSpend)}</div>
                          <div className="text-xs text-slate-500">
                            Util: {formatPercentage(project.budgetUtilization)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getVarianceColor(project.variancePercentage)}`}>
                            {formatCurrency(Math.abs(project.varianceAmount))}
                          </div>
                          <div className={`text-xs ${getVarianceColor(project.variancePercentage)}`}>
                            {formatPercentage(Math.abs(project.variancePercentage))}
                            {project.variancePercentage > 0 ? ' over' : ' under'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            CPI: {project.costPerformanceIndex.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            SPI: {project.schedulePerformanceIndex.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">
                            {formatPercentage(project.timeline.percentComplete)}
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.timeline.percentComplete}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(project.riskLevel)}`}>
                            {project.riskLevel.charAt(0).toUpperCase() + project.riskLevel.slice(1)} Risk
                          </span>
                          {project.alerts.length > 0 && (
                            <div className="mt-1">
                              {project.alerts.slice(0, 1).map((alert, index) => (
                                <div key={index} className="flex items-center space-x-1">
                                  {getAlertIcon(alert.severity)}
                                  <span className="text-xs text-slate-600 truncate">{alert.type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Division Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Division Performance</h3>
                <div className="space-y-4">
                  {data.divisionSummary.map((division, index) => (
                    <div key={index} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-slate-900">{division.divisionName}</h4>
                          <p className="text-sm text-slate-500">{division.projectCount} projects</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(division.totalActual)}</p>
                          <p className="text-sm text-slate-600">of {formatCurrency(division.totalBudget)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${getVarianceColor(division.variancePercentage)}`}>
                          Variance: {formatCurrency(Math.abs(division.variance))} ({formatPercentage(Math.abs(division.variancePercentage))})
                        </span>
                        <span className="text-sm text-slate-600">
                          CPI: {division.averageCPI.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            division.variance > 0 ? 'bg-red-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(100, (division.totalActual / division.totalBudget) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Forecast Analysis</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <h4 className="font-medium text-red-900">Projected Overrun</h4>
                      <p className="text-sm text-red-600">Based on current trends</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-900">
                        {formatCurrency(data.forecastAnalysis.projectedOverrun)}
                      </p>
                      <p className="text-sm text-red-600">
                        {data.forecastAnalysis.confidenceLevel}% confidence
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-slate-900 mb-3">Key Risks</h4>
                    <div className="space-y-2">
                      {data.forecastAnalysis.keyRisks.slice(0, 3).map((risk, index) => (
                        <div key={index} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-900">{risk.risk}</p>
                              <p className="text-xs text-yellow-700 mt-1">{risk.mitigation}</p>
                            </div>
                            <span className="text-sm font-semibold text-yellow-900 ml-2">
                              {formatCurrency(risk.impact)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Monthly Variance Trends</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Budget Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actual Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Monthly Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Cumulative Variance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.monthlyTrends.map((trend, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {trend.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatCurrency(trend.budgetSpend)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatCurrency(trend.actualSpend)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getVarianceColor(trend.variance)}`}>
                            {formatCurrency(Math.abs(trend.variance))}
                            {trend.variance > 0 ? ' over' : ' under'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getVarianceColor(trend.cumulativeVariance)}`}>
                            {formatCurrency(Math.abs(trend.cumulativeVariance))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}