'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AccessTime as ClockIcon,
  Warning as AlertTriangleIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';

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
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<ApprovalBottleneckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    divisionId: '',
    approverId: '',
    minDays: '',
    minAmount: '',
    priority: '',
    stage: '',
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
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

      const normalized: ApprovalBottleneckData = {
        summary: {
          totalBottlenecks: result.summary?.totalPendingPOs ?? result.summary?.totalBottlenecks ?? 0,
          averageApprovalTime: result.summary?.averageApprovalTimeHours
            ? result.summary.averageApprovalTimeHours / 24
            : result.summary?.averageApprovalTime ?? 0,
          posOver24Hours: result.summary?.posOver24Hours ?? 0,
          posOver48Hours: result.summary?.posOver48Hours ?? 0,
          posOver7Days: result.summary?.posOver7Days ?? 0,
          totalValueStuck: result.summary?.totalPendingValue ?? result.summary?.totalValueStuck ?? 0,
          averageImpactScore: result.summary?.averageImpactScore ?? 50,
          criticalBottlenecks: result.summary?.criticalBottlenecks ?? 0,
        },
        bottlenecks: (result.pendingPOs || result.bottlenecks || []).map((po: Record<string, unknown>) => ({
          poId: po.poId ?? po.id ?? '',
          poNumber: po.poNumber ?? '',
          vendorName: po.vendorName ?? '',
          totalAmount: po.totalAmount ?? po.amount ?? 0,
          divisionName: po.divisionName ?? '',
          currentStage: po.currentStage ?? po.status ?? '',
          pendingSince: po.pendingSince ?? po.createdAt ?? new Date().toISOString(),
          daysInStage: po.daysInStage ?? po.daysPending ?? 0,
          totalDaysPending: po.totalDaysPending ?? po.daysPending ?? 0,
          approverName: po.approverName ?? po.currentApprover ?? '',
          approverEmail: po.approverEmail ?? '',
          priority: po.priority ?? 'medium',
          bottleneckReason: po.bottleneckReason ?? po.reason ?? '',
          escalationLevel: po.escalationLevel ?? 0,
          lastContactDate: po.lastContactDate ?? null,
          estimatedResolutionDate: po.estimatedResolutionDate ?? new Date().toISOString(),
          impactScore: po.impactScore ?? 50,
        })),
        approverPerformance: (result.approverAnalysis || result.approverPerformance || []).map((a: Record<string, unknown>) => {
          const approver = a.approver as Record<string, unknown> | undefined;
          const metrics = a.metrics as Record<string, unknown> | undefined;
          const performance = a.performance as Record<string, unknown> | undefined;
          const bottlenecks = a.bottlenecks as Record<string, unknown> | undefined;
          return {
            approverId: (approver?.id ?? a.approverId ?? '') as string,
            approverName: (approver?.name ?? a.approverName ?? '') as string,
            approverEmail: (approver?.email ?? a.approverEmail ?? '') as string,
            role: (approver?.role ?? a.role ?? '') as string,
            divisionName: (approver?.divisionName ?? a.divisionName ?? '') as string,
            totalPendingPOs: (metrics?.currentPendingCount ?? a.totalPendingPOs ?? 0) as number,
            averageApprovalTime: metrics?.averageApprovalTimeHours
              ? (metrics.averageApprovalTimeHours as number) / 24
              : (a.averageApprovalTime ?? 0) as number,
            longestPendingDays: (metrics?.longestPendingDays ?? a.longestPendingDays ?? 0) as number,
            performanceScore: (performance?.overallScore ?? a.performanceScore ?? 0) as number,
            bottleneckFrequency: (bottlenecks?.bottleneckPercentage ?? a.bottleneckFrequency ?? 0) as number,
            workload: (performance?.workloadAssessment ?? a.workload ?? 'moderate') as 'light' | 'moderate' | 'heavy' | 'overloaded',
            recommendations: Array.isArray(performance?.recommendations) ? performance.recommendations as string[]
              : Array.isArray(a.recommendations) ? a.recommendations as string[] : [],
          };
        }),
        stageAnalysis: (result.workflowMetrics?.stageAnalysis || result.stageAnalysis || []).map((s: Record<string, unknown>) => ({
          stage: (s.stage ?? s.stageName ?? '') as string,
          averageTime: s.averageTimeHours ? (s.averageTimeHours as number) / 24 : (s.averageTime ?? 0) as number,
          medianTime: s.medianTimeHours ? (s.medianTimeHours as number) / 24 : (s.medianTime ?? 0) as number,
          maxTime: s.maxTimeHours ? (s.maxTimeHours as number) / 24 : (s.maxTime ?? 0) as number,
          posInStage: (s.currentCount ?? s.posInStage ?? 0) as number,
          completionRate: (s.completionRate ?? 0) as number,
          bottleneckFrequency: (s.bottleneckFrequency ?? 0) as number,
          efficiency: (s.efficiency ?? 'good') as 'excellent' | 'good' | 'poor' | 'critical',
          recommendations: Array.isArray(s.recommendations) ? s.recommendations as string[] : [],
        })),
        trends: result.trends ?? {
          dailyBottlenecks: [],
          weeklyCompletion: [],
        },
        recommendations: Array.isArray(result.recommendations) ? result.recommendations.map((r: Record<string, unknown>) => ({
          category: r.category ?? '',
          priority: r.priority ?? 'medium',
          action: r.action ?? r.recommendation ?? '',
          expectedImpact: r.expectedImpact ?? r.impact ?? '',
          effort: r.effort ?? 'medium',
        })) : [],
      };

      setData(normalized);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch approval bottleneck data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
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
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
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
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchData]);

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

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'success' | 'default' => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'default';
      default: return 'success';
    }
  };

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'overloaded': return 'error.main';
      case 'heavy': return 'warning.main';
      case 'moderate': return 'info.main';
      default: return 'success.main';
    }
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'critical': return 'error.main';
      case 'poor': return 'warning.main';
      case 'good': return 'info.main';
      default: return 'success.main';
    }
  };

  const getPerformanceScore = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'success.main' };
    if (score >= 80) return { text: 'Good', color: 'info.main' };
    if (score >= 70) return { text: 'Fair', color: 'warning.main' };
    return { text: 'Poor', color: 'error.main' };
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <ClockIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography color="text.secondary">Please sign in to view approval bottleneck reports.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider', borderRadius: 0 }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  href="/reports"
                  startIcon={<ArrowBackIcon />}
                  sx={{ color: 'text.secondary' }}
                >
                  Back to Reports
                </Button>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ClockIcon sx={{ color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>Approval Bottleneck Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">Workflow efficiency and approval delays</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">Last updated: {lastRefresh.toLocaleTimeString()}</Typography>
                  <Typography variant="caption" color="text.disabled">Welcome, {user?.name?.split(' ')[0]}</Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">Auto-refresh</Typography>}
                />

                <Button
                  onClick={fetchData}
                  disabled={loading}
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
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
          <Typography variant="h6" fontWeight={600} mb={2}>Report Filters</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <FormControl fullWidth>
                <InputLabel>Division</InputLabel>
                <Select
                  value={filters.divisionId}
                  label="Division"
                  onChange={(e) => setFilters(prev => ({ ...prev, divisionId: e.target.value }))}
                >
                  <MenuItem value="">All Divisions</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <FormControl fullWidth>
                <InputLabel>Approver</InputLabel>
                <Select
                  value={filters.approverId}
                  label="Approver"
                  onChange={(e) => setFilters(prev => ({ ...prev, approverId: e.target.value }))}
                >
                  <MenuItem value="">All Approvers</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <FormControl fullWidth>
                <InputLabel>Min Days</InputLabel>
                <Select
                  value={filters.minDays}
                  label="Min Days"
                  onChange={(e) => setFilters(prev => ({ ...prev, minDays: e.target.value }))}
                >
                  <MenuItem value="">Any Time</MenuItem>
                  <MenuItem value="1">1+ days</MenuItem>
                  <MenuItem value="2">2+ days</MenuItem>
                  <MenuItem value="7">7+ days</MenuItem>
                  <MenuItem value="14">14+ days</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <TextField
                label="Min Amount"
                type="number"
                fullWidth
                placeholder="0"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  label="Priority"
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: 1.5 }}>
              <FormControl fullWidth>
                <InputLabel>Stage</InputLabel>
                <Select
                  value={filters.stage}
                  label="Stage"
                  onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
                >
                  <MenuItem value="">All Stages</MenuItem>
                  <MenuItem value="Division Leader Review">Division Leader Review</MenuItem>
                  <MenuItem value="Accounting Review">Accounting Review</MenuItem>
                  <MenuItem value="Final Approval">Final Approval</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Options */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" fontWeight={600} mb={0.5}>Export Options</Typography>
              <Typography variant="body2" color="text.secondary">Download approval bottleneck analysis in various formats</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                onClick={exportToExcel}
                variant="contained"
                color="success"
                startIcon={<DownloadIcon />}
              >
                Excel
              </Button>
              <Button
                onClick={exportToPDF}
                variant="contained"
                color="error"
                startIcon={<DownloadIcon />}
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
            <Typography color="text.secondary">Loading approval bottleneck data...</Typography>
          </Paper>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600}>Error loading data</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Total Bottlenecks</Typography>
                        <Typography variant="h5" fontWeight={700}>{data.summary.totalBottlenecks}</Typography>
                        <Typography variant="caption" color="text.secondary" mt={0.5}>
                          {data.summary.criticalBottlenecks} critical
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'error.lighter', borderRadius: 2 }}>
                        <AlertTriangleIcon sx={{ color: 'error.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Avg Approval Time</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatDays(data.summary.averageApprovalTime)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                        <ClockIcon sx={{ color: 'primary.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">POs Over 48hrs</Typography>
                        <Typography variant="h5" fontWeight={700}>{data.summary.posOver48Hours}</Typography>
                        <Typography variant="caption" color="text.secondary" mt={0.5}>
                          {data.summary.posOver7Days} over 7 days
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                        <AlertTriangleIcon sx={{ color: 'warning.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Value Stuck</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatCurrency(data.summary.totalValueStuck)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2 }}>
                        <MoneyIcon sx={{ color: 'success.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Current Bottlenecks Table */}
            <Paper sx={{ mb: 4 }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Current Approval Bottlenecks</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>PO Details</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Current Stage</TableCell>
                      <TableCell>Days Pending</TableCell>
                      <TableCell>Approver</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Bottleneck Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.bottlenecks.slice(0, 10).map((bottleneck) => (
                      <TableRow key={bottleneck.poId} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{bottleneck.poNumber}</Typography>
                            <Typography variant="caption" color="text.secondary">{bottleneck.vendorName}</Typography>
                            <Typography variant="caption" display="block" color="text.disabled">{bottleneck.divisionName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{formatCurrency(bottleneck.totalAmount)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Impact: {bottleneck.impactScore}/100
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{bottleneck.currentStage}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Since: {new Date(bottleneck.pendingSince).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {formatDays(bottleneck.totalDaysPending)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              In stage: {formatDays(bottleneck.daysInStage)}
                            </Typography>
                            {bottleneck.escalationLevel > 0 && (
                              <Typography variant="caption" display="block" color="error.main" mt={0.5}>
                                Escalation Level {bottleneck.escalationLevel}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{bottleneck.approverName}</Typography>
                            <Typography variant="caption" color="text.secondary">{bottleneck.approverEmail}</Typography>
                            {bottleneck.lastContactDate && (
                              <Typography variant="caption" display="block" color="text.disabled" mt={0.5}>
                                Last contact: {new Date(bottleneck.lastContactDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bottleneck.priority.charAt(0).toUpperCase() + bottleneck.priority.slice(1)}
                            color={getPriorityColor(bottleneck.priority)}
                            size="small"
                          />
                          <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                            ETA: {new Date(bottleneck.estimatedResolutionDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {bottleneck.bottleneckReason}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Approver Performance */}
            <Paper sx={{ mb: 4 }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Approver Performance Analysis</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Approver</TableCell>
                      <TableCell>Pending POs</TableCell>
                      <TableCell>Avg Approval Time</TableCell>
                      <TableCell>Longest Pending</TableCell>
                      <TableCell>Performance Score</TableCell>
                      <TableCell>Workload</TableCell>
                      <TableCell>Recommendations</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.approverPerformance.slice(0, 8).map((approver) => {
                      const performance = getPerformanceScore(approver.performanceScore);
                      return (
                        <TableRow key={approver.approverId} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{approver.approverName}</Typography>
                              <Typography variant="caption" color="text.secondary">{approver.role}</Typography>
                              <Typography variant="caption" display="block" color="text.disabled">{approver.divisionName}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {approver.totalPendingPOs}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDays(approver.averageApprovalTime)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} color={approver.longestPendingDays > 7 ? 'error.main' : 'text.primary'}>
                              {formatDays(approver.longestPendingDays)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={500} color={performance.color}>
                                {approver.performanceScore}
                              </Typography>
                              <Typography variant="caption" color={performance.color}>
                                {performance.text}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} color={getWorkloadColor(approver.workload)}>
                              {approver.workload.charAt(0).toUpperCase() + approver.workload.slice(1)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Bottlenecks: {approver.bottleneckFrequency}%
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ maxWidth: 250 }}>
                              {approver.recommendations.slice(0, 2).map((rec, index) => (
                                <Typography key={index} variant="caption" display="block" color="text.secondary" mb={0.5}>
                                  • {rec}
                                </Typography>
                              ))}
                              {approver.recommendations.length > 2 && (
                                <Typography variant="caption" color="text.disabled">
                                  +{approver.recommendations.length - 2} more
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Workflow Stage Analysis & Recommendations */}
            <Grid container spacing={4} mb={4}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} mb={3}>Workflow Stage Analysis</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.stageAnalysis.map((stage, index) => (
                      <Box key={index} sx={{ pb: 2, borderBottom: index < data.stageAnalysis.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={500}>{stage.stage}</Typography>
                            <Typography variant="body2" color="text.secondary">{stage.posInStage} POs currently</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="subtitle1" fontWeight={600} color={getEfficiencyColor(stage.efficiency)}>
                              {stage.efficiency.charAt(0).toUpperCase() + stage.efficiency.slice(1)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">{stage.completionRate}% completion</Typography>
                          </Box>
                        </Box>
                        <Grid container spacing={2} mb={1.5}>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="text.secondary">Avg:</Typography>
                            <Typography variant="body2" fontWeight={500} ml={1}>{formatDays(stage.averageTime)}</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="text.secondary">Median:</Typography>
                            <Typography variant="body2" fontWeight={500} ml={1}>{formatDays(stage.medianTime)}</Typography>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Typography variant="caption" color="text.secondary">Max:</Typography>
                            <Typography variant="body2" fontWeight={500} ml={1}>{formatDays(stage.maxTime)}</Typography>
                          </Grid>
                        </Grid>
                        <Box mt={1.5}>
                          <Typography variant="caption" color="text.secondary" mb={0.5}>
                            Bottleneck Frequency: {stage.bottleneckFrequency}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, stage.bottleneckFrequency)}
                            color={stage.bottleneckFrequency > 30 ? 'error' : stage.bottleneckFrequency > 15 ? 'warning' : 'success'}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={600} mb={3}>Process Improvement Recommendations</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.recommendations.slice(0, 6).map((rec, index) => (
                      <Alert
                        key={index}
                        severity={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={500}>{rec.category}</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip
                              label={rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                              size="small"
                              color={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}
                            />
                            <Chip
                              label={`${rec.effort} effort`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" mb={1}>{rec.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Expected Impact:</strong> {rec.expectedImpact}
                        </Typography>
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
