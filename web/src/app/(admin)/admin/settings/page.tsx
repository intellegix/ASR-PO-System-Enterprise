'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box, Typography, Paper, TextField, Button, Switch, FormControlLabel,
  Alert, CircularProgress, Grid, Snackbar,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';

interface Setting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

interface SettingsForm {
  company_name: string;
  default_tax_rate: string;
  po_auto_approve_threshold: string;
  system_email_notifications: boolean;
  default_payment_terms: string;
  fiscal_year_start_month: string;
}

const DEFAULT_SETTINGS: SettingsForm = {
  company_name: 'All Surface Roofing',
  default_tax_rate: '8.00',
  po_auto_approve_threshold: '0',
  system_email_notifications: false,
  default_payment_terms: 'Net30',
  fiscal_year_start_month: '1',
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [formOverrides, setFormOverrides] = useState<Partial<SettingsForm>>({});

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const form = useMemo(() => {
    const baseForm = { ...DEFAULT_SETTINGS };
    for (const s of settings) {
      if (s.key in baseForm) {
        const val = s.value;
        if (s.key === 'system_email_notifications') {
          (baseForm as Record<string, unknown>)[s.key] = val === true || val === 'true';
        } else {
          (baseForm as Record<string, unknown>)[s.key] = String(val ?? '');
        }
      }
    }
    return { ...baseForm, ...formOverrides };
  }, [settings, formOverrides]);

  const setForm = (updater: (prev: SettingsForm) => SettingsForm) => {
    const updated = updater(form);
    setFormOverrides(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      const settingsArray = Object.entries(data).map(([key, value]) => ({
        key,
        value,
        description: getDescription(key),
      }));
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setFormOverrides({});
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to save settings', severity: 'error' });
    },
  });

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      company_name: 'Company display name used in headers and reports',
      default_tax_rate: 'Default sales tax rate for new POs (%)',
      po_auto_approve_threshold: 'PO amount below which auto-approval is enabled ($0 = disabled)',
      system_email_notifications: 'Enable system email notifications for PO approvals',
      default_payment_terms: 'Default payment terms for new POs',
      fiscal_year_start_month: 'Starting month of fiscal year (1=Jan, 7=Jul)',
    };
    return descriptions[key] || '';
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Settings">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Settings">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>System Settings</Typography>
            <Typography variant="body2" color="text.secondary">Configure application-wide settings</Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save All'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Company Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Company</Typography>
            <TextField
              fullWidth
              label="Company Name"
              value={form.company_name}
              onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))}
              helperText="Displayed in headers, reports, and PO documents"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Default Payment Terms"
              value={form.default_payment_terms}
              onChange={(e) => setForm(prev => ({ ...prev, default_payment_terms: e.target.value }))}
              helperText="Default terms for new purchase orders"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Fiscal Year Start Month"
              type="number"
              value={form.fiscal_year_start_month}
              onChange={(e) => setForm(prev => ({ ...prev, fiscal_year_start_month: e.target.value }))}
              helperText="1 = January, 7 = July"
              slotProps={{ htmlInput: { min: 1, max: 12 } }}
            />
          </Paper>
        </Grid>

        {/* Financial Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Financial</Typography>
            <TextField
              fullWidth
              label="Default Tax Rate (%)"
              type="number"
              value={form.default_tax_rate}
              onChange={(e) => setForm(prev => ({ ...prev, default_tax_rate: e.target.value }))}
              helperText="Applied to taxable line items on new POs"
              slotProps={{ htmlInput: { step: 0.01, min: 0, max: 100 } }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Auto-Approve Threshold ($)"
              type="number"
              value={form.po_auto_approve_threshold}
              onChange={(e) => setForm(prev => ({ ...prev, po_auto_approve_threshold: e.target.value }))}
              helperText="POs below this amount skip approval. $0 = disabled"
              slotProps={{ htmlInput: { step: 100, min: 0 } }}
            />
          </Paper>
        </Grid>

        {/* Notification Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Notifications</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={form.system_email_notifications}
                  onChange={(e) => setForm(prev => ({ ...prev, system_email_notifications: e.target.checked }))}
                />
              }
              label="Email Notifications"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Send email alerts for PO approvals, rejections, and status changes
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
}
