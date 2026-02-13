'use client';

import { Box, Card, CardContent, Skeleton } from '@mui/material';

interface LoadingSkeletonProps {
  variant: 'page' | 'table' | 'card';
}

/**
 * Loading skeleton component with preset layouts.
 * Provides consistent loading states across the application.
 */
export const LoadingSkeleton = ({ variant }: LoadingSkeletonProps) => {
  if (variant === 'page') {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Page header */}
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 1 }} />

        {/* Content cards */}
        {[1, 2, 3].map((i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (variant === 'table') {
    return (
      <Box sx={{ width: '100%' }}>
        {/* Table header */}
        <Skeleton variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />

        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  if (variant === 'card') {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="85%" />
          <Skeleton variant="rectangular" height={40} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return null;
};
