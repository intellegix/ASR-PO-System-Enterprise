'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { getAuthHeader, getJWTSession } from '@/lib/jwt-auth';
import { PurchaseOrder } from '@/lib/types';

// Query keys for React Query
export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...purchaseOrderKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...purchaseOrderKeys.lists(), { filters }] as const,
  details: () => [...purchaseOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseOrderKeys.details(), id] as const,
} as const;

export interface CreatePORequest {
  vendorId: string;
  amount: number;
  description: string;
  divisionId?: string | null;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    category: string;
  }[];
}

export interface UpdatePORequest {
  id: string;
  vendorId?: string;
  amount?: number;
  description?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    category: string;
  }[];
}

/**
 * Hook to fetch all purchase orders
 */
export function usePurchaseOrders(filters?: Record<string, unknown>) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: purchaseOrderKeys.list(filters || {}),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const queryParams = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
      const url = `/api/purchase-orders${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get<{ data: PurchaseOrder[] }>(url, { headers });
      return response.data || response; // Handle different response formats
    },
    enabled: hasJWT, // Only run if authenticated with backend
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a specific purchase order by ID
 */
export function usePurchaseOrder(id: string) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: purchaseOrderKeys.detail(id),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.get<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}`,
        { headers }
      );
      return response.data || response;
    },
    enabled: !!id && hasJWT,
    retry: 1,
  });
}

/**
 * Hook to create a new purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async (data: CreatePORequest) => {
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.post<{ data: PurchaseOrder }>(
        '/api/purchase-orders',
        data,
        { headers }
      );
      return response.data || response;
    },
    onSuccess: () => {
      // Invalidate and refetch purchase orders
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    },
  });
}

/**
 * Hook to update an existing purchase order
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async (data: UpdatePORequest) => {
      const { id, ...updateData } = data;
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.put<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}`,
        updateData,
        { headers }
      );
      return response.data || response;
    },
    onSuccess: (updatedPO) => {
      // Update the specific PO in cache
      queryClient.setQueryData(
        purchaseOrderKeys.detail(updatedPO.id),
        updatedPO
      );
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}

/**
 * Hook to delete a purchase order
 */
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async (id: string) => {
      const headers = hasJWT ? getAuthHeader() : {};
      await api.delete(`/api/purchase-orders/${id}`, { headers });
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache and invalidate queries
      queryClient.removeQueries({ queryKey: purchaseOrderKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}

/**
 * Hook to approve/reject a purchase order
 */
export function useUpdatePOStatus() {
  const queryClient = useQueryClient();
  const hasJWT = !!getJWTSession();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: 'APPROVED' | 'REJECTED';
      reason?: string;
    }) => {
      const headers = hasJWT ? getAuthHeader() : {};
      const response = await api.patch<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}/status`,
        { status, reason },
        { headers }
      );
      return response.data || response;
    },
    onSuccess: (updatedPO) => {
      // Update cache
      queryClient.setQueryData(
        purchaseOrderKeys.detail(updatedPO.id),
        updatedPO
      );
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
    },
  });
}