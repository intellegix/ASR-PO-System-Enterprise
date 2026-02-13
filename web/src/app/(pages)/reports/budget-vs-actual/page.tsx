'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  AlertTitle,
  Paper,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  Calculate,
  TrendingUp,
  TrendingDown,
  Download,
  Refresh,
  Warning,
} from '@mui/icons-material';

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
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    divisionId: '',
    projectId: '',
    riskLevel: '',
    varianceThreshold: '',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
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

      const normalized: BudgetAnalysisData = {
        summary: {
          totalProjects: result.summary?.totalProjects ?? 0,
          totalBudget: result.summary?.totalProjectBudgets ?? 0,
          totalActual: result.summary?.totalActualSpend ?? 0,
          totalVariance: result.summary?.overallVariance ?? 0,
          projectsOverBudget: result.summary?.projectsOverBudget ?? 0,
          projectsAtRisk: (result.riskAnalysis?.highRiskProjects?.length ?? 0),
          averageCPI: 0,
          averageSPI: 0,
        },
        projects: (result.projectAnalysis || []).map((p: Record<string, unknown>) => {
          const budget = (p.budget || {}) as Record<string, unknown>;
          const timeline = (p.timeline || {}) as Record<string, unknown>;
          const risk = (p.riskFactors || {}) as Record<string, unknown>;
          const project = p.project as Record<string, unknown> | undefined;
          const projStart = project?.startDate ? new Date(project.startDate as string) : new Date();
          const projEnd = project?.endDate ? new Date(project.endDate as string) : new Date();
          const now = new Date();
          const totalDays = Math.max(1, (projEnd.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24));
          const daysPassed = Math.max(0, (now.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24));
          const percentComplete = Math.min(100, (daysPassed / totalDays) * 100);
          const currentActual = (budget.currentActual ?? 0) as number;
          const originalBudget = (budget.originalBudget ?? 0) as number;
          const cpi = currentActual > 0 && originalBudget > 0
            ? (originalBudget * (percentComplete / 100)) / currentActual : 1;
          const spi = totalDays > 0 ? (daysPassed / totalDays) : 1;

          return {
            projectId: (project?.id ?? '') as string,
            projectName: (project?.name ?? '') as string,
            divisionName: (project?.divisionName ?? '') as string,
            originalBudget: originalBudget,
            revisedBudget: originalBudget,
            actualSpend: currentActual,
            commitments: (budget.poCommitted ?? 0) as number,
            availableBudget: (budget.variance ?? 0) as number,
            varianceAmount: (budget.variance ?? 0) as number,
            variancePercentage: (budget.variancePercentage ?? 0) as number,
            budgetUtilization: (budget.utilizationPercentage ?? 0) as number,
            forecastToComplete: (timeline.projectedCompletionSpend ?? 0) as number,
            estimateAtCompletion: (timeline.projectedCompletionSpend ?? 0) as number,
            costPerformanceIndex: cpi,
            schedulePerformanceIndex: spi,
            riskLevel: (risk.overallRisk ?? 'low') as 'low' | 'medium' | 'high',
            alerts: ((risk.riskReasons || []) as unknown[]).map((r: unknown) => ({
              type: 'Budget' as const,
              message: r as string,
              severity: (risk.overallRisk === 'high' ? 'critical' : 'warning') as 'critical' | 'warning',
            })),
            timeline: {
              startDate: (project?.startDate ?? new Date().toISOString()) as string,
              originalEndDate: (project?.endDate ?? new Date().toISOString()) as string,
              revisedEndDate: (project?.endDate ?? new Date().toISOString()) as string,
              percentComplete,
              daysRemaining: (timeline.daysRemaining ?? 0) as number,
            },
            recommendations: [],
          };
        }),
        divisionSummary: (result.divisionSummary || []).map((d: Record<string, unknown>) => {
          const division = d.division as Record<string, unknown> | undefined;
          const aggregate = (d.aggregate || {}) as Record<string, unknown>;
          const performance = d.performance as Record<string, unknown> | undefined;
          const totalProjectBudgets = (aggregate.totalProjectBudgets ?? 0) as number;
          const totalActualSpend = (aggregate.totalActualSpend ?? 0) as number;
          const totalCommittedSpend = (aggregate.totalCommittedSpend ?? 0) as number;
          return {
            divisionName: (division?.name ?? '') as string,
            totalBudget: totalProjectBudgets,
            totalActual: totalActualSpend,
            variance: (aggregate.overallVariance ?? 0) as number,
            variancePercentage: (performance?.averageVariancePercentage ?? 0) as number,
            projectCount: (aggregate.projectCount ?? 0) as number,
            averageCPI: totalProjectBudgets > 0
              ? (totalActualSpend + totalCommittedSpend) / totalProjectBudgets : 1,
          };
        }),
        monthlyTrends: (result.budgetTrends || []).map((t: Record<string, unknown>) => {
          const actualSpend = (t.actualSpend ?? 0) as number;
          const budgetAllocated = (t.budgetAllocated ?? 0) as number;
          return {
            month: `${t.month ?? ''} ${t.year ?? ''}`.trim(),
            budgetSpend: budgetAllocated,
            actualSpend: actualSpend,
            variance: actualSpend - budgetAllocated,
            cumulativeVariance: 0,
          };
        }),
        forecastAnalysis: {
          projectedOverrun: result.forecasting?.projectedYearEndSpend
            ? result.forecasting.projectedYearEndSpend - (result.summary?.totalProjectBudgets ?? 0)
            : 0,
          confidenceLevel: 75,
          keyRisks: (result.forecasting?.recommendedActions || []).map((action: string) => ({
            risk: action,
            impact: 0,
            mitigation: '',
          })),
        },
      };

      const projects = normalized.projects;
      if (projects.length > 0) {
        normalized.summary.averageCPI = projects.reduce((s, p) => s + p.costPerformanceIndex, 0) / projects.length;
        normalized.summary.averageSPI = projects.reduce((s, p) => s + p.schedulePerformanceIndex, 0) / projects.length;
      }

      let cumVar = 0;
      normalized.monthlyTrends.forEach(t => {
        cumVar += t.variance;
        t.cumulativeVariance = cumVar;
      });

      setData(normalized);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch budget analysis data:', err);
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

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'error.main';
    if (variance < -5) return 'success.main';
    return 'text.primary';
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Calculate sx={{ width: 48, height: 48, color: 'grey.400', mb: 2 }} />
          <Typography color="text.secondary">Please sign in to view budget analysis reports.</Typography>
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
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  href="/reports"
                  startIcon={<ArrowBack />}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Back to Reports</Box>
                </Button>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Calculate sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>Budget vs Actual Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">Project budget variance and forecasting</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">Last updated: {lastRefresh.toLocaleTimeString()}</Typography>
                  <Typography variant="caption" color="text.disabled">Welcome, {user?.name?.split(' ')[0]}</Typography>
                </Box>

                <FormControlLabel
                  control={<Checkbox checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
                  label={<Typography variant="body2">Auto-refresh</Typography>}
                />

                <Button
                  onClick={fetchData}
                  disabled={loading}
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
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
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Report Filters</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <TextField
                fullWidth
                select
                label="Division"
                value={filters.divisionId}
                onChange={(e) => setFilters(prev => ({ ...prev, divisionId: e.target.value }))}
              >
                <MenuItem value="">All Divisions</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <TextField
                fullWidth
                select
                label="Project"
                value={filters.projectId}
                onChange={(e) => setFilters(prev => ({ ...prev, projectId: e.target.value }))}
              >
                <MenuItem value="">All Projects</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <TextField
                fullWidth
                select
                label="Risk Level"
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              >
                <MenuItem value="">All Risk Levels</MenuItem>
                <MenuItem value="high">High Risk</MenuItem>
                <MenuItem value="medium">Medium Risk</MenuItem>
                <MenuItem value="low">Low Risk</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <TextField
                fullWidth
                select
                label="Variance Threshold"
                value={filters.varianceThreshold}
                onChange={(e) => setFilters(prev => ({ ...prev, varianceThreshold: e.target.value }))}
              >
                <MenuItem value="">Any Variance</MenuItem>
                <MenuItem value="5">Over 5%</MenuItem>
                <MenuItem value="10">Over 10%</MenuItem>
                <MenuItem value="15">Over 15%</MenuItem>
                <MenuItem value="20">Over 20%</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Options */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Export Options</Typography>
              <Typography variant="body2" color="text.secondary">Download budget analysis in various formats</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button onClick={exportToExcel} variant="contained" color="success" startIcon={<Download />}>
                Excel
              </Button>
              <Button onClick={exportToPDF} variant="contained" color="error" startIcon={<Download />}>
                PDF
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Loading State */}
        {loading && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Loading budget analysis data...</Typography>
          </Paper>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Error loading data</AlertTitle>
            {error}
          </Alert>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Total Budget</Typography>
                        <Typography variant="h5" fontWeight={700}>{formatCurrency(data.summary.totalBudget)}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                        <Calculate sx={{ color: 'primary.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Actual Spend</Typography>
                        <Typography variant="h5" fontWeight={700}>{formatCurrency(data.summary.totalActual)}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2 }}>
                        <Calculate sx={{ color: 'success.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Total Variance</Typography>
                        <Typography variant="h5" fontWeight={700} sx={{ color: getVarianceColor(data.summary.totalVariance) }}>
                          {formatCurrency(Math.abs(data.summary.totalVariance))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          {data.summary.totalActual > data.summary.totalBudget ? 'Over budget' : 'Under budget'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: data.summary.totalActual > data.summary.totalBudget ? 'error.lighter' : 'success.lighter', borderRadius: 2 }}>
                        {data.summary.totalActual > data.summary.totalBudget ?
                          <TrendingUp sx={{ color: 'error.main' }} /> :
                          <TrendingDown sx={{ color: 'success.main' }} />
                        }
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Projects at Risk</Typography>
                        <Typography variant="h5" fontWeight={700}>{data.summary.projectsAtRisk}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          of {data.summary.totalProjects} total
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                        <Warning sx={{ color: 'warning.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Performance Indices */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Cost Performance Index (CPI)</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h3" fontWeight={700}>{data.summary.averageCPI.toFixed(2)}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {data.summary.averageCPI >= 1.0 ? 'Under budget' : 'Over budget'}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: data.summary.averageCPI >= 1.0 ? 'success.lighter' : 'error.lighter'
                    }}>
                      <Typography variant="h4" fontWeight={700} sx={{ color: data.summary.averageCPI >= 1.0 ? 'success.main' : 'error.main' }}>
                        {data.summary.averageCPI >= 1.0 ? '✓' : '!'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    CPI &gt;= 1.0 indicates project is under budget
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Schedule Performance Index (SPI)</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h3" fontWeight={700}>{data.summary.averageSPI.toFixed(2)}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {data.summary.averageSPI >= 1.0 ? 'Ahead of schedule' : 'Behind schedule'}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: data.summary.averageSPI >= 1.0 ? 'success.lighter' : 'warning.lighter'
                    }}>
                      <Typography variant="h4" fontWeight={700} sx={{ color: data.summary.averageSPI >= 1.0 ? 'success.main' : 'warning.main' }}>
                        {data.summary.averageSPI >= 1.0 ? '✓' : '⚠'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    SPI &gt;= 1.0 indicates project is ahead of schedule
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Project Details Table */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Project Budget Analysis</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Budget</TableCell>
                      <TableCell>Actual</TableCell>
                      <TableCell>Variance</TableCell>
                      <TableCell>CPI / SPI</TableCell>
                      <TableCell>Completion</TableCell>
                      <TableCell>Risk Level</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.projects.slice(0, 10).map((project) => (
                      <TableRow key={project.projectId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{project.projectName}</Typography>
                          <Typography variant="caption" color="text.secondary">{project.divisionName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(project.revisedBudget)}</Typography>
                          {project.originalBudget !== project.revisedBudget && (
                            <Typography variant="caption" color="text.secondary">
                              Original: {formatCurrency(project.originalBudget)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(project.actualSpend)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Util: {formatPercentage(project.budgetUtilization)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ color: getVarianceColor(project.variancePercentage) }}>
                            {formatCurrency(Math.abs(project.varianceAmount))}
                          </Typography>
                          <Typography variant="caption" sx={{ color: getVarianceColor(project.variancePercentage) }}>
                            {formatPercentage(Math.abs(project.variancePercentage))}
                            {project.variancePercentage > 0 ? ' over' : ' under'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">CPI: {project.costPerformanceIndex.toFixed(2)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            SPI: {project.schedulePerformanceIndex.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatPercentage(project.timeline.percentComplete)}</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={project.timeline.percentComplete}
                            sx={{ mt: 0.5, height: 8, borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${project.riskLevel.charAt(0).toUpperCase() + project.riskLevel.slice(1)} Risk`}
                            color={getRiskColor(project.riskLevel) as 'error' | 'warning' | 'success'}
                            size="small"
                          />
                          {project.alerts.length > 0 && (
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Warning sx={{ width: 16, height: 16, color: project.alerts[0].severity === 'critical' ? 'error.main' : 'warning.main' }} />
                              <Typography variant="caption" color="text.secondary">{project.alerts[0].type}</Typography>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Division Summary & Forecast */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Division Performance</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.divisionSummary.map((division, index) => (
                      <Box key={index} sx={{ borderBottom: index < data.divisionSummary.length - 1 ? 1 : 0, borderColor: 'divider', pb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Typography variant="body1" fontWeight={500}>{division.divisionName}</Typography>
                            <Typography variant="body2" color="text.secondary">{division.projectCount} projects</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="body1" fontWeight={600}>{formatCurrency(division.totalActual)}</Typography>
                            <Typography variant="body2" color="text.secondary">of {formatCurrency(division.totalBudget)}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ color: getVarianceColor(division.variancePercentage) }}>
                            Variance: {formatCurrency(Math.abs(division.variance))} ({formatPercentage(Math.abs(division.variancePercentage))})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            CPI: {division.averageCPI.toFixed(2)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (division.totalActual / division.totalBudget) * 100)}
                          color={division.variance > 0 ? 'error' : 'success'}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Forecast Analysis</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2, border: 1, borderColor: 'error.light' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body1" fontWeight={500} color="error.dark">Projected Overrun</Typography>
                          <Typography variant="body2" color="error.main">Based on current trends</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" fontWeight={700} color="error.dark">
                            {formatCurrency(data.forecastAnalysis.projectedOverrun)}
                          </Typography>
                          <Typography variant="body2" color="error.main">
                            {data.forecastAnalysis.confidenceLevel}% confidence
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body1" fontWeight={500} sx={{ mb: 1.5 }}>Key Risks</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {data.forecastAnalysis.keyRisks.slice(0, 3).map((risk, index) => (
                          <Box key={index} sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2, border: 1, borderColor: 'warning.light' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={500} color="warning.dark">{risk.risk}</Typography>
                                <Typography variant="caption" color="warning.main" sx={{ mt: 0.5 }}>{risk.mitigation}</Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={600} color="warning.dark" sx={{ ml: 1 }}>
                                {formatCurrency(risk.impact)}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Monthly Trends */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>Monthly Variance Trends</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell>Budget Spend</TableCell>
                      <TableCell>Actual Spend</TableCell>
                      <TableCell>Monthly Variance</TableCell>
                      <TableCell>Cumulative Variance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.monthlyTrends.map((trend, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{trend.month}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(trend.budgetSpend)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(trend.actualSpend)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ color: getVarianceColor(trend.variance) }}>
                            {formatCurrency(Math.abs(trend.variance))}
                            {trend.variance > 0 ? ' over' : ' under'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ color: getVarianceColor(trend.cumulativeVariance) }}>
                            {formatCurrency(Math.abs(trend.cumulativeVariance))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}
