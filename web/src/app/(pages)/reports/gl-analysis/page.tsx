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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  BarChart as ChartBarIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

interface GLSummaryData {
  totalSpend: number;
  cogsAmount: number;
  opexAmount: number;
  taxableAmount: number;
  nonTaxableAmount: number;
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    accountCount: number;
    topAccounts: Array<{
      accountNumber: string;
      accountName: string;
      amount: number;
    }>;
  }>;
  monthlyTrends: Array<{
    month: string;
    cogs: number;
    opex: number;
    total: number;
  }>;
  divisionBreakdown: Array<{
    divisionName: string;
    totalSpend: number;
    cogsAmount: number;
    opexAmount: number;
    topGLAccounts: Array<{
      accountNumber: string;
      accountName: string;
      amount: number;
    }>;
  }>;
  riskFactors: Array<{
    type: string;
    description: string;
    amount: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}

export default function GLAnalysisPage() {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<GLSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    divisionId: '',
    glAccountFilter: '',
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
      if (filters.glAccountFilter) params.set('glAccountFilter', filters.glAccountFilter);

      const response = await fetch(`/api/reports/gl-analysis?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      const totalCOGS = result.summary?.totalCOGSSpend ?? 0;
      const totalOpEx = result.summary?.totalOpExSpend ?? 0;
      const totalOther = result.summary?.totalOtherSpend ?? 0;
      const totalCC = result.summary?.totalCreditCardSpend ?? 0;
      const totalSpend = totalCOGS + totalOpEx + totalOther + totalCC;

      const categoryMap = new Map<string, { amount: number; accounts: Record<string, unknown>[] }>();
      (result.accountAnalysis || []).forEach((acct: Record<string, unknown>) => {
        const glAccount = acct.glAccount as Record<string, unknown> | undefined;
        const metrics = acct.metrics as Record<string, unknown> | undefined;
        const cat = (glAccount?.category ?? 'Other') as string;
        if (!categoryMap.has(cat)) categoryMap.set(cat, { amount: 0, accounts: [] });
        const entry = categoryMap.get(cat)!;
        entry.amount += (metrics?.totalAmount ?? 0) as number;
        entry.accounts.push(acct);
      });

      const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: totalSpend > 0 ? (data.amount / totalSpend) * 100 : 0,
        accountCount: data.accounts.length,
        topAccounts: data.accounts
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aMetrics = a.metrics as Record<string, unknown> | undefined;
            const bMetrics = b.metrics as Record<string, unknown> | undefined;
            return ((bMetrics?.totalAmount ?? 0) as number) - ((aMetrics?.totalAmount ?? 0) as number);
          })
          .slice(0, 3)
          .map((a: Record<string, unknown>) => {
            const glAccount = a.glAccount as Record<string, unknown> | undefined;
            const metrics = a.metrics as Record<string, unknown> | undefined;
            return {
              accountNumber: (glAccount?.number ?? '') as string,
              accountName: (glAccount?.name ?? '') as string,
              amount: (metrics?.totalAmount ?? 0) as number,
            };
          }),
      })).sort((a, b) => b.amount - a.amount);

      const divMap = new Map<string, { divisionName: string; totalSpend: number; cogs: number; opex: number; accounts: Array<Record<string, unknown> & { divAmount: number }> }>();
      (result.accountAnalysis || []).forEach((acct: Record<string, unknown>) => {
        const divisionBreakdownArray = acct.divisionBreakdown as Record<string, unknown>[] | undefined;
        const glAccount = acct.glAccount as Record<string, unknown> | undefined;
        (divisionBreakdownArray || []).forEach((div: Record<string, unknown>) => {
          const name = (div.divisionName ?? 'Unknown') as string;
          const totalAmount = (div.totalAmount ?? 0) as number;
          if (!divMap.has(name)) divMap.set(name, { divisionName: name, totalSpend: 0, cogs: 0, opex: 0, accounts: [] });
          const entry = divMap.get(name)!;
          entry.totalSpend += totalAmount;
          if (glAccount?.category === 'COGS') entry.cogs += totalAmount;
          if (glAccount?.category === 'OpEx') entry.opex += totalAmount;
          entry.accounts.push({ ...acct, divAmount: totalAmount });
        });
      });

      const divisionBreakdown = Array.from(divMap.values()).map(d => ({
        divisionName: d.divisionName,
        totalSpend: d.totalSpend,
        cogsAmount: d.cogs,
        opexAmount: d.opex,
        topGLAccounts: d.accounts
          .sort((a, b) => ((b.divAmount ?? 0) as number) - ((a.divAmount ?? 0) as number))
          .slice(0, 3)
          .map((a) => {
            const glAccount = a.glAccount as Record<string, unknown> | undefined;
            return {
              accountNumber: (glAccount?.number ?? '') as string,
              accountName: (glAccount?.name ?? '') as string,
              amount: (a.divAmount ?? 0) as number,
            };
          }),
      })).sort((a, b) => b.totalSpend - a.totalSpend);

      const taxableAmount = (result.accountAnalysis || []).reduce(
        (sum: number, a: Record<string, unknown>) => {
          const metrics = a.metrics as Record<string, unknown> | undefined;
          return sum + ((metrics?.taxableAmount ?? 0) as number);
        }, 0
      );
      const nonTaxableAmount = (result.accountAnalysis || []).reduce(
        (sum: number, a: Record<string, unknown>) => {
          const metrics = a.metrics as Record<string, unknown> | undefined;
          return sum + ((metrics?.nonTaxableAmount ?? 0) as number);
        }, 0
      );

      const normalized: GLSummaryData = {
        totalSpend,
        cogsAmount: totalCOGS,
        opexAmount: totalOpEx,
        taxableAmount,
        nonTaxableAmount,
        categories,
        monthlyTrends: (result.categoryTrends || []).map((t: Record<string, unknown>) => {
          const cogs = (t.cogs ?? 0) as number;
          const opex = (t.opex ?? 0) as number;
          const other = (t.other ?? 0) as number;
          return {
            month: (t.month ?? '') as string,
            cogs: cogs,
            opex: opex,
            total: cogs + opex + other,
          };
        }),
        divisionBreakdown,
        riskFactors: [],
      };

      setData(normalized);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch GL analysis data:', err);
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
      if (filters.glAccountFilter) params.set('glAccountFilter', filters.glAccountFilter);
      params.set('format', 'pdf');

      const response = await fetch(`/api/reports/gl-analysis?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gl-analysis-${filters.startDate}-to-${filters.endDate}.pdf`;
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
      if (filters.glAccountFilter) params.set('glAccountFilter', filters.glAccountFilter);
      params.set('format', 'excel');

      const response = await fetch(`/api/reports/gl-analysis?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gl-analysis-${filters.startDate}-to-${filters.endDate}.xlsx`;
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

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <ChartBarIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography color="text.secondary">Please sign in to view GL analysis reports.</Typography>
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
                  <ChartBarIcon sx={{ color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h5" fontWeight={700}>GL Account Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">Financial categorization and budget analysis</Typography>
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
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
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

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="GL Account Filter"
                fullWidth
                placeholder="Enter GL account number or name"
                value={filters.glAccountFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, glAccountFilter: e.target.value }))}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Export Options */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" fontWeight={600} mb={0.5}>Export Options</Typography>
              <Typography variant="body2" color="text.secondary">Download this report in various formats</Typography>
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
            <Typography color="text.secondary">Loading GL analysis data...</Typography>
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
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Total Spend</Typography>
                        <Typography variant="h5" fontWeight={700}>{formatCurrency(data.totalSpend)}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                        <ChartBarIcon sx={{ color: 'primary.main' }} />
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
                        <Typography variant="body2" fontWeight={500} color="text.secondary">COGS Amount</Typography>
                        <Typography variant="h5" fontWeight={700}>{formatCurrency(data.cogsAmount)}</Typography>
                        <Typography variant="caption" color="text.secondary" mt={0.5}>
                          {formatPercentage(data.totalSpend > 0 ? (data.cogsAmount / data.totalSpend) * 100 : 0)} of total
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 2 }}>
                        <MoneyIcon sx={{ color: 'success.main' }} />
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
                        <Typography variant="body2" fontWeight={500} color="text.secondary">OpEx Amount</Typography>
                        <Typography variant="h5" fontWeight={700}>{formatCurrency(data.opexAmount)}</Typography>
                        <Typography variant="caption" color="text.secondary" mt={0.5}>
                          {formatPercentage(data.totalSpend > 0 ? (data.opexAmount / data.totalSpend) * 100 : 0)} of total
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'secondary.lighter', borderRadius: 2 }}>
                        <BusinessIcon sx={{ color: 'secondary.main' }} />
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
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Taxable Amount</Typography>
                        <Typography variant="h5" fontWeight={700}>{formatCurrency(data.taxableAmount)}</Typography>
                        <Typography variant="caption" color="text.secondary" mt={0.5}>
                          {formatPercentage(data.totalSpend > 0 ? (data.taxableAmount / data.totalSpend) * 100 : 0)} of total
                        </Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'warning.lighter', borderRadius: 2 }}>
                        <ReceiptIcon sx={{ color: 'warning.main' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Category Breakdown */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight={600} mb={3}>Spend by GL Category</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.categories.map((category, index) => (
                  <Box key={index} sx={{ pb: 2, borderBottom: index < data.categories.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={500}>{category.category}</Typography>
                        <Typography variant="body2" color="text.secondary">{category.accountCount} accounts</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" fontWeight={600}>{formatCurrency(category.amount)}</Typography>
                        <Typography variant="body2" color="text.secondary">{formatPercentage(category.percentage)}</Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, category.percentage)}
                      sx={{ height: 8, borderRadius: 1, mb: 1.5 }}
                    />
                    {category.topAccounts.length > 0 && (
                      <Grid container spacing={1}>
                        {category.topAccounts.slice(0, 3).map((account, accountIndex) => (
                          <Grid key={accountIndex} size={{ xs: 12, md: 4 }}>
                            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                              <Typography variant="caption" fontWeight={500}>{account.accountNumber}</Typography>
                              <Typography variant="caption" display="block" noWrap color="text.secondary">{account.accountName}</Typography>
                              <Typography variant="caption" fontWeight={600}>{formatCurrency(account.amount)}</Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Division Breakdown */}
            <Paper sx={{ mb: 4 }}>
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Division Breakdown</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Division</TableCell>
                      <TableCell>Total Spend</TableCell>
                      <TableCell>COGS</TableCell>
                      <TableCell>OpEx</TableCell>
                      <TableCell>Top GL Account</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.divisionBreakdown.map((division, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{division.divisionName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(division.totalSpend)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(division.cogsAmount)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(division.opexAmount)}</Typography>
                        </TableCell>
                        <TableCell>
                          {division.topGLAccounts[0] && (
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{division.topGLAccounts[0].accountNumber}</Typography>
                              <Typography variant="caption" color="text.secondary">{formatCurrency(division.topGLAccounts[0].amount)}</Typography>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Risk Factors */}
            {data.riskFactors.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Risk Factors</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data.riskFactors.map((risk, index) => (
                    <Alert
                      key={index}
                      severity={risk.riskLevel === 'high' ? 'error' : risk.riskLevel === 'medium' ? 'warning' : 'success'}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={500}>{risk.type}</Typography>
                          <Typography variant="body2">{risk.description}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" fontWeight={600}>{formatCurrency(risk.amount)}</Typography>
                          <Typography variant="caption" textTransform="uppercase">{risk.riskLevel} risk</Typography>
                        </Box>
                      </Box>
                    </Alert>
                  ))}
                </Box>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
