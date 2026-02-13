'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FolderOpen as FolderOpenIcon,
  CalendarToday as CalendarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

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
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<ProjectDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    projectId: '',
    divisionId: '',
    workOrderFilter: '',
    includeCompleted: 'true',
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
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.divisionId) params.set('divisionId', filters.divisionId);
      if (filters.workOrderFilter) params.set('workOrderFilter', filters.workOrderFilter);
      if (filters.includeCompleted) params.set('includeCompleted', filters.includeCompleted);

      const response = await fetch(`/api/reports/project-details?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      const firstProject = (result.projects || [])[0];
      if (!firstProject) {
        setData(null);
        setError('No project data found for the selected filters');
        setLastRefresh(new Date());
        return;
      }

      const proj = firstProject;
      const now = new Date();
      const startDate = proj.startDate ? new Date(proj.startDate) : new Date();
      const endDate = proj.endDate ? new Date(proj.endDate) : new Date();
      const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysPassed = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const percentComplete = Math.min(100, (daysPassed / totalDays) * 100);
      const budgetTotal = proj.budgetTotal ?? 0;
      const budgetActual = proj.budgetActual ?? 0;
      const varianceAmount = budgetActual - budgetTotal;
      const variancePercentage = budgetTotal > 0 ? (varianceAmount / budgetTotal) * 100 : 0;
      const cpi = budgetActual > 0 ? (budgetTotal * (percentComplete / 100)) / budgetActual : 1;
      const spi = percentComplete / Math.max(1, (daysPassed / totalDays) * 100);
      const eac = cpi > 0 ? budgetTotal / cpi : budgetTotal;
      const vac = budgetTotal - eac;

      const normalized: ProjectDetailsData = {
        projectInfo: {
          projectId: proj.id ?? '',
          projectName: proj.projectName ?? proj.project_name ?? '',
          description: proj.description ?? '',
          projectManager: proj.projectManager ?? '',
          status: proj.status ?? 'Active',
          totalBudget: budgetTotal,
          actualSpend: budgetActual,
          forecastToComplete: eac - budgetActual,
          varianceAmount,
          variancePercentage,
          timeline: {
            startDate: proj.startDate ?? now.toISOString(),
            plannedEndDate: proj.endDate ?? now.toISOString(),
            revisedEndDate: proj.endDate ?? now.toISOString(),
            percentComplete,
          },
          riskLevel: Math.abs(variancePercentage) > 20 ? 'high' : Math.abs(variancePercentage) > 10 ? 'medium' : 'low',
          lastUpdated: new Date().toISOString(),
        },
        divisionSpending: (proj.divisions || []).map((d: Record<string, unknown>) => {
          const poCount = (d.poCount ?? 0) as number;
          const totalSpend = (d.totalSpend ?? 0) as number;
          return {
            divisionId: (d.divisionId ?? '') as string,
            divisionName: (d.divisionName ?? '') as string,
            totalSpend: totalSpend,
            budgetAllocated: (d.budgetAllocated ?? totalSpend) as number,
            varianceAmount: 0,
            variancePercentage: 0,
            poCount: poCount,
            averagePOValue: poCount > 0 ? totalSpend / poCount : 0,
            topVendors: ((d.topVendors || []) as Record<string, unknown>[]).map((v: Record<string, unknown>) => ({
              vendorName: (v.vendorName ?? '') as string,
              amount: (v.totalAmount ?? 0) as number,
              poCount: (v.poCount ?? 0) as number,
            })),
            workOrders: [],
          };
        }),
        spendingPatterns: (proj.monthlyTrend || []).map((t: Record<string, unknown>) => ({
          month: `${t.month ?? ''} ${t.year ?? ''}`.trim(),
          budgetedSpend: 0,
          actualSpend: t.totalAmount ?? 0,
          variance: 0,
          posCreated: t.poCount ?? 0,
          posCompleted: 0,
          averageProcessingTime: 0,
        })),
        workOrderCorrelations: [],
        keyMetrics: {
          costVariance: varianceAmount,
          scheduleVariance: 0,
          costPerformanceIndex: cpi,
          schedulePerformanceIndex: spi,
          estimateAtCompletion: eac,
          varianceAtCompletion: vac,
          budgetEfficiency: budgetTotal > 0 ? (budgetActual / budgetTotal) * 100 : 0,
          spendVelocity: daysPassed > 0 ? budgetActual / daysPassed : 0,
        },
        alerts: [],
        recommendations: [],
      };

      setData(normalized);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch project details data:', err);
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
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5 * 60 * 1000);
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

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'error.main';
    if (variance < -5) return 'success.main';
    return 'text.primary';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in progress':
        return 'info';
      case 'on hold':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPerformanceIndicator = (value: number, threshold: number = 1.0) => {
    if (value >= threshold) return { color: 'success.main', trend: 'positive' };
    if (value >= threshold * 0.9) return { color: 'warning.main', trend: 'neutral' };
    return { color: 'error.main', trend: 'negative' };
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <FolderOpenIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2, mx: 'auto' }} />
          <Typography color="text.secondary">Please sign in to view project detail reports.</Typography>
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
                <Link href="/reports" style={{ textDecoration: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                    <ArrowBackIcon fontSize="small" />
                    <Typography>Back to Reports</Typography>
                  </Box>
                </Link>
                <Box sx={{ height: 24, width: 1, bgcolor: 'grey.300' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FolderOpenIcon sx={{ color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">Project Details Analysis</Typography>
                    <Typography color="text.secondary">Cross-divisional project spending and performance</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">Last updated: {lastRefresh.toLocaleTimeString()}</Typography>
                  <Typography variant="caption" color="text.secondary">Welcome, {user?.name?.split(' ')[0]}</Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Auto-refresh</Typography>}
                />

                <Button
                  onClick={fetchData}
                  disabled={loading}
                  variant="contained"
                  color="warning"
                  startIcon={<RefreshIcon />}
                  sx={{ textTransform: 'none' }}
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
          <Typography variant="h6" fontWeight="semibold" mb={2}>Report Filters</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>Start Date</Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>End Date</Typography>
              <TextField
                type="date"
                fullWidth
                size="small"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>Project</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={filters.projectId}
                onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
              >
                <MenuItem value="">All Projects</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>Division</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={filters.divisionId}
                onChange={(e) => setFilters(prev => ({ ...prev, divisionId: e.target.value }))}
              >
                <MenuItem value="">All Divisions</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>Work Order</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="WO number or description"
                value={filters.workOrderFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, workOrderFilter: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4, lg: 2 }}>
              <Typography variant="body2" fontWeight={500} mb={1}>Include Completed</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={filters.includeCompleted}
                onChange={(e) => setFilters(prev => ({ ...prev, includeCompleted: e.target.value }))}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Options */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" fontWeight="semibold" mb={1}>Export Options</Typography>
              <Typography variant="body2" color="text.secondary">Download project analysis in various formats</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                onClick={exportToExcel}
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
                sx={{ textTransform: 'none' }}
              >
                Excel
              </Button>
              <Button
                onClick={exportToPDF}
                variant="contained"
                color="error"
                startIcon={<DownloadIcon />}
                sx={{ textTransform: 'none' }}
              >
                PDF
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Loading project details data...</Typography>
          </Paper>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Project Overview */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{data.projectInfo.projectName}</Typography>
                  <Typography color="text.secondary">{data.projectInfo.description}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">PM: {data.projectInfo.projectManager}</Typography>
                    <Typography variant="body2" color="text.secondary">•</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Updated: {new Date(data.projectInfo.lastUpdated).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip label={data.projectInfo.status} color={getStatusColor(data.projectInfo.status)} size="small" />
                  <Chip
                    label={`${data.projectInfo.riskLevel.charAt(0).toUpperCase() + data.projectInfo.riskLevel.slice(1)} Risk`}
                    color={getRiskBadgeColor(data.projectInfo.riskLevel)}
                    size="small"
                  />
                </Box>
              </Box>

              {/* Project Metrics Grid */}
              <Grid container spacing={3} mb={3}>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Paper sx={{ bgcolor: 'grey.50', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Total Budget</Typography>
                        <Typography variant="h6" fontWeight="bold">{formatCurrency(data.projectInfo.totalBudget)}</Typography>
                      </Box>
                      <Box sx={{ p: 1, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <CalendarIcon sx={{ color: 'info.main' }} />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Paper sx={{ bgcolor: 'grey.50', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Actual Spend</Typography>
                        <Typography variant="h6" fontWeight="bold">{formatCurrency(data.projectInfo.actualSpend)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {data.projectInfo.totalBudget > 0
                            ? `${formatPercentage((data.projectInfo.actualSpend / data.projectInfo.totalBudget) * 100)} of budget`
                            : 'No budget set'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1, bgcolor: 'success.lighter', borderRadius: 1 }}>
                        <TrendingUpIcon sx={{ color: 'success.main' }} />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Paper sx={{ bgcolor: 'grey.50', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Variance</Typography>
                        <Typography variant="h6" fontWeight="bold" color={getVarianceColor(data.projectInfo.variancePercentage)}>
                          {formatCurrency(Math.abs(data.projectInfo.varianceAmount))}
                        </Typography>
                        <Typography variant="caption" color={getVarianceColor(data.projectInfo.variancePercentage)}>
                          {formatPercentage(Math.abs(data.projectInfo.variancePercentage))}
                          {data.projectInfo.variancePercentage > 0 ? ' over' : ' under'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1, bgcolor: data.projectInfo.varianceAmount > 0 ? 'error.lighter' : 'success.lighter', borderRadius: 1 }}>
                        {data.projectInfo.varianceAmount > 0 ? (
                          <TrendingUpIcon sx={{ color: 'error.main' }} />
                        ) : (
                          <TrendingDownIcon sx={{ color: 'success.main' }} />
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Paper sx={{ bgcolor: 'grey.50', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Progress</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {formatPercentage(data.projectInfo.timeline.percentComplete)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={data.projectInfo.timeline.percentComplete}
                          sx={{ mt: 1, height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      <Box sx={{ p: 1, bgcolor: 'warning.lighter', borderRadius: 1, ml: 2 }}>
                        <CalendarIcon sx={{ color: 'warning.main' }} />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Timeline Info */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary" component="span">Start Date: </Typography>
                  <Typography variant="body2" fontWeight={500} component="span">
                    {new Date(data.projectInfo.timeline.startDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary" component="span">Planned End: </Typography>
                  <Typography variant="body2" fontWeight={500} component="span">
                    {new Date(data.projectInfo.timeline.plannedEndDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary" component="span">Revised End: </Typography>
                  <Typography variant="body2" fontWeight={500} component="span">
                    {new Date(data.projectInfo.timeline.revisedEndDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Key Performance Metrics */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight="semibold" mb={3}>Key Performance Metrics</Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <Typography variant="h4" fontWeight="bold" color={getPerformanceIndicator(data.keyMetrics.costPerformanceIndex).color}>
                        {data.keyMetrics.costPerformanceIndex.toFixed(2)}
                      </Typography>
                      <Box sx={{ ml: 1, color: getPerformanceIndicator(data.keyMetrics.costPerformanceIndex).color }}>
                        {data.keyMetrics.costPerformanceIndex >= 1.0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      </Box>
                    </Box>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">Cost Performance Index</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {data.keyMetrics.costPerformanceIndex >= 1.0 ? 'Under budget' : 'Over budget'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <Typography variant="h4" fontWeight="bold" color={getPerformanceIndicator(data.keyMetrics.schedulePerformanceIndex).color}>
                        {data.keyMetrics.schedulePerformanceIndex.toFixed(2)}
                      </Typography>
                      <Box sx={{ ml: 1, color: getPerformanceIndicator(data.keyMetrics.schedulePerformanceIndex).color }}>
                        {data.keyMetrics.schedulePerformanceIndex >= 1.0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                      </Box>
                    </Box>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">Schedule Performance Index</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {data.keyMetrics.schedulePerformanceIndex >= 1.0 ? 'Ahead of schedule' : 'Behind schedule'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" mb={1}>
                      {formatCurrency(data.keyMetrics.estimateAtCompletion)}
                    </Typography>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">Estimate at Completion</Typography>
                    <Typography variant="caption" color="text.secondary">Forecasted final cost</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color={getVarianceColor(data.keyMetrics.varianceAtCompletion)} mb={1}>
                      {formatCurrency(Math.abs(data.keyMetrics.varianceAtCompletion))}
                    </Typography>
                    <Typography variant="body2" fontWeight={500} color="text.secondary">Variance at Completion</Typography>
                    <Typography variant="caption" color={getVarianceColor(data.keyMetrics.varianceAtCompletion)}>
                      {data.keyMetrics.varianceAtCompletion > 0 ? 'Over budget' : 'Under budget'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Division Spending Breakdown */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight="semibold" mb={3}>Division Spending Analysis</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Division</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Budget Allocated</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Total Spend</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Variance</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>PO Activity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Top Vendor</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.divisionSpending.map((division) => (
                      <TableRow key={division.divisionId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{division.divisionName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(division.budgetAllocated)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(division.totalSpend)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {division.budgetAllocated > 0
                              ? `${formatPercentage((division.totalSpend / division.budgetAllocated) * 100)} utilized`
                              : 'No budget allocated'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} color={getVarianceColor(division.variancePercentage)}>
                            {formatCurrency(Math.abs(division.varianceAmount))}
                          </Typography>
                          <Typography variant="caption" color={getVarianceColor(division.variancePercentage)}>
                            {formatPercentage(Math.abs(division.variancePercentage))}
                            {division.variancePercentage > 0 ? ' over' : ' under'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{division.poCount} POs</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Avg: {formatCurrency(division.averagePOValue)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {division.topVendors[0] && (
                            <Box>
                              <Typography variant="body2">{division.topVendors[0].vendorName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatCurrency(division.topVendors[0].amount)} ({division.topVendors[0].poCount} POs)
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Work Order Correlations */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight="semibold" mb={3}>Work Order Analysis</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {data.workOrderCorrelations.slice(0, 5).map((workOrder, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={500}>{workOrder.workOrderNumber}</Typography>
                        <Typography variant="body2" color="text.secondary">{workOrder.description}</Typography>
                        <Typography variant="caption" color="text.secondary">Phase: {workOrder.projectPhase}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {formatCurrency(workOrder.actualSpend)} / {formatCurrency(workOrder.totalBudget)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{workOrder.relatedPOs} related POs</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Completion Progress</Typography>
                        <Typography variant="body2" fontWeight={500}>{formatPercentage(workOrder.completionPercentage)}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={workOrder.completionPercentage} sx={{ height: 8, borderRadius: 1 }} />
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Planned Start:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(workOrder.schedule.plannedStart).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Actual Start:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(workOrder.schedule.actualStart).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Planned End:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(workOrder.schedule.plannedEnd).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, md: 3 }}>
                        <Typography variant="caption" color="text.secondary">Estimated End:</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(workOrder.schedule.estimatedEnd).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    </Grid>

                    {workOrder.divisions.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight={500} mb={1}>Division Breakdown:</Typography>
                        <Grid container spacing={1}>
                          {workOrder.divisions.map((div, divIndex) => (
                            <Grid key={divIndex} size={{ xs: 12, md: 4 }}>
                              <Paper sx={{ bgcolor: 'grey.50', p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">{div.divisionName}</Typography>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="caption" fontWeight={500}>{formatCurrency(div.spend)}</Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {formatPercentage(div.percentage)}
                                  </Typography>
                                </Box>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            </Paper>

            {/* Alerts and Recommendations */}
            <Grid container spacing={4}>
              {/* Alerts */}
              {data.alerts.length > 0 && (
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="semibold" mb={3}>Project Alerts</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {data.alerts.slice(0, 5).map((alert, index) => (
                        <Alert
                          key={index}
                          severity={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2">{alert.type}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(alert.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2" mt={0.5}>{alert.message}</Typography>
                        </Alert>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Recommendations */}
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="semibold" mb={3}>Recommendations</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.recommendations.slice(0, 4).map((rec, index) => (
                      <Alert
                        key={index}
                        severity={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">{rec.category}</Typography>
                          <Chip
                            label={rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                            color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" mb={1}>{rec.recommendation}</Typography>
                        <Typography variant="caption" color="text.secondary" mb={1} display="block">
                          <strong>Impact:</strong> {rec.impact}
                        </Typography>
                        {rec.actionItems.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" fontWeight={500}>Action Items:</Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2 }}>
                              {rec.actionItems.slice(0, 3).map((item, itemIndex) => (
                                <Typography component="li" key={itemIndex} variant="caption" color="text.secondary">
                                  {item}
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Alert>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Box>
  );
}
