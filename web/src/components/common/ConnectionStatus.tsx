'use client';

import { useState, useEffect } from 'react';
import { checkBackendHealth } from '@/lib/api-client';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkConnection = async () => {
    try {
      const healthy = await checkBackendHealth();
      setIsConnected(healthy);
      setLastCheck(new Date());
    } catch (_error) {
      setIsConnected(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    // Initial check
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }} className={className}>
        <CircleIcon
          sx={{
            width: 8,
            height: 8,
            mr: 1,
            color: 'grey.400',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        />
        <Typography variant="body2">Checking backend...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }} className={className}>
      <CircleIcon
        sx={{
          width: 8,
          height: 8,
          mr: 1,
          color: isConnected ? 'success.main' : 'error.main',
        }}
      />
      <Typography
        variant="body2"
        sx={{ color: isConnected ? 'success.main' : 'error.main' }}
      >
        {isConnected ? 'Backend Connected' : 'Backend Offline'}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled', ml: 1 }}>
        ({lastCheck.toLocaleTimeString()})
      </Typography>
    </Box>
  );
}

export function DetailedConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      const healthy = await checkBackendHealth();
      setIsConnected(healthy);
      setError(null);
    } catch (error) {
      setIsConnected(false);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    // Get API URL from configuration
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    setApiUrl(url);

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
        Backend Connection Status
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Status:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircleIcon
              sx={{
                width: 12,
                height: 12,
                mr: 1,
                color:
                  isConnected === null
                    ? 'grey.400'
                    : isConnected
                    ? 'success.main'
                    : 'error.main',
                ...(isConnected === null && {
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }),
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color:
                  isConnected === null
                    ? 'text.secondary'
                    : isConnected
                    ? 'success.main'
                    : 'error.main',
              }}
            >
              {isConnected === null
                ? 'Checking...'
                : isConnected
                ? 'Connected'
                : 'Disconnected'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            API URL:
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            {apiUrl}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Last Check:
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {lastCheck.toLocaleString()}
          </Typography>
        </Box>

        {error && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Error:
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'error.main', textAlign: 'right', flex: 1, ml: 1 }}
            >
              {error}
            </Typography>
          </Box>
        )}

        <Box sx={{ pt: 1 }}>
          <Button
            onClick={checkConnection}
            variant="contained"
            size="small"
            disabled={isConnected === null}
          >
            Refresh Status
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
