'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as TruckIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';

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

  const _userRole = user?.role || 'OPERATIONS_MANAGER';

  const fetchData = useCallback(async () => {
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

      // Normalize API response to match component interface
      const normalized: VendorAnalysisData = {
        summary: {
          totalVendors: result.summary?.totalVendors ?? 0,
          totalSpend: result.summary?.totalSpend ?? 0,
          averageQualityScore: result.summary?.overallPerformanceScore ?? 0,
          topPerformers: (result.vendorAnalysis || []).filter((v: Record<string, unknown>) => {
            const performance = v.performance as Record<string, unknown> | undefined;
            return ((performance?.qualityScore ?? 0) as number) >= 85;
          }).length,
          riskVendors: (result.vendorAnalysis || []).filter((v: Record<string, unknown>) => {
            const riskFactors = v.riskFactors as Record<string, unknown> | undefined;
            return riskFactors?.overallRisk === 'high';
          }).length,
        },
        vendors: (result.vendorAnalysis || []).map((v: Record<string, unknown>) => {
          const vendor = v.vendor as Record<string, unknown> | undefined;
          const financialMetrics = v.financialMetrics as Record<string, unknown> | undefined;
          const performance = v.performance as Record<string, unknown> | undefined;
          const paymentTerms = v.paymentTerms as Record<string, unknown> | undefined;
          const compliance = vendor?.compliance as Record<string, unknown> | undefined;
          const contactInfo = vendor?.contactInfo as Record<string, unknown> | undefined;
          const qualityScore = (performance?.qualityScore ?? 0) as number;
          return {
            vendorId: (vendor?.id ?? '') as string,
            vendorName: (vendor?.name ?? 'Unknown') as string,
            totalSpend: (financialMetrics?.totalSpend ?? 0) as number,
            totalOrders: (financialMetrics?.totalPOCount ?? 0) as number,
            averageOrderValue: (financialMetrics?.averagePOSize ?? 0) as number,
            qualityScore: qualityScore,
            onTimeDeliveryRate: (performance?.onTimeDeliveryRate ?? 0) as number,
            completionRate: (performance?.completionRate ?? 0) as number,
            paymentTerms: (paymentTerms?.defaultTerms ?? 'Net30') as string,
            w9OnFile: (compliance?.w9OnFile ?? false) as boolean,
            industryType: (vendor?.type ?? 'Other') as string,
            riskFactors: [],
            monthlyTrend: ((v.spendingTrends || []) as Record<string, unknown>[]).map((t: Record<string, unknown>) => ({
              month: t.month as string,
              spend: t.totalAmount as number,
              orders: t.poCount as number,
              qualityScore: qualityScore,
            })),
            contactInfo: {
              email: (contactInfo?.contactEmail ?? '') as string,
              phone: (contactInfo?.contactPhone ?? '') as string,
              address: '',
            },
          };
        }),
        industryBreakdown: (result.industryBreakdown || []).map((i: Record<string, unknown>) => ({
          industry: (i.vendorType ?? 'Other') as string,
          vendorCount: (i.vendorCount ?? 0) as number,
          totalSpend: (i.totalSpend ?? 0) as number,
          averageQualityScore: (i.performanceScore ?? 0) as number,
        })),
        paymentTermsAnalysis: (result.paymentTermsAnalysis || []).map((t: Record<string, unknown>) => {
          const vendorCount = (t.vendorCount ?? 0) as number;
          const totalSpend = (t.totalSpend ?? 0) as number;
          return {
            terms: (t.terms ?? '') as string,
            vendorCount: vendorCount,
            totalSpend: totalSpend,
            averageOrderValue: vendorCount > 0 ? totalSpend / vendorCount : 0,
          };
        }),
        riskAnalysis: {
          concentrationRisk: {
            topVendorPercentage: (() => {
              const firstVendor = (result.vendorAnalysis || [])[0] as Record<string, unknown> | undefined;
              const firstMetrics = firstVendor?.financialMetrics as Record<string, unknown> | undefined;
              return (firstMetrics?.spendShare ?? 0) as number;
            })(),
            top5VendorPercentage: result.summary?.vendorConcentrationRisk ?? 0,
            recommendation: result.summary?.vendorConcentrationRisk > 50
              ? 'Consider diversifying vendor base to reduce concentration risk'
              : 'Vendor concentration is within acceptable limits',
          },
          complianceRisk: {
            missingW9: (result.vendorAnalysis || []).filter((v: Record<string, unknown>) => {
              const vendor = v.vendor as Record<string, unknown> | undefined;
              const compliance = vendor?.compliance as Record<string, unknown> | undefined;
              return !(compliance?.w9OnFile);
            }).length,
            outdatedInfo: 0,
            recommendation: 'Ensure all active vendors have current W9 forms on file',
          },
        },
      };

      setData(normalized);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch vendor analysis data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getQualityBadgeColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getRiskBadgeColor = (severity: string): 'success' | 'warning' | 'error' => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const renderStarRating = (score: number) => {
    const stars = Math.round(score / 20); // Convert 0-100 to 0-5 stars
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {[1, 2, 3, 4, 5].map(star => (
          star <= stars ? (
            <StarIcon key={star} sx={{ width: 16, height: 16, color: 'warning.main' }} />
          ) : (
            <StarBorderIcon key={star} sx={{ width: 16, height: 16, color: 'grey.300' }} />
          )
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          ({score})
        </Typography>
      </Box>
    );
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <TruckIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography color="text.secondary">Please sign in to view vendor analysis reports.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  href="/reports"
                  startIcon={<ArrowBackIcon />}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}
                >
                  Back to Reports
                </Button>
                <Box sx={{ width: 1, height: 24, bgcolor: 'divider' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TruckIcon sx={{ fontSize: 24, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">Vendor Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">Performance evaluation and risk assessment</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">Last updated: {lastRefresh.toLocaleTimeString()}</Typography>
                  <Typography variant="caption" color="text.disabled">Welcome, {user?.name?.split(' ')[0]}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Typography variant="body2" color="text.secondary">Auto-refresh</Typography>
                </Box>

                <Button
                  onClick={fetchData}
                  disabled={loading}
                  variant="contained"
                  startIcon={<RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />}
                  sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>Report Filters</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight="500" color="text.primary" sx={{ mb: 1 }}>Start Date</Typography>
              <TextField
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                size="small"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight="500" color="text.primary" sx={{ mb: 1 }}>End Date</Typography>
              <TextField
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                size="small"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight="500" color="text.primary" sx={{ mb: 1 }}>Division</Typography>
              <TextField
                select
                value={filters.divisionId}
                onChange={(e) => setFilters(prev => ({ ...prev, divisionId: e.target.value }))}
                size="small"
                fullWidth
              >
                <MenuItem value="">All Divisions</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight="500" color="text.primary" sx={{ mb: 1 }}>Industry</Typography>
              <TextField
                select
                value={filters.industryFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, industryFilter: e.target.value }))}
                size="small"
                fullWidth
              >
                <MenuItem value="">All Industries</MenuItem>
                <MenuItem value="Construction">Construction</MenuItem>
                <MenuItem value="Materials">Materials</MenuItem>
                <MenuItem value="Equipment">Equipment</MenuItem>
                <MenuItem value="Services">Services</MenuItem>
                <MenuItem value="Technology">Technology</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight="500" color="text.primary" sx={{ mb: 1 }}>Min Spend</Typography>
              <TextField
                type="number"
                placeholder="0"
                value={filters.minSpend}
                onChange={(e) => setFilters(prev => ({ ...prev, minSpend: e.target.value }))}
                size="small"
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight="500" color="text.primary" sx={{ mb: 1 }}>Min Quality Score</Typography>
              <TextField
                select
                value={filters.qualityThreshold}
                onChange={(e) => setFilters(prev => ({ ...prev, qualityThreshold: e.target.value }))}
                size="small"
                fullWidth
              >
                <MenuItem value="">Any Score</MenuItem>
                <MenuItem value="85">Excellent (85+)</MenuItem>
                <MenuItem value="70">Good (70+)</MenuItem>
                <MenuItem value="50">Fair (50+)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Options */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>Export Options</Typography>
              <Typography variant="body2" color="text.secondary">Download vendor analysis in various formats</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                onClick={exportToExcel}
                variant="contained"
                startIcon={<DownloadIcon />}
                sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                Excel
              </Button>
              <Button
                onClick={exportToPDF}
                variant="contained"
                startIcon={<DownloadIcon />}
                sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
              >
                PDF
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2, color: 'warning.main' }} />
            <Typography color="text.secondary">Loading vendor analysis data...</Typography>
          </Paper>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="500">Error loading data</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 6, lg: 2.4 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">Total Vendors</Typography>
                      <Typography variant="h5" fontWeight="bold">{data.summary.totalVendors}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                      <TruckIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 2.4 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">Total Spend</Typography>
                      <Typography variant="h5" fontWeight="bold">{formatCurrency(data.summary.totalSpend)}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2 }}>
                      <MoneyIcon sx={{ fontSize: 24, color: 'success.main' }} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 2.4 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">Avg Quality Score</Typography>
                      <Typography variant="h5" fontWeight="bold">{data.summary.averageQualityScore}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                      <StarIcon sx={{ fontSize: 24, color: 'warning.main' }} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 2.4 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">Top Performers</Typography>
                      <Typography variant="h5" fontWeight="bold">{data.summary.topPerformers}</Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>Score 85+</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 24, color: 'success.main' }} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 2.4 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" fontWeight="500" color="text.secondary">Risk Vendors</Typography>
                      <Typography variant="h5" fontWeight="bold">{data.summary.riskVendors}</Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>Need attention</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: 'error.lighter', borderRadius: 2 }}>
                      <WarningIcon sx={{ fontSize: 24, color: 'error.main' }} />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Vendor Performance Table */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>Vendor Performance Rankings</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Vendor
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Total Spend
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Orders
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Quality Score
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        On-Time Delivery
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Payment Terms
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Risk Factors
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.vendors.slice(0, 10).map((vendor) => (
                      <TableRow key={vendor.vendorId} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="500">{vendor.vendorName}</Typography>
                            <Typography variant="caption" color="text.secondary">{vendor.industryType}</Typography>
                            {vendor.w9OnFile && (
                              <Chip label="W9 Filed" size="small" color="success" sx={{ mt: 0.5 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(vendor.totalSpend)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Avg: {formatCurrency(vendor.averageOrderValue)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{vendor.totalOrders}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {renderStarRating(vendor.qualityScore)}
                            <Chip
                              label={vendor.qualityScore >= 85 ? 'Excellent' : vendor.qualityScore >= 70 ? 'Good' : 'Needs Improvement'}
                              size="small"
                              color={getQualityBadgeColor(vendor.qualityScore)}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatPercentage(vendor.onTimeDeliveryRate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{vendor.paymentTerms}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {vendor.riskFactors.slice(0, 2).map((risk, index) => (
                              <Chip
                                key={index}
                                label={risk.type}
                                size="small"
                                color={getRiskBadgeColor(risk.severity)}
                              />
                            ))}
                            {vendor.riskFactors.length > 2 && (
                              <Typography variant="caption" color="text.secondary">
                                +{vendor.riskFactors.length - 2} more
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Industry Analysis */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>Industry Breakdown</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.industryBreakdown.map((industry, index) => (
                      <Box key={index} sx={{ borderBottom: index < data.industryBreakdown.length - 1 ? 1 : 0, borderColor: 'divider', pb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight="500">{industry.industry}</Typography>
                            <Typography variant="caption" color="text.secondary">{industry.vendorCount} vendors</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight="600">{formatCurrency(industry.totalSpend)}</Typography>
                            <Typography variant="caption" color="text.secondary">Avg Quality: {industry.averageQualityScore}</Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(industry.totalSpend / data.summary.totalSpend) * 100}
                          sx={{ height: 8, borderRadius: 1, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: 'warning.main' } }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>Payment Terms Analysis</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.paymentTermsAnalysis.map((terms, index) => (
                      <Box key={index} sx={{ borderBottom: index < data.paymentTermsAnalysis.length - 1 ? 1 : 0, borderColor: 'divider', pb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight="500">{terms.terms}</Typography>
                            <Typography variant="caption" color="text.secondary">{terms.vendorCount} vendors</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body2" fontWeight="600">{formatCurrency(terms.totalSpend)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Avg Order: {formatCurrency(terms.averageOrderValue)}
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(terms.totalSpend / data.summary.totalSpend) * 100}
                          sx={{ height: 8, borderRadius: 1, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Risk Analysis */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>Risk Analysis & Recommendations</Typography>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Typography variant="body2" fontWeight="500" sx={{ mb: 2 }}>Concentration Risk</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Top vendor percentage:</Typography>
                      <Typography variant="body2" fontWeight="600">
                        {formatPercentage(data.riskAnalysis.concentrationRisk.topVendorPercentage)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Top 5 vendors percentage:</Typography>
                      <Typography variant="body2" fontWeight="600">
                        {formatPercentage(data.riskAnalysis.concentrationRisk.top5VendorPercentage)}
                      </Typography>
                    </Box>
                    <Paper sx={{ mt: 2, p: 1.5, bgcolor: 'primary.lighter' }}>
                      <Typography variant="body2" color="primary.dark">
                        <strong>Recommendation:</strong> {data.riskAnalysis.concentrationRisk.recommendation}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <Typography variant="body2" fontWeight="500" sx={{ mb: 2 }}>Compliance Risk</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Missing W9 forms:</Typography>
                      <Typography variant="body2" fontWeight="600">
                        {data.riskAnalysis.complianceRisk.missingW9} vendors
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Outdated information:</Typography>
                      <Typography variant="body2" fontWeight="600">
                        {data.riskAnalysis.complianceRisk.outdatedInfo} vendors
                      </Typography>
                    </Box>
                    <Paper sx={{ mt: 2, p: 1.5, bgcolor: 'warning.lighter' }}>
                      <Typography variant="body2" color="warning.dark">
                        <strong>Recommendation:</strong> {data.riskAnalysis.complianceRisk.recommendation}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}
