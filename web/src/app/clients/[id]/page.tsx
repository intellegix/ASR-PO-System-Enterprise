'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface Property {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  _count: { projects: number };
}

interface ClientDetail {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  properties: Property[];
  _count: { projects: number; po_headers: number };
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add property form
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [addingProperty, setAddingProperty] = useState(false);

  useEffect(() => {
    if (isAuthenticated && id) fetchClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  const fetchClient = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        document.title = `${data.client_name} | ASR PO System`;
      } else {
        setError('Client not found');
      }
    } catch {
      setError('Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newPropName.trim()) return;
    setAddingProperty(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: id,
          propertyName: newPropName.trim(),
          propertyAddress: newPropAddress.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowAddProperty(false);
        setNewPropName('');
        setNewPropAddress('');
        await fetchClient();
      }
    } catch {
      console.error('Failed to create property');
    } finally {
      setAddingProperty(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout pageTitle="Client">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <CircularProgress sx={{ color: 'warning.main' }} />
        </Box>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (error || !client) {
    return (
      <AppLayout pageTitle="Client">
        <Box sx={{ maxWidth: '1024px', mx: 'auto', textAlign: 'center', py: 6 }}>
          <Typography color="error" sx={{ mb: 2 }}>
            {error || 'Client not found'}
          </Typography>
          <Link href="/clients" style={{ color: '#ff6f00', textDecoration: 'none' }}>
            <Typography sx={{ '&:hover': { textDecoration: 'underline' } }}>
              Back to Clients
            </Typography>
          </Link>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={client.client_name}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', '& > *:not(:last-child)': { mb: 3 } }}>
        {/* Breadcrumb */}
        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          <Link href="/clients" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Box component="span" sx={{ '&:hover': { color: 'warning.main' } }}>
              Clients
            </Box>
          </Link>
          <Box component="span" sx={{ mx: 1 }}>/</Box>
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
            {client.client_name}
          </Box>
        </Box>

        {/* Client info header */}
        <Card sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'flex-start' }, justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  {client.client_name}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                  {client.client_code}
                </Typography>
                {client.parent_entity && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {client.parent_entity}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem' }}>
                {client.category && (
                  <Chip label={client.category} sx={{ bgcolor: 'grey.100' }} />
                )}
                <Chip label={`${client._count.projects} projects`} color="primary" variant="outlined" />
                <Chip label={`${client._count.po_headers} POs`} color="success" variant="outlined" />
              </Box>
            </Box>

            {(client.contact_name || client.contact_email || client.contact_phone) && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.100' }}>
                <Grid container spacing={1.5} sx={{ fontSize: '0.875rem' }}>
                  {client.contact_name && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography component="span" color="text.secondary">Contact:</Typography>
                      <Typography component="span" sx={{ ml: 1 }} color="text.primary">{client.contact_name}</Typography>
                    </Grid>
                  )}
                  {client.contact_email && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography component="span" color="text.secondary">Email:</Typography>
                      <Typography component="span" sx={{ ml: 1 }} color="text.primary">{client.contact_email}</Typography>
                    </Grid>
                  )}
                  {client.contact_phone && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography component="span" color="text.secondary">Phone:</Typography>
                      <Typography component="span" sx={{ ml: 1 }} color="text.primary">{client.contact_phone}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Properties section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="semibold" color="text.primary">
              Properties ({client.properties.length})
            </Typography>
            <Button
              onClick={() => setShowAddProperty(true)}
              startIcon={<AddIcon />}
              size="small"
              sx={{ textTransform: 'none', fontWeight: 'medium' }}
            >
              Add Property
            </Button>
          </Box>

          {/* Add property form */}
          {showAddProperty && (
            <Card sx={{ border: 1, borderColor: 'divider', p: 2, mb: 2 }}>
              <Box sx={{ '& > *:not(:last-child)': { mb: 1.5 } }}>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                    Property Name *
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={newPropName}
                    onChange={(e) => setNewPropName(e.target.value)}
                    placeholder="e.g., Main Office Building"
                  />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                    Address
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={newPropAddress}
                    onChange={(e) => setNewPropAddress(e.target.value)}
                    placeholder="e.g., 123 Main St, San Diego, CA"
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    onClick={() => {
                      setShowAddProperty(false);
                      setNewPropName('');
                      setNewPropAddress('');
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddProperty}
                    disabled={!newPropName.trim() || addingProperty}
                    variant="contained"
                    size="small"
                    sx={{ textTransform: 'none', bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
                  >
                    {addingProperty ? 'Adding...' : 'Add Property'}
                  </Button>
                </Box>
              </Box>
            </Card>
          )}

          {/* Property cards */}
          {client.properties.length === 0 ? (
            <Card sx={{ border: 1, borderColor: 'divider', p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No properties yet. Add one to get started.</Typography>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {client.properties.map((prop) => (
                <Grid key={prop.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <Link href={`/clients/${client.id}/properties/${prop.id}`} style={{ textDecoration: 'none' }}>
                    <Card
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        p: 2,
                        '&:hover': { borderColor: 'warning.light', boxShadow: 1 },
                        transition: 'all 0.2s',
                        height: '100%',
                      }}
                    >
                      <Typography fontWeight="medium" color="text.primary">
                        {prop.property_name}
                      </Typography>
                      {prop.property_address && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {prop.property_address}
                        </Typography>
                      )}
                      {(prop.city || prop.state) && (
                        <Typography variant="body2" color="text.secondary">
                          {[prop.city, prop.state, prop.zip].filter(Boolean).join(', ')}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                        {prop._count.projects} projects
                      </Typography>
                    </Card>
                  </Link>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}
