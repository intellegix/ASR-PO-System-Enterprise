'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin, type UserRole } from '@/lib/auth/permissions';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || !isAdmin((user.role || 'USER') as UserRole)) {
    router.push('/');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', gap: 2, flexDirection: 'column' }}>
        <Typography color="error">Access denied. Admin privileges required.</Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
