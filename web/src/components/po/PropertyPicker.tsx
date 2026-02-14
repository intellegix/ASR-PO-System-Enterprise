'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface Property {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface PropertyPickerProps {
  properties: Property[];
  loading: boolean;
  clientName: string;
  onSelect: (property: Property) => void;
  onSkip: () => void;
  onAddProperty: (name: string, address: string) => Promise<void>;
}

export default function PropertyPicker({
  properties,
  loading,
  clientName,
  onSelect,
  onSkip,
  onAddProperty,
}: PropertyPickerProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = properties.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(term) ||
      (p.property_address || '').toLowerCase().includes(term) ||
      (p.city || '').toLowerCase().includes(term)
    );
  });

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddProperty(newName.trim(), newAddress.trim());
      setShowAdd(false);
      setNewName('');
      setNewAddress('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Box data-testid="property-picker" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Pick Property
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a property for <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>{clientName}</Box>
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Search properties..."
        aria-label="Search properties"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} color="warning" />
        </Box>
      ) : (
        <>
          {filtered.length === 0 && !showAdd ? (
            <Paper sx={{ textAlign: 'center', py: 4, bgcolor: 'grey.50', border: 1, borderColor: 'grey.200' }}>
              <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                No properties found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Add a new property for this client
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 350, overflowY: 'auto' }}>
              {filtered.map((prop) => (
                <Button
                  key={prop.id}
                  onClick={() => onSelect(prop)}
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
                      {prop.property_name}
                    </Typography>
                    {prop.property_address && (
                      <Typography variant="body2" color="text.secondary">
                        {prop.property_address}
                      </Typography>
                    )}
                    {(prop.city || prop.state) && (
                      <Typography variant="body2" color="text.secondary">
                        {[prop.city, prop.state, prop.zip].filter(Boolean).join(', ')}
                      </Typography>
                    )}
                  </Box>
                </Button>
              ))}
            </Box>
          )}

          {/* Add new property inline */}
          {showAdd ? (
            <Paper sx={{ bgcolor: 'grey.50', border: 1, borderColor: 'grey.200', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  Property Name *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Main Office"
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  Address
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, San Diego, CA"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={() => { setShowAdd(false); setNewName(''); setNewAddress(''); }}
                  variant="outlined"
                  sx={{ px: 2, py: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!newName.trim() || adding}
                  variant="contained"
                  color="warning"
                  sx={{ px: 2, py: 1, fontWeight: 500 }}
                >
                  {adding ? 'Adding...' : 'Add & Select'}
                </Button>
              </Box>
            </Paper>
          ) : (
            <Button
              onClick={() => setShowAdd(true)}
              startIcon={<AddIcon />}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 500, color: 'warning.main' }}
            >
              Add New Property
            </Button>
          )}
        </>
      )}

      <Button
        data-testid="property-skip-btn"
        onClick={onSkip}
        sx={{ width: '100%', py: 1.5, color: 'text.secondary', textTransform: 'none', '&:hover': { color: 'text.primary' } }}
      >
        Skip — go directly to project selection
      </Button>
    </Box>
  );
}
