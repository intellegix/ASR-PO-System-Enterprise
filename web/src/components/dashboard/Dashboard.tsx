'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, isAdmin, type UserRole } from '@/lib/auth/permissions';
import AppLayout from '@/components/layout/AppLayout';
import KPIMetrics from './widgets/KPIMetrics';
import PendingApprovals from './widgets/PendingApprovals';
import DivisionPerformance from './widgets/DivisionPerformance';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';

interface SyncData {
  created: number;
  updated: number;
  errors?: unknown[];
}

export default function Dashboard() {
  const { user } = useAuth();

  const role = (user?.role || 'DIVISION_LEADER') as UserRole;
  const userDivisionId = user?.divisionId;
  const canViewAllDivisions = true;

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

  const userIsAdmin = isAdmin(role);

  return (
    <AppLayout pageTitle="Dashboard">
      {/* Welcome banner */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: 'white',
          mb: 3,
          borderRadius: 4,
        }}
      >
        <CardContent sx={{ p: { xs: 3, lg: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Welcome back, {user?.name?.split(' ')[0] || 'User'}!
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {user?.divisionName || 'All Divisions'} &bull; {getRoleDisplayName(role)}
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/po/create"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: 'white',
                color: '#ea580c',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              Create New PO
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Real-time KPI Metrics */}
      <Box sx={{ mb: 3 }}>
        <KPIMetrics
          divisionId={canViewAllDivisions ? undefined : userDivisionId || undefined}
          timeframe="current_month"
        />
      </Box>

      {/* Dashboard content grid */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PendingApprovals
            limit={8}
          />
        </Grid>

        {canViewAllDivisions && (
          <Grid size={{ xs: 12, md: 6 }}>
            <DivisionPerformance />
          </Grid>
        )}

        {!canViewAllDivisions && userDivisionId && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Division Activity
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Your division&apos;s recent activity
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <KPIMetrics
                    divisionId={userDivisionId}
                    timeframe="last_30_days"
                  />
                </Box>
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button
                    component={Link}
                    href="/reports"
                    color="primary"
                  >
                    View detailed reports
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Raken Sync Card - Admin only */}
      {userIsAdmin && (
        <Card sx={{ mt: 3 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SyncIcon sx={{ color: 'primary.main' }} />
                Raken Project Sync
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sync active contracts from Raken into the PO System
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              startIcon={syncMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            >
              {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </Button>
          </Box>
          <CardContent>
            {syncMutation.isSuccess && syncMutation.data && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Sync complete: {(syncMutation.data as SyncData).created} created, {(syncMutation.data as SyncData).updated} updated
                {(syncMutation.data as SyncData).errors && (syncMutation.data as SyncData).errors!.length > 0 && (
                  <Typography component="span" sx={{ color: 'warning.main' }}>
                    {' '}({(syncMutation.data as SyncData).errors!.length} errors)
                  </Typography>
                )}
              </Alert>
            )}
            {syncMutation.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Sync failed: {syncMutation.error instanceof Error ? syncMutation.error.message : 'Unknown error'}
              </Alert>
            )}
            <Grid container spacing={2} sx={{ textAlign: 'center' }}>
              <Grid size={{ xs: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{syncStatus?.syncedProjects ?? '\u2014'}</Typography>
                <Typography variant="caption" color="text.secondary">Raken Projects</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{syncStatus?.totalProjects ?? '\u2014'}</Typography>
                <Typography variant="caption" color="text.secondary">Total Projects</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {syncStatus?.lastSyncedAt
                    ? new Date(syncStatus.lastSyncedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </Typography>
                <Typography variant="caption" color="text.secondary">Last Synced</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
