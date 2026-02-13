'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDemoSession, clearDemoSession, DemoUser } from '@/lib/demo-auth';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Skeleton,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  Business as BusinessIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

export default function DemoPage() {
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getDemoSession();
    if (!session) {
      router.push('/demo-login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(session);
    setLoading(false);
  }, [router]);

  const handleSignOut = () => {
    clearDemoSession();
    router.push('/demo-login');
  };

  if (_loading) {
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

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper sx={{ boxShadow: 1 }}>
        <Box sx={{ maxWidth: 'lg', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  borderRadius: 2,
                  mr: 2,
                }}
              >
                <DescriptionIcon sx={{ fontSize: 24, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  ASR PO System
                </Typography>
                <Typography variant="body2" sx={{ color: 'primary.main' }}>
                  🚀 Demo Mode - Frontend Only
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {user.role}
                </Typography>
              </Box>
              <Button variant="contained" color="error" onClick={handleSignOut}>
                Sign Out
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box component="main" sx={{ maxWidth: 'lg', mx: 'auto', py: 3, px: { xs: 2, sm: 3, lg: 4 } }}>
        {/* Welcome Section */}
        <Box sx={{ px: { xs: 2, sm: 0 }, py: 3 }}>
          <Card sx={{ overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                Welcome, {user.name}! 🎉
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', maxWidth: 'xl' }}>
                You have successfully logged in to the ASR Purchase Order System demo.
              </Typography>
              <Box sx={{ mt: 2.5 }}>
                <Alert severity="warning">
                  <AlertTitle sx={{ fontWeight: 500 }}>Demo Mode Active</AlertTitle>
                  <Typography variant="body2">
                    This is a frontend-only demo. Full functionality requires a backend connection.
                  </Typography>
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* User Info Cards */}
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Grid container spacing={2.5}>
            {/* User Details */}
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flexShrink: 0 }}>
                      <PersonIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ ml: 2.5, width: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                        User ID
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {user.id}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Role */}
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flexShrink: 0 }}>
                      <ShieldIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ ml: 2.5, width: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                        Role
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {user.role}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Division */}
            <Grid size={{ xs: 12, sm: 12, lg: 4 }}>
              <Card sx={{ overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flexShrink: 0 }}>
                      <BusinessIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ ml: 2.5, width: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                        Division
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        {user.divisionName || 'System-wide Access'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Actions Section */}
        <Box sx={{ px: { xs: 2, sm: 0 }, py: 3 }}>
          <Card sx={{ overflow: 'hidden', boxShadow: 1, borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                Available Actions
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{
                      position: 'relative',
                      p: 3,
                      border: 2,
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: 'text.disabled',
                      },
                      display: 'block',
                      textAlign: 'left',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        p: 1.5,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        borderRadius: 2,
                        border: 4,
                        borderColor: 'background.paper',
                      }}
                    >
                      <DescriptionIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        Purchase Orders
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        Create and manage purchase orders (requires backend)
                      </Typography>
                    </Box>
                  </Button>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{
                      position: 'relative',
                      p: 3,
                      border: 2,
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: 'text.disabled',
                      },
                      display: 'block',
                      textAlign: 'left',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        p: 1.5,
                        bgcolor: 'primary.lighter',
                        color: 'primary.main',
                        borderRadius: 2,
                        border: 4,
                        borderColor: 'background.paper',
                      }}
                    >
                      <BarChartIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        Reports
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        View analytics and reports (requires backend)
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
