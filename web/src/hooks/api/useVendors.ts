'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { getAuthHeader, getJWTSession } from '@/lib/jwt-auth';
import { Vendor } from '@/lib/types';

// Query keys for React Query
export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...vendorKeys.lists(), { filters }] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
} as const;

export interface CreateVendorRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  paymentTerms?: string;
}

export interface UpdateVendorRequest {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  paymentTerms?: string;
  isActive?: boolean;
}

/**
 * Hook to fetch all vendors
 */
export function useVendors(filters?: { isActive?: boolean; search?: string }) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: vendorKeys.list(filters || {}),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const queryParams = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
      const url = `/api/vendors${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get<{ data: Vendor[] }>(url, { headers });
      return response.data || response;
    },
    enabled: hasJWT,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch a specific vendor by ID
 */
export function useVendor(id: string) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.get<{ data: Vendor }>(
        `/api/vendors/${id}`,
        { headers }
      );
      return response.data || response;
    },
    enabled: !!id && hasJWT,
    retry: 1,
  });
}

/**
 * Hook to create a new vendor
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async (data: CreateVendorRequest) => {
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.post<{ data: Vendor }>(
        '/api/vendors',
        data,
        { headers }
      );
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
    },
  });
}

/**
 * Hook to update an existing vendor
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async (data: UpdateVendorRequest) => {
      const { id, ...updateData } = data;
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.put<{ data: Vendor }>(
        `/api/vendors/${id}`,
        updateData,
        { headers }
      );
      return response.data || response;
    },
    onSuccess: (updatedVendor) => {
      queryClient.setQueryData(
        vendorKeys.detail(updatedVendor.id),
        updatedVendor
      );
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}

/**
 * Hook to delete/deactivate a vendor
 */
export function useDeleteVendor() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async (id: string) => {
      const headers = hasJWT ? getAuthHeader() : {};
      await api.delete(`/api/vendors/${id}`, { headers });
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: vendorKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}

/**
 * Hook to search vendors by name
 */
export function useVendorSearch(searchTerm: string) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: [...vendorKeys.all, 'search', searchTerm],
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.get<{ data: Vendor[] }>(
        `/api/vendors/search?q=${encodeURIComponent(searchTerm)}`,
        { headers }
      );
      return response.data || response;
    },
    enabled: !!searchTerm && searchTerm.length >= 2 && hasJWT,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}