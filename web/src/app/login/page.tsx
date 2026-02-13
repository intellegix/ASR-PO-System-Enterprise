'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  Typography,
  Grid,
  Chip,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, backendAvailable, isLoading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(identifier, password, backendAvailable);

      if (result.success) {
        console.log('Login successful, redirecting to dashboard...');
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result.error || 'Invalid username/email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (email: string, pw: string) => {
    setIdentifier(email);
    setPassword(pw);
  };

  const demoAccounts = [
    { label: 'O1: CAPEX', email: 'owner1@allsurfaceroofing.com', highlight: true },
    { label: 'O2: Service Work', email: 'owner2@allsurfaceroofing.com' },
    { label: 'O3: Roofing', email: 'owner3@allsurfaceroofing.com' },
    { label: 'O4: Gen Contract', email: 'owner4@allsurfaceroofing.com' },
    { label: 'O5: Sub Mgmt', email: 'owner5@allsurfaceroofing.com' },
    { label: 'O6: Specialty', email: 'owner6@allsurfaceroofing.com' },
    { label: 'Ops Manager', email: 'opsmgr@allsurfaceroofing.com' },
    { label: 'Accounting', email: 'accounting@allsurfaceroofing.com' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
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
            <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
            ASR PO System
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            All Surface Roofing & Waterproofing
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: backendAvailable ? '#22c55e' : '#eab308',
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: backendAvailable ? '#4ade80' : '#facc15' }}
            >
              {backendAvailable ? 'Backend Connected' : 'Demo Mode Available'}
            </Typography>
          </Box>
        </Box>

        {/* Login Form */}
        <Card sx={{ borderRadius: 4, boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 3 }}>
              Sign In
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                id="identifier"
                label="Username or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                fullWidth
                placeholder="owner1 or owner1@allsurfaceroofing.com"
                autoComplete="username"
              />

              <TextField
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || authLoading}
                sx={{ py: 1.5, fontSize: '1rem' }}
              >
                {loading || authLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    Signing in...
                  </Box>
                ) : (
                  'Sign In'
                )}
              </Button>

              <Button
                type="button"
                variant="contained"
                color="info"
                fullWidth
                startIcon={<AdminPanelSettingsIcon />}
                onClick={() => setCredentials('intellegix', 'Devops$@2026')}
                sx={{ py: 1 }}
              >
                Admin Login (Austin Kidwell)
              </Button>
            </Box>

            {/* Demo credentials */}
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 1.5 }}>
                Demo Accounts (password: demo123) - Click or type username only
              </Typography>
              <Grid container spacing={1}>
                {demoAccounts.map((account) => (
                  <Grid key={account.email} size={{ xs: 6 }}>
                    <Chip
                      label={account.label}
                      onClick={() => setCredentials(account.email, 'demo123')}
                      variant={account.highlight ? 'filled' : 'outlined'}
                      color={account.highlight ? 'primary' : 'default'}
                      sx={{
                        width: '100%',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: account.highlight ? 'primary.light' : 'action.hover' },
                      }}
                      size="small"
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          }}
        >
          <CircularProgress sx={{ color: 'white' }} />
        </Box>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
