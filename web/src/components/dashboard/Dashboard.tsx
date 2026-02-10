'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, type UserRole } from '@/lib/auth/permissions';
import AppLayout from '@/components/layout/AppLayout';
import KPIMetrics from './widgets/KPIMetrics';
import PendingApprovals from './widgets/PendingApprovals';
import DivisionPerformance from './widgets/DivisionPerformance';

interface IconProps {
  className?: string;
}

const PlusIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const RefreshIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default function Dashboard() {
  const { user } = useAuth();

  const role = (user?.role || 'DIVISION_LEADER') as UserRole;
  const userDivisionId = user?.divisionId;
  const canViewAllDivisions = ['DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'ACCOUNTING'].includes(role);

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
    <AppLayout pageTitle="Dashboard">
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
        <PendingApprovals
          limit={8}
          className="lg:col-span-1"
        />

        {canViewAllDivisions && (
          <DivisionPerformance className="lg:col-span-1" />
        )}

        {!canViewAllDivisions && userDivisionId && (
          <div className="bg-white rounded-xl shadow-sm lg:col-span-1">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Division Activity</h3>
              <p className="text-sm text-slate-500">Your division&apos;s recent activity</p>
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
    </AppLayout>
  );
}
