'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box, Typography, Button, Grid, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, FormControlLabel,
  CircularProgress, Alert, Snackbar, Card, CardContent, CardActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';

interface Division {
  id: string;
  divisionName: string;
  divisionCode: string;
  qbClassName: string | null;
  costCenterPrefix: string | null;
  isActive: boolean;
  users: { id: string; name: string; role: string }[];
  leaders: { id: string; name: string; email: string }[];
  counts: { pos: number; workOrders: number; projects: number };
  createdAt: string;
}

interface EditForm {
  divisionName: string;
  qbClassName: string;
  costCenterPrefix: string;
  isActive: boolean;
}

export default function AdminDivisionsPage() {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ divisionName: '', qbClassName: '', costCenterPrefix: '', isActive: true });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const { data: divisions = [], isLoading } = useQuery<Division[]>({
    queryKey: ['admin-divisions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/divisions');
      if (!res.ok) throw new Error('Failed to fetch divisions');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditForm }) => {
      const res = await fetch('/api/admin/divisions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) throw new Error('Failed to update division');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-divisions'] });
      setEditDialog(false);
      setSnackbar({ open: true, message: 'Division updated', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update division', severity: 'error' });
    },
  });

  const handleEdit = (div: Division) => {
    setEditingDivision(div);
    setEditForm({
      divisionName: div.divisionName,
      qbClassName: div.qbClassName || '',
      costCenterPrefix: div.costCenterPrefix || '',
      isActive: div.isActive !== false,
    });
    setEditDialog(true);
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Divisions">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Division Management">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Division Management</Typography>
            <Typography variant="body2" color="text.secondary">{divisions.length} divisions</Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {divisions.map((div) => (
          <Grid key={div.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card elevation={0} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{div.divisionName}</Typography>
                    <Chip label={div.divisionCode} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                  <Chip
                    label={div.isActive !== false ? 'Active' : 'Inactive'}
                    size="small"
                    color={div.isActive !== false ? 'success' : 'error'}
                  />
                </Box>

                {div.qbClassName && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    QB Class: {div.qbClassName}
                  </Typography>
                )}

                {div.leaders.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Leaders</Typography>
                    {div.leaders.map(l => (
                      <Typography key={l.id} variant="body2">{l.name}</Typography>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{div.users.length} users</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DescriptionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{div.counts.pos} POs</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AssignmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{div.counts.workOrders} WOs</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FolderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{div.counts.projects} projects</Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(div)}>
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Division: {editingDivision?.divisionCode}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Division Name" value={editForm.divisionName} onChange={(e) => setEditForm(prev => ({ ...prev, divisionName: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="QB Class Name" value={editForm.qbClassName} onChange={(e) => setEditForm(prev => ({ ...prev, qbClassName: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Cost Center Prefix" value={editForm.costCenterPrefix} onChange={(e) => setEditForm(prev => ({ ...prev, costCenterPrefix: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={editForm.isActive} onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))} />}
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => editingDivision && updateMutation.mutate({ id: editingDivision.id, data: editForm })} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </AppLayout>
  );
}
