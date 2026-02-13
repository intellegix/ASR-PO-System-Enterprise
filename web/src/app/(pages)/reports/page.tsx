'use client';

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, type UserRole as AuthUserRole } from '@/lib/auth/permissions';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

// MUI imports
import { Box, Typography, Button, Chip, Grid, Card, CardContent } from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalculateIcon from '@mui/icons-material/Calculate';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<SvgIconProps>;
  path: string;
  features: string[];
  requiredRole?: string[];
  color: string;
  bgGradient: string;
}

const REPORT_TYPES: ReportCard[] = [
  {
    id: 'po-summary',
    title: 'PO Summary by Division',
    description: 'Executive overview of purchasing activity and spending by division with vendor analysis and completion tracking.',
    icon: DescriptionIcon,
    path: '/reports/po-summary',
    features: [
      'Division-by-division spending breakdown',
      'Completion rates and processing times',
      'Top vendor analysis',
      '12-month spending trends',
      'CSV export capability'
    ],
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-blue-100',
  },
  {
    id: 'project-details',
    title: 'Project Details Report',
    description: 'Comprehensive project analysis with budget tracking, work order correlation, and cross-divisional visibility.',
    icon: BarChartIcon,
    path: '/reports/project-details',
    features: [
      'Budget vs actual analysis',
      'Spending by division breakdown',
      'Work order correlation tracking',
      'Timeline and performance metrics',
      'Project risk assessment'
    ],
    color: 'text-green-600',
    bgGradient: 'from-green-50 to-green-100',
  },
  {
    id: 'gl-analysis',
    title: 'GL Analysis Report',
    description: 'Financial categorization analysis with COGS vs OpEx breakdown and tax compliance tracking.',
    icon: CalculateIcon,
    path: '/reports/gl-analysis',
    features: [
      'COGS vs OpEx spending analysis',
      'Taxable vs non-taxable tracking',
      'GL account utilization metrics',
      'Monthly trend by category',
      'Division breakdown by GL account'
    ],
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-purple-100',
  },
  {
    id: 'vendor-analysis',
    title: 'Vendor Analysis Report',
    description: 'Vendor performance evaluation with quality scoring, payment terms analysis, and risk assessment.',
    icon: LocalShippingIcon,
    path: '/reports/vendor-analysis',
    features: [
      'Vendor performance scoring (0-100)',
      'Payment terms utilization analysis',
      'Quality and delivery tracking',
      'Risk assessment and concentration',
      'Industry breakdown by vendor type'
    ],
    color: 'text-orange-600',
    bgGradient: 'from-orange-50 to-orange-100',
  },
  {
    id: 'budget-actual',
    title: 'Budget vs Actual Report',
    description: 'Project budget variance analysis with forecasting, timeline alignment, and risk identification.',
    icon: AttachMoneyIcon,
    path: '/reports/budget-vs-actual',
    features: [
      'Budget variance and utilization tracking',
      'Timeline vs budget alignment analysis',
      'Work order budget integration',
      'Year-end spend forecasting',
      'Risk assessment and recommendations'
    ],
    color: 'text-emerald-600',
    bgGradient: 'from-emerald-50 to-emerald-100',
  },
  {
    id: 'approval-bottleneck',
    title: 'Approval Bottleneck Report',
    description: 'Workflow efficiency analysis with approver performance tracking and bottleneck identification.',
    icon: AccessTimeIcon,
    path: '/reports/approval-bottleneck',
    features: [
      'Approver performance scoring',
      'Workflow efficiency analysis',
      'Pending PO prioritization',
      'Bottleneck identification',
      'Process improvement recommendations'
    ],
    color: 'text-red-600',
    bgGradient: 'from-red-50 to-red-100',
  },
];

