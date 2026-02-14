'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  district_name: string | null;
  primary_division_id: string | null;
}

interface ProjectPickerProps {
  projects: Project[];
  loading: boolean;
  onSelect: (project: Project) => void;
}

export default function ProjectPicker({ projects, loading, onSelect }: ProjectPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.project_name.toLowerCase().includes(term) ||
      p.project_code.toLowerCase().includes(term) ||
      (p.district_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <Box data-testid="project-picker" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Pick Project
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Which project is this purchase for?
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Search projects..."
        aria-label="Search projects"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} color="warning" />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', border: 1, borderColor: 'grey.200' }}>
          <SearchIcon sx={{ width: 40, height: 40, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {search ? 'Try a different search term' : 'No projects for this division'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map((project) => (
            <Button
              key={project.id}
              onClick={() => onSelect(project)}
              variant="outlined"
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                p: 2,
                borderRadius: 3,
                borderColor: 'grey.300',
                color: 'text.primary',
                textTransform: 'none',
                '&:hover': {
                  borderColor: 'warning.main',
                  bgcolor: 'warning.lighter'
                }
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {project.project_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {project.project_code}
                  {project.district_name ? ` • ${project.district_name}` : ''}
                </Typography>
              </Box>
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
}
