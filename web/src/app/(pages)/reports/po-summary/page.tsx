'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  FilterList as FilterIcon,
  BarChart as ChartIcon,
  Warning as AlertIcon,
} from '@mui/icons-material';

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
  parameters: Record<string, unknown>;
  generatedAt: string;
  generatedBy: { userName: string; userRole: string };
}

function POSummaryReport() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

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

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await fetch('/api/divisions');
      if (!response.ok) throw new Error('Failed to fetch divisions');
      return response.json();
    },
  });

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
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false,
    staleTime: 2 * 60 * 1000,
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

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Please sign in to view reports.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider', borderRadius: 0 }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  href="/reports"
                  startIcon={<ArrowBackIcon />}
                  sx={{ color: 'text.secondary' }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Back to Reports</Box>
                </Button>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>PO Summary by Division</Typography>
                  <Typography variant="body2" color="text.secondary">Executive overview of purchasing activity and spending</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>

                <Button
                  onClick={() => handleExport('csv')}
                  variant="contained"
                  startIcon={<DownloadIcon />}
                >
                  Export CSV
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterIcon sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={600}>Report Filters</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Division</InputLabel>
                <Select
                  value={selectedDivision}
                  label="Division"
                  onChange={(e) => setSelectedDivision(e.target.value)}
                >
                  <MenuItem value="">All Divisions</MenuItem>
                  {divisions?.map((division: Record<string, unknown>) => (
                    <MenuItem key={division.id as string} value={division.id as string}>
                      {division.division_name as string} ({division.division_code as string})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">Auto-refresh</Typography>}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Loading State */}
        {isLoading && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Generating report...</Typography>
          </Paper>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AlertIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle2" fontWeight={600}>Error Loading Report</Typography>
            </Box>
            <Typography variant="body2">
              {error instanceof Error ? error.message : 'Failed to load report data'}
            </Typography>
          </Alert>
        )}

        {/* Report Data */}
        {reportData && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Total Divisions</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {reportData.summary.totalDivisions}
                        </Typography>
                      </Box>
                      <ChartIcon sx={{ color: 'primary.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Total Spend</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatCurrency(reportData.summary.grandTotalAmount)}
                        </Typography>
                      </Box>
                      <ChartIcon sx={{ color: 'success.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Total POs</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {reportData.summary.grandTotalPOCount.toLocaleString()}
                        </Typography>
                      </Box>
                      <ChartIcon sx={{ color: 'warning.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Avg PO Size</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatCurrency(reportData.summary.overallAveragePOSize)}
                        </Typography>
                      </Box>
                      <ChartIcon sx={{ color: 'secondary.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={500} color="text.secondary">Completion Rate</Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {formatPercent(reportData.summary.overallCompletionRate)}
                        </Typography>
                      </Box>
                      <ChartIcon sx={{ color: 'info.main' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Division Details Table */}
            <Paper>
              <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>Division Breakdown</Typography>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Division</TableCell>
                      <TableCell>Total Spend</TableCell>
                      <TableCell>PO Count</TableCell>
                      <TableCell>Avg PO Size</TableCell>
                      <TableCell>Processing Time</TableCell>
                      <TableCell>Completion Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.divisions.map((division) => (
                      <TableRow key={division.division.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {division.division.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Code: {division.division.code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{formatCurrency(division.metrics.totalAmount)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{division.metrics.totalPOCount.toLocaleString()}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatCurrency(division.metrics.averagePOSize)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{division.metrics.averageProcessingTime.toFixed(1)}h</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ flex: 1, mr: 2 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, division.metrics.completionRate)}
                                color="success"
                                sx={{ height: 8, borderRadius: 1 }}
                              />
                            </Box>
                            <Typography variant="body2">
                              {formatPercent(division.metrics.completionRate)}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Report Metadata */}
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Generated on {new Date(reportData.generatedAt).toLocaleString()} by {reportData.generatedBy.userName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Report ID: {reportData.reportType} | Role: {reportData.generatedBy.userRole}
                </Typography>
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Box>
  );
}

export default function POSummaryReportWrapper() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ width: 300 }}>
            <Skeleton variant="rectangular" height={32} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={16} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={16} />
          </Box>
        </Paper>
      </Box>
    }>
      <POSummaryReport />
    </Suspense>
  );
}
