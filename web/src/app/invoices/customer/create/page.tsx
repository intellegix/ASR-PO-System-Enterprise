'use client';

import { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateCustomerInvoicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Create Customer Invoice | ASR PO System';
  }, []);

  const [form, setForm] = useState({
    clientId: '',
    projectId: '',
    divisionId: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    dateDue: '',
    notes: '',
    terms: 'Net30',
    status: 'Draft',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Fetch clients
  const { data: clientsList } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
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

  const dueDateManuallyEdited = useRef(false);

  useEffect(() => {
    if (dueDateManuallyEdited.current) return;
    const today = new Date();
    const termsDays: Record<string, number> = {
      Net10: 10, Net15: 15, Net30: 30, Net45: 45, Net60: 60, DueOnReceipt: 0,
    };
    const days = termsDays[form.terms];
    if (days !== undefined) {
      const due = new Date(today);
      due.setDate(due.getDate() + days);
      setForm(prev => ({ ...prev, dateDue: due.toISOString().split('T')[0] }));
    }
  }, [form.terms]);

  const addLineItem = () => {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = subtotal * 0.0775;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent, saveStatus: string = 'Draft') => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const validLineItems = lineItems.filter(item => item.description && item.quantity > 0 && item.unitPrice > 0);
      if (validLineItems.length === 0) {
        throw new Error('At least one line item with description, quantity, and price is required');
      }

      const res = await fetch('/api/invoices/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          status: saveStatus,
          lineItems: validLineItems,
        }),
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
    <AppLayout pageTitle="Create Customer Invoice">
      <Box sx={{ maxWidth: 1024, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">Generate an invoice for a project customer</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={(e) => handleSubmit(e, 'Draft')} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Customer Details */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Customer Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Project"
                    value={form.projectId}
                    onChange={(e) => setForm(prev => ({ ...prev, projectId: e.target.value }))}
                    required
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

              <TextField
                select
                label="Client (from master list)"
                value={form.clientId}
                onChange={(e) => {
                  const clientId = e.target.value;
                  setForm(prev => ({ ...prev, clientId }));
                  if (clientId) {
                    interface ClientData {
                      id: string;
                      client_name: string;
                      contact_email?: string | null;
                      address?: string | null;
                      category?: string | null;
                    }
                    const client = (Array.isArray(clientsList) ? clientsList : []).find((c: ClientData) => c.id === clientId);
                    if (client) {
                      setForm(prev => ({
                        ...prev,
                        clientId,
                        customerName: client.client_name,
                        customerEmail: client.contact_email || prev.customerEmail,
                        customerAddress: client.address || prev.customerAddress,
                      }));
                    }
                  }
                }}
                fullWidth
              >
                <MenuItem value="">Select client (optional)...</MenuItem>
                {(Array.isArray(clientsList) ? clientsList : []).map((c: { id: string; client_name: string; category?: string | null }) => (
                  <MenuItem key={c.id} value={c.id}>{c.client_name} {c.category ? `(${c.category})` : ''}</MenuItem>
                ))}
              </TextField>

              <TextField
                label="Customer Name"
                value={form.customerName}
                onChange={(e) => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Customer or company name"
                required
                fullWidth
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="email"
                    label="Customer Email"
                    value={form.customerEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="customer@example.com"
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Payment Terms"
                    value={form.terms}
                    onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                    fullWidth
                  >
                    <MenuItem value="Net10">Net 10</MenuItem>
                    <MenuItem value="Net15">Net 15</MenuItem>
                    <MenuItem value="Net30">Net 30</MenuItem>
                    <MenuItem value="Net45">Net 45</MenuItem>
                    <MenuItem value="Net60">Net 60</MenuItem>
                    <MenuItem value="DueOnReceipt">Due on Receipt</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                label="Customer Address"
                value={form.customerAddress}
                onChange={(e) => setForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                multiline
                rows={2}
                placeholder="Street, City, State, ZIP"
                fullWidth
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type="date"
                    label="Due Date"
                    value={form.dateDue}
                    onChange={(e) => {
                      dueDateManuallyEdited.current = true;
                      setForm(prev => ({ ...prev, dateDue: e.target.value }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Line Items */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Line Items</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addLineItem}
                size="small"
              >
                Add Line
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Header */}
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Description</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Qty</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Unit Price</Typography>
                </Grid>
                <Grid size={{ xs: 10, sm: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Amount</Typography>
                </Grid>
                <Grid size={{ xs: 2, sm: 1 }}></Grid>
              </Grid>

              {lineItems.map((item, index) => (
                <Grid container spacing={1.5} key={index} alignItems="center">
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Description of work/materials"
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      inputProps={{ step: '0.01', min: '0' }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      type="number"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      inputProps={{ step: '0.01', min: '0' }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 10, sm: 2 }}>
                    <Typography sx={{ fontWeight: 500, py: 1 }}>
                      ${(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 2, sm: 1 }}>
                    {lineItems.length > 1 && (
                      <IconButton
                        onClick={() => removeLineItem(index)}
                        size="small"
                        color="error"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              ))}
            </Box>

            {/* Totals */}
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="body2" color="text.secondary">Tax (7.75%)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                <Divider sx={{ width: { xs: '100%', sm: 300 } }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: { xs: '100%', sm: 300 } }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Total</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Notes */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Notes</Typography>
            <TextField
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={3}
              placeholder="Additional notes for the invoice..."
              fullWidth
            />
          </Paper>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
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
              color="inherit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e as React.FormEvent, 'Sent')}
              variant="contained"
              color="primary"
            >
              {isSubmitting ? 'Saving...' : 'Save & Mark as Sent'}
            </Button>
          </Box>
        </Box>
      </Box>
    </AppLayout>
  );
}
