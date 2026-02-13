'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
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
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_terms_default: string | null;
}

const vendorTypeColor = (type: string | null): 'primary' | 'success' | 'secondary' | 'warning' | 'default' => {
  const colors: Record<string, 'primary' | 'success' | 'secondary' | 'warning'> = {
    Subcontractor: 'primary',
    Supplier: 'success',
    Service: 'secondary',
    Equipment: 'warning',
  };
  return colors[type || ''] || 'default';
};

export default function VendorsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchVendors();
    }
  }, [isAuthenticated]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
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

  const filteredVendors = vendors.filter((vendor) => {
    const matchesType = !typeFilter || vendor.vendor_type === typeFilter;
    const matchesSearch =
      !searchQuery ||
      vendor.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <AppLayout pageTitle="Vendors">
      <Box sx={{ maxWidth: '1280px', mx: 'auto' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            Vendors
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredVendors.length} vendors
          </Typography>
        </Box>

        <Card sx={{ p: 2, mb: 3, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                Type
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Subcontractor">Subcontractor</MenuItem>
                <MenuItem value="Supplier">Supplier</MenuItem>
                <MenuItem value="Service">Service</MenuItem>
                <MenuItem value="Equipment">Equipment</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Typography variant="body2" fontWeight="medium" color="text.primary" sx={{ mb: 0.5 }}>
                Search
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by vendor name..."
              />
            </Box>

            {(typeFilter || searchQuery) && (
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setTypeFilter('');
                    setSearchQuery('');
                  }}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Clear filters
                </Button>
              </Box>
            )}
          </Box>
        </Card>

        <Card sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredVendors.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <SwapHorizIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
              <Typography color="text.secondary">No vendors found</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Payment Terms</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredVendors.map((vendor) => (
                        <TableRow
                          key={vendor.id}
                          hover
                          sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
                            {vendor.vendor_code}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'medium' }}>
                            {vendor.vendor_name}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={vendor.vendor_type || 'N/A'}
                              color={vendorTypeColor(vendor.vendor_type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{vendor.contact_name || '-'}</TableCell>
                          <TableCell>{vendor.contact_phone || '-'}</TableCell>
                          <TableCell>{vendor.contact_email || '-'}</TableCell>
                          <TableCell>{vendor.payment_terms_default || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                {filteredVendors.map((vendor) => (
                  <Box
                    key={vendor.id}
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'grey.50' },
                      transition: 'background-color 0.2s',
                      cursor: 'pointer',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography fontWeight="medium" color="text.primary">
                          {vendor.vendor_name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                          {vendor.vendor_code}
                        </Typography>
                      </Box>
                      <Chip
                        label={vendor.vendor_type || 'N/A'}
                        color={vendorTypeColor(vendor.vendor_type)}
                        size="small"
                      />
                    </Box>
                    {vendor.contact_name && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {vendor.contact_name}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                      {vendor.contact_phone && <span>{vendor.contact_phone}</span>}
                      {vendor.contact_email && <span>{vendor.contact_email}</span>}
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Card>
      </Box>
    </AppLayout>
  );
}
