'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PONumberDisplay } from '@/components/mui';
import { Box, Button, Paper, Typography, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface POGeneratedConfirmationProps {
  poId: string;
  poNumber: string;
  divisionName: string;
  projectName: string;
  workOrderNumber: string;
  clientName?: string;
  propertyName?: string;
}

export default function POGeneratedConfirmation({
  poId,
  poNumber,
  divisionName,
  projectName,
  workOrderNumber,
  clientName,
  propertyName,
}: POGeneratedConfirmationProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(poNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = poNumber;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box data-testid="po-confirmation" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 4, px: 2 }}>
      {/* Success check animation */}
      <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: 'success.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircleIcon sx={{ width: 40, height: 40, color: 'success.main' }} />
      </Box>

      {/* PO Number - large & prominent with color coding */}
      <Box data-testid="po-number-display" sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          PO Number
        </Typography>
        <PONumberDisplay poNumber={poNumber} fontSize="2.25rem" showTooltip={false} />
      </Box>

      {/* Copy button */}
      <Button
        onClick={handleCopy}
        variant="contained"
        color={copied ? 'success' : 'inherit'}
        startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
        sx={{
          px: 3,
          py: 1.5,
          borderRadius: 3,
          fontSize: '1.125rem',
          bgcolor: copied ? 'success.light' : 'grey.100',
          color: copied ? 'success.dark' : 'text.primary',
          '&:hover': {
            bgcolor: copied ? 'success.main' : 'grey.200'
          }
        }}
      >
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </Button>

      {/* Summary card */}
      <Paper sx={{ width: '100%', maxWidth: 420, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {clientName && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
            <Typography variant="body2" color="text.secondary">Client</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {clientName}
            </Typography>
          </Box>
        )}
        {propertyName && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
            <Typography variant="body2" color="text.secondary">Property</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {propertyName}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
          <Typography variant="body2" color="text.secondary">Division</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{divisionName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
          <Typography variant="body2" color="text.secondary">Project</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">Work Order</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{workOrderNumber}</Typography>
        </Box>
      </Paper>

      {/* Status note */}
      <Alert severity="warning" sx={{ maxWidth: 420, width: '100%' }}>
        This PO is <Box component="span" sx={{ fontWeight: 600 }}>incomplete</Box>. Add vendor and line items when the invoice arrives.
      </Alert>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, width: '100%', maxWidth: 420 }}>
        <Button
          onClick={() => router.push('/po')}
          variant="outlined"
          sx={{ flex: 1, py: 1.5, px: 2, borderRadius: 3, fontWeight: 600 }}
        >
          Done
        </Button>
        <Button
          onClick={() => router.push(`/po/view?id=${poId}`)}
          variant="contained"
          color="warning"
          sx={{ flex: 1, py: 1.5, px: 2, borderRadius: 3, fontWeight: 600 }}
        >
          Add Details Now
        </Button>
      </Box>
    </Box>
  );
}
