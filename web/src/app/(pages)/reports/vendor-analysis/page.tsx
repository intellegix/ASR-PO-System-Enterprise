'use client';

// Force dynamic rendering since this page makes API calls
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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

const TruckIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const StarIcon = ({ filled = false, className = 'w-4 h-4' }: { filled?: boolean; className?: string }) => (
  <svg className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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

interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  totalOrders: number;
  averageOrderValue: number;
  qualityScore: number;
  onTimeDeliveryRate: number;
  completionRate: number;
  paymentTerms: string;
  w9OnFile: boolean;
  industryType: string;
  riskFactors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  monthlyTrend: Array<{
    month: string;
    spend: number;
    orders: number;
    qualityScore: number;
  }>;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
}

interface VendorAnalysisData {
  summary: {
    totalVendors: number;
    totalSpend: number;
    averageQualityScore: number;
    topPerformers: number;
    riskVendors: number;
  };
  vendors: VendorPerformance[];
  industryBreakdown: Array<{
    industry: string;
    vendorCount: number;
    totalSpend: number;
    averageQualityScore: number;
  }>;
  paymentTermsAnalysis: Array<{
    terms: string;
    vendorCount: number;
    totalSpend: number;
    averageOrderValue: number;
  }>;
  riskAnalysis: {
    concentrationRisk: {
      topVendorPercentage: number;
      top5VendorPercentage: number;
      recommendation: string;
    };
    complianceRisk: {
      missingW9: number;
      outdatedInfo: number;
      recommendation: string;
    };
  };
}

