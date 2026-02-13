'use client';

import { useState, useRef } from 'react';
import { Box, Button, Paper, Typography, Alert, CircularProgress } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

interface ScanResult {
  vendor: {
    name: string;
    matchedVendorId: string | null;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  taxAmount?: number;
  total: number;
  receiptDate?: string;
  receiptNumber?: string;
  receiptImageUrl?: string;
}

interface ReceiptScannerProps {
  poId: string;
  onScanComplete: (result: ScanResult) => void;
}

export default function ReceiptScanner({ poId, onScanComplete }: ReceiptScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selected.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('File is too large (max 10MB)');
      return;
    }

    setFile(selected);
    setError(null);

    // Generate preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/po/${poId}/scan-receipt`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result: ScanResult = await res.json();
        onScanComplete(result);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to scan receipt');
      }
    } catch (_error: unknown) {
      setError('Network error. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Paper sx={{ bgcolor: 'info.lighter', border: 1, borderColor: 'info.light', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CameraAltIcon sx={{ color: 'info.main', flexShrink: 0 }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'info.dark' }}>
            Scan Receipt with AI
          </Typography>
          <Typography variant="caption" sx={{ color: 'info.main' }}>
            Upload a photo of the receipt to auto-fill vendor and line items
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      )}

      {!preview ? (
        <Box
          component="label"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: 128,
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'info.light',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'rgba(33, 150, 243, 0.05)'
            }
          }}
        >
          <CloudUploadIcon sx={{ width: 32, height: 32, color: 'info.light', mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 500 }}>
            Tap to upload receipt photo
          </Typography>
          <Typography variant="caption" sx={{ color: 'info.light', mt: 0.5 }}>
            JPEG, PNG, or WebP (max 10MB)
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Preview */}
          <Box sx={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Receipt preview"
              style={{
                width: '100%',
                maxHeight: 192,
                objectFit: 'contain',
                borderRadius: 8,
                border: '1px solid #e3f2fd'
              }}
            />
            <Button
              onClick={handleClear}
              variant="contained"
              size="small"
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 24,
                width: 24,
                height: 24,
                borderRadius: '50%',
                p: 0,
                bgcolor: 'background.paper',
                color: 'text.secondary',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'background.paper',
                  color: 'error.main'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </Button>
          </Box>

          {/* Scan button */}
          <Button
            onClick={handleScan}
            disabled={scanning}
            variant="contained"
            color="info"
            fullWidth
            startIcon={scanning ? <CircularProgress size={16} color="inherit" /> : <LightbulbIcon />}
            sx={{ py: 1.5, fontWeight: 500 }}
          >
            {scanning ? 'Analyzing receipt with AI...' : 'Scan Receipt'}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
