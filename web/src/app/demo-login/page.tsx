'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateDemo, setDemoSession } from '@/lib/demo-auth';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Grid,
  CircularProgress,
} from '@mui/material';
import { Description as DescriptionIcon } from '@mui/icons-material';

export default function DemoLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authenticateDemo(identifier, password);

      if (user) {
        setDemoSession(user);
        console.log('✅ Login successful, redirecting...');
        router.push('/demo');
      } else {
        setError('Invalid username/email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 'md' }}>
        {/* Logo/Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              borderRadius: 3,
              mb: 2,
            }}
          >
            <DescriptionIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            ASR PO System
          </Typography>
          <Typography sx={{ color: 'grey.400', mt: 0.5 }}>
            All Surface Roofing & Waterproofing
          </Typography>
          <Typography sx={{ color: 'primary.light', fontSize: '0.875rem', mt: 1 }}>
            🚀 Demo Mode - Frontend Only
          </Typography>
        </Box>

        {/* Login Form */}
        <Paper sx={{ borderRadius: 4, boxShadow: 10, p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 3 }}>
            Demo Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                id="identifier"
                label="Username or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="Intellegix or owner1@allsurfaceroofing.com"
                fullWidth
              />

              <TextField
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                fullWidth
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>
          </form>

          {/* Demo credentials */}
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', textAlign: 'center', mb: 1.5 }}
            >
              Demo Accounts - Click to auto-fill:
            </Typography>
            <Grid container spacing={1}>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => fillCredentials('Intellegix', 'Devops$@2026')}
                  sx={{
                    bgcolor: 'primary.lighter',
                    borderColor: 'primary.light',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      borderColor: 'primary.main',
                    },
                    py: 1,
                  }}
                >
                  🔑 Admin: Intellegix
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => fillCredentials('owner1', 'demo123')}
                  sx={{ py: 1 }}
                >
                  O1: CAPEX
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => fillCredentials('owner2', 'demo123')}
                  sx={{ py: 1 }}
                >
                  O2: Service Work
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => fillCredentials('owner3', 'demo123')}
                  sx={{ py: 1 }}
                >
                  O3: Roofing
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => fillCredentials('opsmgr', 'demo123')}
                  sx={{ py: 1 }}
                >
                  Ops Manager
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => fillCredentials('accounting', 'demo123')}
                  sx={{ py: 1 }}
                >
                  Accounting
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Instructions */}
        <Box sx={{ mt: 3, textAlign: 'center', color: 'grey.400', fontSize: '0.875rem' }}>
          <Typography>🎯 This is a demo version for frontend testing</Typography>
          <Typography>🔗 No server connection required</Typography>
        </Box>
      </Box>
    </Box>
  );
}
