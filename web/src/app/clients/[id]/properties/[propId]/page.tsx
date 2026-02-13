'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  budget_total: string | number | null;
  po_count: number | null;
  primary_division_id: string | null;
}

interface PropertyDetail {
  id: string;
  property_name: string;
  property_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  clients: { id: string; client_name: string; client_code: string };
  projects: Project[];
}

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string; propId: string }>;
}) {
  const { id: clientId, propId } = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && propId) fetchProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, propId]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/properties/${propId}`);
      if (res.ok) {
        const data = await res.json();
        setProperty(data);
        document.title = `${data.property_name} | ASR PO System`;
      } else {
        setError('Property not found');
      }
    } catch {
      setError('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout pageTitle="Property">
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

  if (error || !property) {
    return (
      <AppLayout pageTitle="Property">
        <Box sx={{ maxWidth: '1024px', mx: 'auto', textAlign: 'center', py: 6 }}>
          <Typography color="error" sx={{ mb: 2 }}>
            {error || 'Property not found'}
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

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <AppLayout pageTitle={property.property_name}>
      <Box sx={{ maxWidth: '1200px', mx: 'auto', '& > *:not(:last-child)': { mb: 3 } }}>
        {/* Breadcrumb */}
        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          <Link href="/clients" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Box component="span" sx={{ '&:hover': { color: 'warning.main' } }}>
              Clients
            </Box>
          </Link>
          <Box component="span" sx={{ mx: 1 }}>/</Box>
          <Link href={`/clients/${clientId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            <Box component="span" sx={{ '&:hover': { color: 'warning.main' } }}>
              {property.clients.client_name}
            </Box>
          </Link>
          <Box component="span" sx={{ mx: 1 }}>/</Box>
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
            {property.property_name}
          </Box>
        </Box>

        {/* Property info header */}
        <Card sx={{ border: 1, borderColor: 'divider', p: 3 }}>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {property.property_name}
          </Typography>
          {property.property_address && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {property.property_address}
            </Typography>
          )}
          {(property.city || property.state) && (
            <Typography variant="body2" color="text.secondary">
              {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
            </Typography>
          )}
          {property.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              {property.notes}
            </Typography>
          )}
        </Card>

        {/* Projects table */}
        <Box>
          <Typography variant="h6" fontWeight="semibold" color="text.primary" sx={{ mb: 2 }}>
            Projects ({property.projects.length})
          </Typography>

          {property.projects.length === 0 ? (
            <Card sx={{ border: 1, borderColor: 'divider', p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No projects linked to this property.</Typography>
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
                          <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Code</TableCell>
                          <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Name</TableCell>
                          <TableCell sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Status</TableCell>
                          <TableCell align="right" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Budget</TableCell>
                          <TableCell align="center" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>POs</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {property.projects.map((project) => (
                          <TableRow key={project.id} hover sx={{ transition: 'background-color 0.2s' }}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                              {project.project_code}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}>
                              {project.project_name}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={project.status}
                                color={project.status === 'Active' ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                              {formatCurrency(project.budget_total)}
                            </TableCell>
                            <TableCell align="center" sx={{ fontSize: '0.875rem' }}>
                              {project.po_count || 0}
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
                {property.projects.map((project) => (
                  <Card key={project.id} sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography fontWeight="medium" color="text.primary">
                          {project.project_name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                          {project.project_code}
                        </Typography>
                      </Box>
                      <Chip
                        label={project.status}
                        color={project.status === 'Active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                      <span>Budget: {formatCurrency(project.budget_total)}</span>
                      <span>{project.po_count || 0} POs</span>
                    </Box>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </AppLayout>
  );
}