type UserRole = 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS' | 'MAJORITY_OWNER' | 'DIVISION_LEADER' | 'OPERATIONS_MANAGER' | 'ACCOUNTING';

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    document.title = 'Reports | ASR PO System';
  }, []);

  const _userRole = (user?.role || 'OPERATIONS_MANAGER') as UserRole;

  // All authenticated users can view all reports
  const availableReports = REPORT_TYPES;

  const categories = [
    { id: 'all', name: 'All Reports', count: availableReports.length },
    { id: 'financial', name: 'Financial', count: availableReports.filter(r => ['gl-analysis', 'budget-actual'].includes(r.id)).length },
    { id: 'operational', name: 'Operational', count: availableReports.filter(r => ['po-summary', 'project-details', 'vendor-analysis'].includes(r.id)).length },
    { id: 'workflow', name: 'Workflow', count: availableReports.filter(r => ['approval-bottleneck'].includes(r.id)).length },
  ];

  const filteredReports = selectedCategory === 'all' ? availableReports :
    availableReports.filter(report => {
      switch (selectedCategory) {
        case 'financial':
          return ['gl-analysis', 'budget-actual'].includes(report.id);
        case 'operational':
          return ['po-summary', 'project-details', 'vendor-analysis'].includes(report.id);
        case 'workflow':
          return ['approval-bottleneck'].includes(report.id);
        default:
          return true;
      }
    });

  return (
    <AppLayout pageTitle="Reports">
      {/* Header content */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', mx: { xs: -2, lg: -4 }, mt: { xs: -2, lg: -4 }, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Box sx={{ maxWidth: '1280px', mx: 'auto' }}>
          <Box sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h3" fontWeight="bold" color="text.primary">Business Reports</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Comprehensive analytics and insights for purchase order management
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">Welcome back, {user?.name?.split(' ')[0]}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {user?.divisionName || 'All Divisions'} • {getRoleDisplayName(_userRole as AuthUserRole)}
                </Typography>
              </Box>
            </Box>

            {/* Category Filter */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                {categories.filter(c => c.count > 0 || c.id === 'all').map(category => (
                  <Button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 1,
                      px: 0.5,
                      borderBottom: 2,
                      borderColor: selectedCategory === category.id ? 'primary.main' : 'transparent',
                      color: selectedCategory === category.id ? 'primary.main' : 'text.secondary',
                      fontWeight: 'medium',
                      fontSize: '0.875rem',
                      borderRadius: 0,
                      transition: 'all 0.2s',
                      '&:hover': {
                        color: 'text.primary',
                        borderColor: 'divider',
                        bgcolor: 'transparent',
                      }
                    }}
                  >
                    <span>{category.name}</span>
                    <Chip
                      label={category.count}
                      size="small"
                      sx={{
                        bgcolor: selectedCategory === category.id ? 'primary.lighter' : 'grey.100',
                        color: selectedCategory === category.id ? 'primary.dark' : 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 'medium',
                      }}
                    />
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Report Cards */}
      <Box sx={{ maxWidth: '1280px', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
        <Grid container spacing={3}>
          {filteredReports.map(report => {
            const IconComponent = report.icon;
            return (
              <Grid key={report.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <Link href={report.path} style={{ textDecoration: 'none' }}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: 1,
                      borderColor: 'divider',
                      '&:hover': {
                        boxShadow: 4,
                        borderColor: 'primary.lighter',
                      }
                    }}
                  >
                    {/* Header with gradient background */}
                    <Box sx={{ p: 3, bgcolor: 'primary.lighter', borderRadius: '12px 12px 0 0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.paper', boxShadow: 1 }}>
                          <IconComponent sx={{ fontSize: 28, color: 'primary.main' }} />
                        </Box>
                        <ChevronRightIcon sx={{ color: 'text.disabled', transition: 'color 0.2s', '.MuiCard-root:hover &': { color: 'primary.main' } }} />
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" fontWeight="semibold" color="text.primary" sx={{ transition: 'color 0.2s', '.MuiCard-root:hover &': { color: 'primary.main' } }}>
                          {report.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                          {report.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Features list */}
                    <CardContent sx={{ p: 3, pt: 2, flexGrow: 1 }}>
                      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {report.features.map((feature, index) => (
                          <Box key={index} component="li" sx={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.875rem', color: 'text.secondary' }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', mt: 1, mr: 1.5, flexShrink: 0 }} />
                            <span>{feature}</span>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>

                    {/* Action footer */}
                    <Box sx={{ px: 3, pb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <Typography variant="body2" color="text.secondary">Click to generate report</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main', fontWeight: 'medium', transition: 'color 0.2s', '.MuiCard-root:hover &': { color: 'primary.dark' } }}>
                          <span>View Report</span>
                          <ChevronRightIcon sx={{ fontSize: 16 }} />
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                </Link>
              </Grid>
            );
          })}
        </Grid>

        {/* Quick access links */}
        <Card sx={{ mt: 6, border: 1, borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="semibold" color="text.primary" sx={{ mb: 2 }}>Quick Access</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Link href="/reports/po-summary?format=csv" style={{ textDecoration: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: 1.5, bgcolor: 'grey.50', transition: 'bgcolor 0.2s', '&:hover': { bgcolor: 'primary.lighter' } }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'info.lighter', color: 'info.main', transition: 'all 0.2s', '.MuiBox-root:hover &': { bgcolor: 'primary.lighter', color: 'primary.main' } }}>
                      <DescriptionIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">Quick CSV Export</Typography>
                      <Typography variant="caption" color="text.secondary">Download PO summary data</Typography>
                    </Box>
                  </Box>
                </Link>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: 1.5, bgcolor: 'grey.50', transition: 'bgcolor 0.2s', '&:hover': { bgcolor: 'primary.lighter' } }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'success.lighter', color: 'success.main', transition: 'all 0.2s', '.MuiBox-root:hover &': { bgcolor: 'primary.lighter', color: 'primary.main' } }}>
                      <BarChartIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">Live Dashboard</Typography>
                      <Typography variant="caption" color="text.secondary">Real-time KPI metrics</Typography>
                    </Box>
                  </Box>
                </Link>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Link href="/approvals" style={{ textDecoration: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: 1.5, bgcolor: 'grey.50', transition: 'bgcolor 0.2s', '&:hover': { bgcolor: 'primary.lighter' } }}>
                    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'warning.lighter', color: 'warning.main', transition: 'all 0.2s', '.MuiBox-root:hover &': { bgcolor: 'primary.lighter', color: 'primary.main' } }}>
                      <AccessTimeIcon />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">Pending Approvals</Typography>
                      <Typography variant="caption" color="text.secondary">Review awaiting items</Typography>
                    </Box>
                  </Box>
                </Link>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Footer info */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            All reports are generated in real-time and respect your role-based permissions.
            <br />
            For assistance, contact your system administrator.
          </Typography>
        </Box>
      </Box>
    </AppLayout>
  );
}
