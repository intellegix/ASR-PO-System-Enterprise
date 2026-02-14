'use client';

import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  primary_trade: string | null;
}

interface WorkOrderPickerProps {
  workOrders: WorkOrder[];
  loading: boolean;
  onSelect: (workOrderId: string | null, createTitle?: string) => void;
}

export default function WorkOrderPicker({ workOrders, loading, onSelect }: WorkOrderPickerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onSelect(null, newTitle.trim());
  };

  return (
    <Box data-testid="wo-picker" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Pick or Create Work Order
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select an existing work order or create a new one
        </Typography>
      </Box>

      {/* Create New WO */}
      {!showCreate ? (
        <Button
          onClick={() => setShowCreate(true)}
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{
            py: 1.5,
            px: 2,
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'warning.light',
            color: 'warning.main',
            borderRadius: 3,
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'warning.lighter',
              borderColor: 'warning.main'
            }
          }}
        >
          Create New Work Order
        </Button>
      ) : (
        <Paper sx={{ p: 2, border: 1, borderColor: 'grey.200', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            New Work Order
          </Typography>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', mb: 0.5, display: 'block' }}>
              Title <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <TextField
              fullWidth
              placeholder="e.g., Material purchase for Phase 2"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              size="small"
              autoFocus
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => { setShowCreate(false); setNewTitle(''); }}
              variant="outlined"
              sx={{ flex: 1, py: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim()}
              variant="contained"
              color="warning"
              sx={{ flex: 1, py: 1, fontWeight: 500 }}
            >
              Create & Generate PO
            </Button>
          </Box>
        </Paper>
      )}

      {/* Existing Work Orders */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">Loading...</Typography>
        </Box>
      ) : workOrders.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
            Existing Work Orders
          </Typography>
          {workOrders.map((wo) => (
            <Button
              key={wo.id}
              onClick={() => onSelect(wo.id)}
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
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                  {wo.work_order_number}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {wo.title}
                </Typography>
                {wo.primary_trade && (
                  <Typography variant="body2" color="text.secondary">
                    {wo.primary_trade}
                  </Typography>
                )}
              </Box>
            </Button>
          ))}
        </Box>
      ) : (
        <Paper sx={{ textAlign: 'center', py: 3, bgcolor: 'grey.50', border: 1, borderColor: 'grey.200' }}>
          <Typography variant="body2" color="text.secondary">
            No work orders for this project yet
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Create one above, or one will be auto-created
          </Typography>
        </Paper>
      )}

      {/* Skip / Auto-create option */}
      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'grey.200' }}>
        <Button
          onClick={() => onSelect(null)}
          fullWidth
          sx={{ py: 1.5, color: 'text.secondary', textTransform: 'none', '&:hover': { color: 'text.primary' } }}
        >
          Skip - Auto-create work order
        </Button>
      </Box>
    </Box>
  );
}
