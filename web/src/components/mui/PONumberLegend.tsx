'use client';

import { useState } from 'react';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';

const LEGEND_ITEMS = [
  { label: 'Leader ID', color: '#3b82f6', example: '01' },
  { label: 'Division', color: '#22c55e', example: 'CP' },
  { label: 'Work Order', color: '#a855f7', example: '0012' },
  { label: 'Sequence', color: '#f97316', example: '1' },
] as const;

/**
 * Collapsible legend explaining PO number color-coding.
 * Shows a small info icon that expands to reveal the color key.
 */
export function PONumberLegend() {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <IconButton size="small" onClick={() => setOpen(!open)} sx={{ p: 0.5 }}>
        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </IconButton>
      <Collapse in={open} orientation="horizontal">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 0.5,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {LEGEND_ITEMS.map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {item.label}
              </Typography>
            </Box>
          ))}
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Collapse>
    </Box>
  );
}
