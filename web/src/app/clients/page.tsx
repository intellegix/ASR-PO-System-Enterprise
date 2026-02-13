'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  TextField,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';

interface Client {
  id: string;
  client_name: string;
  client_code: string;
  category: string | null;
  parent_entity: string | null;
  aliases: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  _count?: { properties: number; projects: number };
}

export default function ClientsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Clients | ASR PO System';
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchClients();
  }, [isAuthenticated]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        // Fetch property/project counts
        const enriched = await Promise.all(
          data.map(async (c: Client) => {
            try {
              const detailRes = await fetch(`/api/clients/${c.id}`);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                return {
                  ...c,
                  _count: {
                    properties: detail.properties?.length || 0,
                    projects: detail._count?.projects || 0,
                  },
                };
              }
            } catch {}
            return { ...c, _count: { properties: 0, projects: 0 } };
          })
        );
        setClients(enriched);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      c.client_name.toLowerCase().includes(term) ||
      c.client_code.toLowerCase().includes(term) ||
      (c.parent_entity || '').toLowerCase().includes(term) ||
      (c.category || '').toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout pageTitle="Clients">
      <Box sx={{ maxWidth: '1152px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="text.primary">
              Clients
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {clients.length} active clients
            </Typography>
          </Box>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search clients by name, code, or parent entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Content */}
        {loading ? (
          <Card sx={{ border: 1, borderColor: 'divider', p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card sx={{ border: 1, borderColor: 'divider', p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery ? 'No clients match your search.' : 'No clients found.'}
            </Typography>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Card sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Code</TableCell>
                        <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Category</TableCell>
                        <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Parent Entity</TableCell>
                        <TableCell align="center" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Properties</TableCell>
                        <TableCell align="center" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Projects</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id} hover sx={{ transition: 'background-color 0.2s' }}>
                          <TableCell>
                            <Link
                              href={`/clients/${client.id}`}
                              style={{ fontWeight: 500, color: 'inherit', textDecoration: 'none' }}
                            >
                              <Box component="span" sx={{ '&:hover': { color: 'warning.main' } }}>
                                {client.client_name}
                              </Box>
                            </Link>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {client.client_code}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>
                            {client.category || '-'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>
                            {client.parent_entity || '-'}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.875rem' }}>
                            {client._count?.properties || 0}
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.875rem' }}>
                            {client._count?.projects || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Box>

            {/* Mobile cards */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, '& > *:not(:last-child)': { mb: 1.5 } }}>
              {filteredClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Card
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      p: 2,
                      '&:hover': { borderColor: 'warning.light' },
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography fontWeight="medium" color="text.primary">
                          {client.client_name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                          {client.client_code}
                        </Typography>
                      </Box>
                      {client.category && (
                        <Box
                          sx={{
                            fontSize: '0.75rem',
                            bgcolor: 'grey.100',
                            color: 'text.secondary',
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                          }}
                        >
                          {client.category}
                        </Box>
                      )}
                    </Box>
                    {client.parent_entity && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {client.parent_entity}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                      <span>{client._count?.properties || 0} properties</span>
                      <span>{client._count?.projects || 0} projects</span>
                    </Box>
                  </Card>
                </Link>
              ))}
            </Box>
          </>
        )}
      </Box>
    </AppLayout>
  );
}
