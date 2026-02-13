'use client';

import { Chip } from '@mui/material';

interface StatusChipProps {
  status: string;
  size?: 'small' | 'medium';
}

/**
 * PO status badge component with color-coded status mapping.
 * Maps PO statuses to Material-UI color variants.
 */
export const StatusChip = ({ status, size = 'small' }: StatusChipProps) => {
  const getStatusColor = (
    status: string
  ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'draft':
        return 'default';
      case 'submitted':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'issued':
        return 'secondary';
      case 'received':
        return 'info';
      case 'invoiced':
        return 'warning';
      case 'paid':
        return 'success';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  return <Chip label={status} color={getStatusColor(status)} size={size} />;
};
