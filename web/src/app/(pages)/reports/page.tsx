'use client';

// Force dynamic rendering since this page requires authentication
export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, type UserRole as AuthUserRole } from '@/lib/auth/permissions';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

// Icons
interface IconProps {
  className?: string;
}

const ChartBarIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TruckIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const CurrencyIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const ClockIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalculatorIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<IconProps>;
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
    icon: DocumentIcon,
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
    icon: ChartBarIcon,
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
    icon: CalculatorIcon,
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
    icon: TruckIcon,
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
    icon: CurrencyIcon,
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
    icon: ClockIcon,
    path: '/reports/approval-bottleneck',
    features: [
      'Approver performance scoring',
      'Workflow efficiency analysis',
      'Pending PO prioritization',
      'Bottleneck identification',
      'Process improvement recommendations'
    ],
    requiredRole: ['MAJORITY_OWNER', 'DIVISION_LEADER', 'ACCOUNTING'],
    color: 'text-red-600',
    bgGradient: 'from-red-50 to-red-100',
  },
];

type UserRole = 'MAJORITY_OWNER' | 'DIVISION_LEADER' | 'OPERATIONS_MANAGER' | 'ACCOUNTING';

export default function ReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    document.title = 'Reports | ASR PO System';
  }, []);

  const userRole = (user?.role || 'OPERATIONS_MANAGER') as UserRole;

  // Filter reports based on user permissions
  const availableReports = REPORT_TYPES.filter(report => {
    if (!report.requiredRole) return true;
    return report.requiredRole.includes(userRole);
  });

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
      <div className="bg-white border-b border-slate-200 -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Business Reports</h1>
                <p className="mt-2 text-slate-600">
                  Comprehensive analytics and insights for purchase order management
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Welcome back, {user?.name?.split(' ')[0]}</p>
                <p className="text-xs text-slate-400">
                  {user?.divisionName || 'All Divisions'} • {getRoleDisplayName(userRole as AuthUserRole)}
                </p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mt-6">
              <nav className="flex space-x-8">
                {categories.filter(c => c.count > 0 || c.id === 'all').map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition ${
                      selectedCategory === category.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedCategory === category.id
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {category.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map(report => {
            const IconComponent = report.icon;
            return (
              <Link
                key={report.id}
                href={report.path}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-slate-200 hover:border-orange-200 group block"
              >
                {/* Header with gradient background */}
                <div className={`p-6 bg-gradient-to-br ${report.bgGradient} rounded-t-xl`}>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg bg-white shadow-sm ${report.color}`}>
                      <IconComponent />
                    </div>
                    <ArrowRightIcon className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Features list */}
                <div className="p-6 pt-4">
                  <ul className="space-y-2">
                    {report.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {report.requiredRole && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Restricted Access
                        </span>
                        <span className="text-xs text-slate-500">
                          {report.requiredRole.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action footer */}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Click to generate report</span>
                    <div className="flex items-center space-x-1 text-orange-600 group-hover:text-orange-700 font-medium">
                      <span>View Report</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick access links */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/reports/po-summary?format=csv"
              className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-orange-50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                <DocumentIcon />
              </div>
              <div>
                <p className="font-medium text-slate-900">Quick CSV Export</p>
                <p className="text-sm text-slate-600">Download PO summary data</p>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-orange-50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                <ChartBarIcon />
              </div>
              <div>
                <p className="font-medium text-slate-900">Live Dashboard</p>
                <p className="text-sm text-slate-600">Real-time KPI metrics</p>
              </div>
            </Link>

            <Link
              href="/approvals"
              className="flex items-center space-x-3 p-4 rounded-lg bg-slate-50 hover:bg-orange-50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                <ClockIcon />
              </div>
              <div>
                <p className="font-medium text-slate-900">Pending Approvals</p>
                <p className="text-sm text-slate-600">Review awaiting items</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            All reports are generated in real-time and respect your role-based permissions.
            <br />
            For assistance, contact your system administrator.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}