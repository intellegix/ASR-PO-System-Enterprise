'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Paper,
  Alert,
  Grid,
  InputAdornment,
} from '@mui/material';

export default function CreateVendorInvoicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');

  useEffect(() => {
    document.title = 'Record Vendor Invoice | ASR PO System';
  }, []);

  const [form, setForm] = useState({
    invoiceNumber: '',
    vendorId: '',
    poId: '',
    projectId: '',
    divisionId: '',
    amount: '',
    taxAmount: '',
    totalAmount: '',
    dateReceived: new Date().toISOString().split('T')[0],
    dateDue: '',
    notes: '',
  });

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors');
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    },
  });

  // Fetch POs for selected vendor
  const { data: vendorPOs } = useQuery({
    queryKey: ['vendor-pos', selectedVendorId],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const res = await fetch(`/api/po?vendorId=${selectedVendorId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedVendorId,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });

  // Fetch divisions
  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const res = await fetch('/api/divisions');
      if (!res.ok) throw new Error('Failed to fetch divisions');
      return res.json();
    },
  });

  interface PurchaseOrder {
    id: string;
    project_id?: string | null;
    division_id?: string | null;
    subtotal_amount?: unknown;
    tax_amount?: unknown;
    total_amount?: unknown;
    status: string;
    po_number: string;
  }

  // Auto-populate from linked PO
  useEffect(() => {
    if (form.poId && vendorPOs) {
      const po = vendorPOs.find((p: PurchaseOrder) => p.id === form.poId);
      if (po) {
        setForm(prev => ({
          ...prev,
          projectId: po.project_id || prev.projectId,
          divisionId: po.division_id || prev.divisionId,
          amount: Number(po.subtotal_amount || 0).toFixed(2),
          taxAmount: Number(po.tax_amount || 0).toFixed(2),
          totalAmount: Number(po.total_amount || 0).toFixed(2),
        }));
      }
    }
  }, [form.poId, vendorPOs]);

  // Calculate total when amount/tax change
  useEffect(() => {
    const amt = parseFloat(form.amount) || 0;
    const tax = parseFloat(form.taxAmount) || 0;
    setForm(prev => ({ ...prev, totalAmount: (amt + tax).toFixed(2) }));
  }, [form.amount, form.taxAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/invoices/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      router.push('/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout pageTitle="Record Vendor Invoice">
      <Box sx={{ maxWidth: 768, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">Record a vendor invoice, optionally linked to a purchase order</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Vendor Selection */}
            <TextField
              select
              label="Vendor"
              value={form.vendorId}
              onChange={(e) => {
                setForm(prev => ({ ...prev, vendorId: e.target.value, poId: '' }));
                setSelectedVendorId(e.target.value);
              }}
              required
              fullWidth
            >
              <MenuItem value="">Select vendor...</MenuItem>
              {(Array.isArray(vendors) ? vendors : []).map((v: { id: string; vendor_name: string; vendor_code: string }) => (
                <MenuItem key={v.id} value={v.id}>{v.vendor_name} ({v.vendor_code})</MenuItem>
              ))}
            </TextField>

            {/* Link to PO (optional) */}
            {selectedVendorId && (
              <TextField
                select
                label="Link to Purchase Order (optional)"
                value={form.poId}
                onChange={(e) => setForm(prev => ({ ...prev, poId: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">No PO linked</MenuItem>
                {(Array.isArray(vendorPOs) ? vendorPOs : [])
                  .filter((po: PurchaseOrder) => ['Issued', 'Received', 'Approved'].includes(po.status))
                  .map((po: PurchaseOrder) => (
                    <MenuItem key={po.id} value={po.id}>
                      {po.po_number} - ${Number(po.total_amount).toLocaleString()} ({po.status})
                    </MenuItem>
                  ))}
              </TextField>
            )}

            {/* Invoice Number */}
            <TextField
              label="Vendor Invoice Number"
              value={form.invoiceNumber}
              onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              placeholder="e.g. INV-12345"
              required
              fullWidth
            />

            {/* Project & Division */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Project"
                  value={form.projectId}
                  onChange={(e) => setForm(prev => ({ ...prev, projectId: e.target.value }))}
                  fullWidth
                >
                  <MenuItem value="">Select project...</MenuItem>
                  {(Array.isArray(projects) ? projects : []).map((p: { id: string; project_code: string; project_name: string }) => (
                    <MenuItem key={p.id} value={p.id}>{p.project_code} - {p.project_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Division"
                  value={form.divisionId}
                  onChange={(e) => setForm(prev => ({ ...prev, divisionId: e.target.value }))}
                  fullWidth
                >
                  <MenuItem value="">Select division...</MenuItem>
                  {(Array.isArray(divisions) ? divisions : []).map((d: { id: string; division_name: string }) => (
                    <MenuItem key={d.id} value={d.id}>{d.division_name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Amounts */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  type="number"
                  label="Amount"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ step: '0.01', min: '0' }}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  type="number"
                  label="Tax"
                  value={form.taxAmount}
                  onChange={(e) => setForm(prev => ({ ...prev, taxAmount: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ step: '0.01', min: '0' }}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  type="number"
                  label="Total"
                  value={form.totalAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    readOnly: true,
                  }}
                  inputProps={{ step: '0.01' }}
                  sx={{ '& .MuiInputBase-root': { bgcolor: 'grey.50' } }}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Dates */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  type="date"
                  label="Date Received"
                  value={form.dateReceived}
                  onChange={(e) => setForm(prev => ({ ...prev, dateReceived: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  type="date"
                  label="Due Date"
                  value={form.dateDue}
                  onChange={(e) => setForm(prev => ({ ...prev, dateDue: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* Notes */}
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={3}
              placeholder="Optional notes..."
              fullWidth
            />

            {/* Submit */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                component={Link}
                href="/invoices"
                variant="outlined"
                color="inherit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{ bgcolor: 'orange.main', '&:hover': { bgcolor: 'orange.dark' } }}
              >
                {isSubmitting ? 'Saving...' : 'Record Invoice'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </AppLayout>
  );
}
