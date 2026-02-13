'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Alert, CircularProgress, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  divisionId: string | null;
  divisionName: string | null;
  divisionCode: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Division {
  id: string;
  division_name: string;
  division_code: string;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  divisionId: string;
  password: string;
  isActive: boolean;
}

const emptyForm: UserFormData = {
  email: '', firstName: '', lastName: '', phone: '', role: 'USER', divisionId: '', password: '', isActive: true,
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: async () => {
      const res = await fetch('/api/divisions');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleOpen = (user?: User) => {
    setError('');
    if (user) {
      setEditingUser(user);
      setForm({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        role: user.role,
        divisionId: user.divisionId || '',
        password: '',
        isActive: user.isActive !== false,
      });
    } else {
      setEditingUser(null);
      setForm(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('First name, last name, and email are required');
      return;
    }
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AppLayout pageTitle="User Management">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>User Management</Typography>
          <Typography variant="body2" color="text.secondary">{users.length} total users</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add User
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Division</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Login</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.firstName} {u.lastName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      size="small"
                      color={u.role === 'ADMIN' ? 'warning' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>{u.divisionName || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive !== false ? 'Active' : 'Inactive'}
                      size="small"
                      color={u.isActive !== false ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(u.lastLoginAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpen(u)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="First Name" value={form.firstName} onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Last Name" value={form.lastName} onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))} required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} required disabled={!!editingUser} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={form.role} label="Role" onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}>
                  <MenuItem value="USER">User</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Division</InputLabel>
                <Select value={form.divisionId} label="Division" onChange={(e) => setForm(prev => ({ ...prev, divisionId: e.target.value }))}>
                  <MenuItem value="">None</MenuItem>
                  {divisions.map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.division_name} ({d.division_code})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label={editingUser ? 'New Password (leave empty to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} />
            </Grid>
            {editingUser && (
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={form.isActive} onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))} />}
                  label="Active"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) ? <CircularProgress size={20} /> : editingUser ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
