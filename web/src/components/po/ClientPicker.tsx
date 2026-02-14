'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress } from '@mui/material';

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  aliases: string | null;
}

interface ClientPickerProps {
  clients: Client[];
  loading: boolean;
  onSelect: (client: Client) => void;
  onSkip: () => void;
}

export default function ClientPicker({ clients, loading, onSelect, onSkip }: ClientPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      c.client_name.toLowerCase().includes(term) ||
      c.client_code.toLowerCase().includes(term) ||
      (c.parent_entity || '').toLowerCase().includes(term) ||
      (c.aliases || '').toLowerCase().includes(term)
    );
  });

  return (
    <Box data-testid="client-picker" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Pick Client
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Which client is this purchase for?
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Search clients..."
        aria-label="Search clients"
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
          <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            No clients found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {search ? 'Try a different search term' : 'No active clients'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
          {filtered.map((client) => (
            <Button
              key={client.id}
              onClick={() => onSelect(client)}
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
                  {client.client_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {client.client_code}
                  {client.category ? ` • ${client.category}` : ''}
                  {client.parent_entity ? ` • ${client.parent_entity}` : ''}
                </Typography>
              </Box>
            </Button>
          ))}
        </Box>
      )}

      <Button
        data-testid="client-skip-btn"
        onClick={onSkip}
        sx={{ width: '100%', py: 1.5, color: 'text.secondary', textTransform: 'none', '&:hover': { color: 'text.primary' } }}
      >
        Skip — go directly to project selection
      </Button>
    </Box>
  );
}
