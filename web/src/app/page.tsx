'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/dashboard/Dashboard';
import { Box, Paper, Skeleton } from '@mui/material';

export default function HomePage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper sx={{ borderRadius: 2, boxShadow: 1, p: 3 }}>
          <Skeleton variant="rectangular" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={16} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={16} />
        </Paper>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <Dashboard />;
}
