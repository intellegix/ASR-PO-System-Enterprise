'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { getAuthHeader, getJWTSession } from '@/lib/jwt-auth';

// Query keys for React Query
export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  spending: (filters: Record<string, unknown>) => [...reportKeys.all, 'spending', { filters }] as const,
  approval: (filters: Record<string, unknown>) => [...reportKeys.all, 'approval', { filters }] as const,
  vendor: (filters: Record<string, unknown>) => [...reportKeys.all, 'vendor', { filters }] as const,
} as const;

export interface DashboardStats {
  totalPOs: number;
  pendingApprovals: number;
  totalSpending: number;
  activeVendors: number;
  spendingByDivision: {
    division: string;
    amount: number;
    percentage: number;
  }[];
  recentPOs: {
    id: string;
    poNumber: string;
    vendor: string;
    amount: number;
    status: string;
    requestedDate: string;
  }[];
  approvalTrends: {
    month: string;
    approved: number;
    rejected: number;
    pending: number;
  }[];
}

export interface SpendingReport {
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  byCategory: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  byDivision: {
    division: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  byVendor: {
    vendor: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  timeline: {
    date: string;
    amount: number;
    count: number;
  }[];
}

export interface ApprovalReport {
  totalPending: number;
  averageApprovalTime: number;
  approvalRate: number;
  byApprover: {
    approver: string;
    approved: number;
    rejected: number;
    pending: number;
    averageTime: number;
  }[];
  byDivision: {
    division: string;
    approved: number;
    rejected: number;
    pending: number;
  }[];
  timeline: {
    date: string;
    approved: number;
    rejected: number;
    pending: number;
  }[];
}

export interface VendorReport {
  totalVendors: number;
  activeVendors: number;
  topVendors: {
    vendor: string;
    totalAmount: number;
    poCount: number;
    lastOrder: string;
    averageOrderValue: number;
  }[];
  vendorPerformance: {
    vendor: string;
    onTimeDelivery: number;
    qualityRating: number;
    communicationRating: number;
    overallScore: number;
  }[];
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats(dateRange?: { start: string; end: string }) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const queryParams = dateRange
        ? new URLSearchParams(dateRange).toString()
        : '';
      const url = `/api/reports/dashboard${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get<{ data: DashboardStats }>(url, { headers });
      return response.data || response;
    },
    enabled: hasJWT,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Hook to fetch spending report
 */
export function useSpendingReport(filters?: {
  startDate?: string;
  endDate?: string;
  divisionId?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
}) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: reportKeys.spending(filters || {}),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const queryParams = filters
        ? new URLSearchParams(filters as Record<string, string>).toString()
        : '';
      const url = `/api/reports/spending${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get<{ data: SpendingReport }>(url, { headers });
      return response.data || response;
    },
    enabled: hasJWT,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch approval workflow report
 */
export function useApprovalReport(filters?: {
  startDate?: string;
  endDate?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  divisionId?: string;
}) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: reportKeys.approval(filters || {}),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const queryParams = filters
        ? new URLSearchParams(filters as Record<string, string>).toString()
        : '';
      const url = `/api/reports/approvals${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get<{ data: ApprovalReport }>(url, { headers });
      return response.data || response;
    },
    enabled: hasJWT,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch vendor performance report
 */
export function useVendorReport(filters?: {
  startDate?: string;
  endDate?: string;
  minOrderValue?: number;
  activeOnly?: boolean;
}) {
  const hasJWT = !!getJWTSession();

  return useQuery({
    queryKey: reportKeys.vendor(filters || {}),
    queryFn: async () => {
      const headers = hasJWT ? getAuthHeader() : {};
      const queryParams = filters
        ? new URLSearchParams(filters as Record<string, string>).toString()
        : '';
      const url = `/api/reports/vendors${queryParams ? `?${queryParams}` : ''}`;

      const response = await api.get<{ data: VendorReport }>(url, { headers });
      return response.data || response;
    },
    enabled: hasJWT,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}