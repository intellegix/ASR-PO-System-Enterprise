'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAdmin as checkIsAdmin } from '@/lib/auth/permissions';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import ApartmentIcon from '@mui/icons-material/Apartment';
import DeleteIcon from '@mui/icons-material/Delete';

interface Division {
  id: string;
  division_code: string;
  division_name: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  district_name: string | null;
  property_address: string | null;
  clark_rep: string | null;
  raken_uuid: string | null;
  last_synced_at: string | null;
  primary_division_id: string | null;
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function ProjectsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const userIsAdmin = checkIsAdmin(user?.role || '');

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await fetch('/api/divisions');
      if (!response.ok) throw new Error('Failed to fetch divisions');
      return response.json();
    },
    enabled: isAuthenticated && userIsAdmin,
  });

  const divisionAssignMutation = useMutation({
    mutationFn: async ({ projectId, divisionId }: { projectId: string; divisionId: string | null }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryDivisionId: divisionId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign division');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => {
      setSyncMessage({ type: 'error', text: error.message });
    },
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const response = await fetch('/api/raken/sync', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSyncMessage({
        type: 'success',
        text: `Raken sync complete: ${data.created} created, ${data.updated} updated out of ${data.synced} projects.`,
      });
    },
    onError: (error: Error) => {
      setSyncMessage({
        type: 'error',
        text: error.message || 'Failed to sync projects from Raken.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete project');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteTarget(null);
      setSyncMessage({
        type: 'success',
        text: `Project ${data.project_code} deleted successfully.`,
      });
    },
    onError: (error: Error) => {
      setDeleteTarget(null);
      setSyncMessage({
        type: 'error',
        text: error.message,
      });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const filteredProjects = projects.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.project_code || '').toLowerCase().includes(term) ||
      (p.project_name || '').toLowerCase().includes(term) ||
      (p.clark_rep || '').toLowerCase().includes(term)
    );
  });

  const formatSyncDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout pageTitle="Projects">
      <Box sx={{ maxWidth: '1280px', mx: 'auto' }}>
        {syncMessage && (
          <Alert
            severity={syncMessage.type}
            onClose={() => setSyncMessage(null)}
            sx={{ mb: 3 }}
          >
            {syncMessage.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              Projects
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          {userIsAdmin && (
            <Button
              variant="contained"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              startIcon={syncMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
            >
              {syncMutation.isPending ? 'Syncing...' : 'Sync from Raken'}
            </Button>
          )}
        </Box>

        <Card sx={{ p: 2, mb: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                Search
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Project code, name, or Clark rep..."
              />
            </Box>
            {search && (
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button onClick={() => setSearch('')} size="small" sx={{ textTransform: 'none' }}>
                  Clear filter
                </Button>
              </Box>
            )}
          </Box>
        </Card>

        <Card sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {projectsLoading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredProjects.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <ApartmentIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                No projects found
              </Typography>
              {search && (
                <Typography variant="body2" color="text.disabled">
                  Try adjusting your search terms.
                </Typography>
              )}
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell>Project Code</TableCell>
                        <TableCell>Project Name</TableCell>
                        {userIsAdmin && <TableCell>Division</TableCell>}
                        <TableCell>District</TableCell>
                        <TableCell>Clark Rep</TableCell>
                        <TableCell align="center">Raken Status</TableCell>
                        <TableCell>Address</TableCell>
                        {userIsAdmin && <TableCell align="center" sx={{ width: 80 }}>Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProjects.map((project) => (
                        <TableRow key={project.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
                            {project.project_code}
                          </TableCell>
                          <TableCell>{project.project_name || '-'}</TableCell>
                          {userIsAdmin && (
                            <TableCell>
                              <TextField
                                select
                                size="small"
                                value={project.primary_division_id || ''}
                                onChange={(e) => divisionAssignMutation.mutate({
                                  projectId: project.id,
                                  divisionId: e.target.value || null,
                                })}
                                sx={{ minWidth: 140 }}
                              >
                                <MenuItem value="">Unassigned</MenuItem>
                                {divisions.map((d) => (
                                  <MenuItem key={d.id} value={d.id}>{d.division_name}</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                          )}
                          <TableCell>{project.district_name || '-'}</TableCell>
                          <TableCell>{project.clark_rep || '-'}</TableCell>
                          <TableCell align="center">
                            {project.raken_uuid ? (
                              <Chip
                                icon={<CheckIcon />}
                                label={`Synced ${project.last_synced_at ? formatSyncDate(project.last_synced_at) : ''}`}
                                color="success"
                                size="small"
                              />
                            ) : (
                              <Chip label="Local Only" size="small" />
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {project.property_address || '-'}
                          </TableCell>
                          {userIsAdmin && (
                            <TableCell align="center">
                              {deleteTarget?.id === project.id ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Delete?</Typography>
                                  <Button
                                    size="small"
                                    onClick={() => deleteMutation.mutate(project.id)}
                                    disabled={deleteMutation.isPending}
                                    color="error"
                                    sx={{ minWidth: 'auto', textTransform: 'none' }}
                                  >
                                    {deleteMutation.isPending ? '...' : 'Yes'}
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => setDeleteTarget(null)}
                                    sx={{ minWidth: 'auto', textTransform: 'none' }}
                                  >
                                    No
                                  </Button>
                                </Box>
                              ) : (
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteTarget(project)}
                                  sx={{ color: 'action.disabled', '&:hover': { color: 'error.main' } }}
                                  title="Delete project"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {filteredProjects.map((project) => (
                  <Box
                    key={project.id}
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 'medium' }} color="text.primary">
                          {project.project_code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {project.project_name || '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {userIsAdmin && (
                          deleteTarget?.id === project.id ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">Delete?</Typography>
                              <Button
                                size="small"
                                onClick={() => deleteMutation.mutate(project.id)}
                                disabled={deleteMutation.isPending}
                                color="error"
                                sx={{ minWidth: 'auto', textTransform: 'none' }}
                              >
                                {deleteMutation.isPending ? '...' : 'Yes'}
                              </Button>
                              <Button
                                size="small"
                                onClick={() => setDeleteTarget(null)}
                                sx={{ minWidth: 'auto', textTransform: 'none' }}
                              >
                                No
                              </Button>
                            </Box>
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(project)}
                              sx={{ color: 'action.disabled', '&:hover': { color: 'error.main' } }}
                              title="Delete project"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )
                        )}
                        {project.raken_uuid ? (
                          <Chip icon={<CheckIcon />} label="Synced" color="success" size="small" />
                        ) : (
                          <Chip label="Local Only" size="small" />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.875rem' }}>
                      {userIsAdmin && (
                        <Box sx={{ gridColumn: '1 / -1', mb: 0.5 }}>
                          <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5 }}>Division</Typography>
                          <TextField
                            select
                            size="small"
                            fullWidth
                            value={project.primary_division_id || ''}
                            onChange={(e) => divisionAssignMutation.mutate({
                              projectId: project.id,
                              divisionId: e.target.value || null,
                            })}
                          >
                            <MenuItem value="">Unassigned</MenuItem>
                            {divisions.map((d) => (
                              <MenuItem key={d.id} value={d.id}>{d.division_name}</MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="caption" color="text.disabled">District</Typography>
                        <Typography variant="body2" color="text.secondary">{project.district_name || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.disabled">Clark Rep</Typography>
                        <Typography variant="body2" color="text.secondary">{project.clark_rep || '-'}</Typography>
                      </Box>
                    </Box>
                    {project.property_address && (
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.property_address}
                      </Typography>
                    )}
                    {project.raken_uuid && project.last_synced_at && (
                      <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                        Last synced: {formatSyncDate(project.last_synced_at)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Card>
      </Box>
    </AppLayout>
  );
}
