'use client';

import { Box, Tooltip, Typography } from '@mui/material';
import { parsePONumber, decodePONumber } from '@/lib/po-number';

interface PONumberDisplayProps {
  poNumber: string;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  /** Override font size directly (e.g., 'inherit', '2rem') */
  fontSize?: string;
}

// Color scheme for each PO number segment
const SEGMENT_COLORS = {
  leader: '#3b82f6',    // blue-500
  division: '#22c55e',  // green-500
  workOrder: '#a855f7', // purple-500
  sequence: '#f97316',  // orange-500
} as const;

/**
 * Color-coded PO number display.
 * Parses the PO number and colors each segment:
 *   Leader ID (blue) | Division Code (green) | WO Number (purple) | Sequence (orange)
 *
 * Falls back to plain text for invalid/unparseable PO numbers.
 */
export function PONumberDisplay({ poNumber, size = 'medium', showTooltip = true, fontSize: fontSizeOverride }: PONumberDisplayProps) {
  const parsed = parsePONumber(poNumber);

  const fontSize = fontSizeOverride || (size === 'small' ? '0.75rem' : size === 'large' ? '1rem' : '0.8125rem');
  const fontWeight = 600;

  // Fallback: plain monospace text
  if (!parsed) {
    return (
      <Typography
        component="span"
        sx={{ fontFamily: 'monospace', fontSize, fontWeight, color: 'text.primary' }}
      >
        {poNumber}
      </Typography>
    );
  }

  const decoded = decodePONumber(poNumber);
  const woNum = String(parsed.workOrderNumber).padStart(4, '0');

  const coloredDisplay = (
    <Box component="span" sx={{ fontFamily: 'monospace', fontSize, fontWeight, display: 'inline-flex', alignItems: 'center' }}>
      <Box component="span" sx={{ color: SEGMENT_COLORS.leader }}>{parsed.leaderId}</Box>
      <Box component="span" sx={{ color: SEGMENT_COLORS.division }}>{parsed.divisionCode}</Box>
      <Box component="span" sx={{ color: SEGMENT_COLORS.workOrder }}>{woNum}</Box>
      <Box component="span" sx={{ color: 'text.secondary' }}>-</Box>
      <Box component="span" sx={{ color: SEGMENT_COLORS.sequence }}>{parsed.purchaseSequence}</Box>
    </Box>
  );

  if (showTooltip && decoded) {
    return (
      <Tooltip title={decoded} arrow placement="top">
        {coloredDisplay}
      </Tooltip>
    );
  }

  return coloredDisplay;
}
