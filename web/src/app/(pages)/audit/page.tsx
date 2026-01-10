'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AuditTrail from '@/components/audit/AuditTrail';

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DocumentSearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.5-4.5M21 21l-4.5-4.5" />
  </svg>
);

const UserCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function AuditPage() {
  const { data: session } = useSession();

  const user = session?.user;
  const userRole = user?.role || 'OPERATIONS_MANAGER';

  // Check if user has access to audit trail
  const canViewAudit = ['MAJORITY_OWNER', 'DIVISION_LEADER', 'ACCOUNTING'].includes(userRole);

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-slate-600">Please sign in to view the audit trail.</p>
        </div>
      </div>
    );
  }

  if (!canViewAudit) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-600 mb-4">
              You don't have permission to view the audit trail. This feature is available to:
            </p>
            <ul className="text-sm text-slate-500 space-y-1 mb-6">
              <li>• Majority Owners</li>
              <li>• Division Leaders</li>
              <li>• Accounting Team</li>
            </ul>
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <ArrowLeftIcon />
              <span>Return to Dashboard</span>
            </Link>
          </div>
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
                  href="/dashboard"
                  className="flex items-center space-x-2 text-slate-600 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeftIcon />
                  <span>Back to Dashboard</span>
                </Link>
                <div className="h-6 w-px bg-slate-300" />
                <div className="flex items-center space-x-3">
                  <ShieldCheckIcon className="text-orange-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">System Audit Trail</h1>
                    <p className="text-slate-600">Complete timeline of purchase order activities and system changes</p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">Welcome back, {user?.name?.split(' ')[0]}</p>
                <p className="text-xs text-slate-400">
                  {user?.divisionName || 'All Divisions'} • {userRole.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DocumentSearchIcon className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Audit Tracking</p>
                <p className="text-lg font-bold text-slate-900">Complete</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Every action is logged with full attribution
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheckIcon className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">User Attribution</p>
                <p className="text-lg font-bold text-slate-900">Verified</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              All actions tied to authenticated users
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClockIcon className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Timestamps</p>
                <p className="text-lg font-bold text-slate-900">Precise</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Down-to-the-second accuracy
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ShieldCheckIcon className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Compliance</p>
                <p className="text-lg font-bold text-slate-900">Ready</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Export-ready for audits
            </p>
          </div>
        </div>

        {/* Audit Trail Component */}
        <AuditTrail limit={100} />

        {/* Compliance Notice */}
        <div className="mt-8 bg-slate-100 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <ShieldCheckIcon className="text-slate-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Compliance & Security Notice</h3>
              <div className="text-sm text-slate-700 space-y-2">
                <p>
                  <strong>Data Retention:</strong> All audit trail entries are permanently retained for compliance purposes.
                  This data cannot be deleted or modified by users.
                </p>
                <p>
                  <strong>Access Control:</strong> Access to the audit trail is restricted to authorized personnel only.
                  All access attempts are logged and monitored.
                </p>
                <p>
                  <strong>IP Tracking:</strong> System actions are tracked with IP addresses and user agent information
                  for security auditing and forensic analysis.
                </p>
                <p>
                  <strong>Export Capabilities:</strong> Audit data can be exported for external compliance requirements,
                  regulatory audits, or forensic investigation purposes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/reports"
            className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all group"
          >
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-orange-100 transition-colors">
              <DocumentSearchIcon className="text-blue-600 group-hover:text-orange-600 transition-colors" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Business Reports</p>
              <p className="text-sm text-slate-600">View comprehensive business analytics</p>
            </div>
          </Link>

          <Link
            href="/approvals"
            className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all group"
          >
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-orange-100 transition-colors">
              <UserCheckIcon className="text-green-600 group-hover:text-orange-600 transition-colors" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Pending Approvals</p>
              <p className="text-sm text-slate-600">Review and approve purchase orders</p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-slate-200 hover:border-orange-200 hover:shadow-sm transition-all group"
          >
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-orange-100 transition-colors">
              <ClockIcon className="text-purple-600 group-hover:text-orange-600 transition-colors" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Live Dashboard</p>
              <p className="text-sm text-slate-600">Real-time system metrics and KPIs</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}