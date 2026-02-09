'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, type UserRole } from '@/lib/auth/permissions';
import KPIMetrics from './widgets/KPIMetrics';
import PendingApprovals from './widgets/PendingApprovals';
import DivisionPerformance from './widgets/DivisionPerformance';

// Icons
interface IconProps {
  className?: string;
}

const MenuIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const PlusIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const DocumentIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClipboardIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const TruckIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const ChartIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ArchiveIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const XIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const BuildingIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = (user?.role || 'DIVISION_LEADER') as UserRole;

  // Get user's division for filtering
  const userDivisionId = user?.divisionId;
  const canViewAllDivisions = ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'ACCOUNTING'].includes(role);

  // Get pending approval count for sidebar badge
  const { data: pendingData } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const response = await fetch('/api/dashboards/pending-approvals?limit=1');
      if (!response.ok) return { summary: { total: 0 } };
      return response.json();
    },
    refetchInterval: 30 * 1000, // 30 seconds
    staleTime: 15 * 1000, // 15 seconds
  });

  const pendingCount = pendingData?.summary?.total || 0;

  // Raken sync status
  const queryClient = useQueryClient();
  const { data: syncStatus } = useQuery({
    queryKey: ['raken-sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/raken/sync');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/raken/sync', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || 'Sync failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raken-sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleSync = useCallback(() => {
    if (!syncMutation.isPending) {
      syncMutation.mutate();
    }
  }, [syncMutation]);

  const isAdmin = ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'MAJORITY_OWNER'].includes(role);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <DocumentIcon />
              </div>
              <div>
                <h1 className="font-bold text-white">ASR PO System</h1>
                <p className="text-xs text-slate-400">All Surface Roofing</p>
              </div>
            </div>
            <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
              <XIcon />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 text-white"
            >
              <ChartIcon />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/po"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <DocumentIcon />
              <span>Purchase Orders</span>
            </Link>
            <Link
              href="/approvals"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <CheckCircleIcon />
              <span>Approvals</span>
              {pendingCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
            <Link
              href="/work-orders"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ClipboardIcon />
              <span>Work Orders</span>
            </Link>
            <Link
              href="/vendors"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <TruckIcon />
              <span>Vendors</span>
            </Link>
            <Link
              href="/invoices"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <DocumentIcon />
              <span>Invoices</span>
            </Link>
            <Link
              href="/invoice-archive"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ArchiveIcon />
              <span>Invoice Archive</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <ChartIcon />
              <span>Reports</span>
            </Link>

            {/* Admin section */}
            {isAdmin && (
              <>
                <div className="mt-6 mb-2 px-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
                </div>
                <Link
                  href="/projects"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <BuildingIcon />
                  <span>Projects</span>
                </Link>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-slate-700">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <UserIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400">{getRoleDisplayName(role)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <LogoutIcon />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
              <MenuIcon />
            </button>
            <h1 className="font-semibold text-slate-900">Dashboard</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 lg:p-8 text-white mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
                <p className="text-orange-100">
                  {user?.divisionName || 'All Divisions'} &bull; {getRoleDisplayName(role)}
                </p>
              </div>
              <Link
                href="/po/create"
                className="inline-flex items-center justify-center gap-2 bg-white text-orange-600 font-semibold px-6 py-3 rounded-xl hover:bg-orange-50 transition"
              >
                <PlusIcon />
                <span>Create New PO</span>
              </Link>
            </div>
          </div>

          {/* Real-time KPI Metrics */}
          <KPIMetrics
            divisionId={canViewAllDivisions ? undefined : userDivisionId || undefined}
            timeframe="current_month"
            className="mb-6"
          />

          {/* Dashboard content grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pending Approvals Widget */}
            <PendingApprovals
              limit={8}
              className="lg:col-span-1"
            />

            {/* Division Performance (only for cross-division viewers) */}
            {canViewAllDivisions && (
              <DivisionPerformance className="lg:col-span-1" />
            )}

            {/* Recent Activity for single division users */}
            {!canViewAllDivisions && userDivisionId && (
              <div className="bg-white rounded-xl shadow-sm lg:col-span-1">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Division Activity</h3>
                  <p className="text-sm text-slate-500">Your division's recent activity</p>
                </div>
                <div className="p-6">
                  <KPIMetrics
                    divisionId={userDivisionId}
                    timeframe="last_30_days"
                    className="mb-4"
                  />
                  <div className="text-center mt-6">
                    <Link
                      href="/reports"
                      className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                    >
                      <span>View detailed reports</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Raken Sync Card - Admin only */}
          {isAdmin && (
            <div className="mt-6 bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <RefreshIcon className="w-5 h-5 text-orange-500" />
                    Raken Project Sync
                  </h3>
                  <p className="text-sm text-slate-500">
                    Sync active contracts from Raken into the PO System
                  </p>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                  className="inline-flex items-center gap-2 bg-orange-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <RefreshIcon className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              <div className="p-6">
                {syncMutation.isSuccess && syncMutation.data && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    Sync complete: {syncMutation.data.created} created, {syncMutation.data.updated} updated
                    {syncMutation.data.errors?.length > 0 && (
                      <span className="text-amber-600"> ({syncMutation.data.errors.length} errors)</span>
                    )}
                  </div>
                )}
                {syncMutation.isError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    Sync failed: {syncMutation.error instanceof Error ? syncMutation.error.message : 'Unknown error'}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{syncStatus?.syncedProjects ?? '—'}</p>
                    <p className="text-xs text-slate-500">Raken Projects</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{syncStatus?.totalProjects ?? '—'}</p>
                    <p className="text-xs text-slate-500">Total Projects</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {syncStatus?.lastSyncedAt
                        ? new Date(syncStatus.lastSyncedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </p>
                    <p className="text-xs text-slate-500">Last Synced</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