export default function VendorAnalysisPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<VendorAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0],
    divisionId: '',
    industryFilter: '',
    minSpend: '',
    qualityThreshold: '',
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
      if (filters.industryFilter) params.set('industryFilter', filters.industryFilter);
      if (filters.minSpend) params.set('minSpend', filters.minSpend);
      if (filters.qualityThreshold) params.set('qualityThreshold', filters.qualityThreshold);

      const response = await fetch(`/api/reports/vendor-analysis?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch vendor analysis data:', err);
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
      if (filters.industryFilter) params.set('industryFilter', filters.industryFilter);
      if (filters.minSpend) params.set('minSpend', filters.minSpend);
      if (filters.qualityThreshold) params.set('qualityThreshold', filters.qualityThreshold);
      params.set('format', 'pdf');

      const response = await fetch(`/api/reports/vendor-analysis?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendor-analysis-${filters.startDate}-to-${filters.endDate}.pdf`;
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
      if (filters.industryFilter) params.set('industryFilter', filters.industryFilter);
      if (filters.minSpend) params.set('minSpend', filters.minSpend);
      if (filters.qualityThreshold) params.set('qualityThreshold', filters.qualityThreshold);
      params.set('format', 'excel');

      const response = await fetch(`/api/reports/vendor-analysis?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendor-analysis-${filters.startDate}-to-${filters.endDate}.xlsx`;
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

  const getQualityBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const renderStarRating = (score: number) => {
    const stars = Math.round(score / 20); // Convert 0-100 to 0-5 stars
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIcon
            key={star}
            filled={star <= stars}
            className={star <= stars ? 'text-yellow-400' : 'text-slate-300'}
          />
        ))}
        <span className="text-sm text-slate-600 ml-2">({score})</span>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <TruckIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600">Please sign in to view vendor analysis reports.</p>
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
                  <TruckIcon className="text-orange-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendor Analysis</h1>
                    <p className="text-slate-600">Performance evaluation and risk assessment</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
              <select
                value={filters.industryFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, industryFilter: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Industries</option>
                <option value="Construction">Construction</option>
                <option value="Materials">Materials</option>
                <option value="Equipment">Equipment</option>
                <option value="Services">Services</option>
                <option value="Technology">Technology</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Min Spend</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minSpend}
                onChange={(e) => setFilters(prev => ({ ...prev, minSpend: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Min Quality Score</label>
              <select
                value={filters.qualityThreshold}
                onChange={(e) => setFilters(prev => ({ ...prev, qualityThreshold: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Any Score</option>
                <option value="85">Excellent (85+)</option>
                <option value="70">Good (70+)</option>
                <option value="50">Fair (50+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Export Options</h3>
              <p className="text-sm text-slate-600">Download vendor analysis in various formats</p>
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
            <p className="text-slate-600">Loading vendor analysis data...</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Vendors</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.totalVendors}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TruckIcon className="text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Spend</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.summary.totalSpend)}</p>
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
                    <p className="text-sm font-medium text-slate-600">Avg Quality Score</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.averageQualityScore}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <StarIcon filled className="text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Top Performers</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.topPerformers}</p>
                    <p className="text-xs text-slate-500 mt-1">Score 85+</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Risk Vendors</p>
                    <p className="text-2xl font-bold text-slate-900">{data.summary.riskVendors}</p>
                    <p className="text-xs text-slate-500 mt-1">Need attention</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.992-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Performance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Vendor Performance Rankings</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total Spend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Quality Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        On-Time Delivery
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Payment Terms
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Risk Factors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.vendors.slice(0, 10).map((vendor) => (
                      <tr key={vendor.vendorId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{vendor.vendorName}</p>
                            <p className="text-xs text-slate-500">{vendor.industryType}</p>
                            {vendor.w9OnFile && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                W9 Filed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatCurrency(vendor.totalSpend)}</div>
                          <div className="text-xs text-slate-500">
                            Avg: {formatCurrency(vendor.averageOrderValue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {vendor.totalOrders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            {renderStarRating(vendor.qualityScore)}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getQualityBadgeColor(vendor.qualityScore)}`}>
                              {vendor.qualityScore >= 85 ? 'Excellent' : vendor.qualityScore >= 70 ? 'Good' : 'Needs Improvement'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatPercentage(vendor.onTimeDeliveryRate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-900">{vendor.paymentTerms}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            {vendor.riskFactors.slice(0, 2).map((risk, index) => (
                              <span
                                key={index}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRiskBadgeColor(risk.severity)}`}
                              >
                                {risk.type}
                              </span>
                            ))}
                            {vendor.riskFactors.length > 2 && (
                              <span className="text-xs text-slate-500">
                                +{vendor.riskFactors.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Industry Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Industry Breakdown</h3>
                <div className="space-y-4">
                  {data.industryBreakdown.map((industry, index) => (
                    <div key={index} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-slate-900">{industry.industry}</h4>
                          <p className="text-sm text-slate-500">{industry.vendorCount} vendors</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(industry.totalSpend)}</p>
                          <p className="text-sm text-slate-600">Avg Quality: {industry.averageQualityScore}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(industry.totalSpend / data.summary.totalSpend) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Payment Terms Analysis</h3>
                <div className="space-y-4">
                  {data.paymentTermsAnalysis.map((terms, index) => (
                    <div key={index} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-slate-900">{terms.terms}</h4>
                          <p className="text-sm text-slate-500">{terms.vendorCount} vendors</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(terms.totalSpend)}</p>
                          <p className="text-sm text-slate-600">
                            Avg Order: {formatCurrency(terms.averageOrderValue)}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(terms.totalSpend / data.summary.totalSpend) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-6">Risk Analysis & Recommendations</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-slate-900 mb-4">Concentration Risk</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Top vendor percentage:</span>
                      <span className="font-semibold text-slate-900">
                        {formatPercentage(data.riskAnalysis.concentrationRisk.topVendorPercentage)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Top 5 vendors percentage:</span>
                      <span className="font-semibold text-slate-900">
                        {formatPercentage(data.riskAnalysis.concentrationRisk.top5VendorPercentage)}
                      </span>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Recommendation:</strong> {data.riskAnalysis.concentrationRisk.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 mb-4">Compliance Risk</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Missing W9 forms:</span>
                      <span className="font-semibold text-slate-900">
                        {data.riskAnalysis.complianceRisk.missingW9} vendors
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Outdated information:</span>
                      <span className="font-semibold text-slate-900">
                        {data.riskAnalysis.complianceRisk.outdatedInfo} vendors
                      </span>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Recommendation:</strong> {data.riskAnalysis.complianceRisk.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}