/**
 * Common type definitions for the ASR Purchase Order System
 */

// User type that works with both demo and JWT authentication
export interface User {
  id: string;
  username?: string; // For demo compatibility
  email: string;
  name: string;
  role: string;
  divisionId: string | null;
  division?: string; // For compatibility
  divisionName?: string | null; // For demo compatibility
  divisionCode?: string | null; // For demo compatibility
  lastLogin?: string;
  isActive?: boolean;
  permissions?: string[];
}

// Authentication modes
export type AuthMode = 'demo' | 'backend' | null;

// Authentication response types
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Purchase Order related types
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requestedBy: string;
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  description: string;
  divisionId?: string | null;
  division?: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

// Vendor related types
export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  taxId?: string;
  paymentTerms?: string;
  isActive: boolean;
  createdDate: string;
  modifiedDate?: string;
}

// Division related types
export interface Division {
  id: string;
  name: string;
  code: string;
  leaderId?: string;
  leaderName?: string;
  budget?: number;
  isActive: boolean;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  hasErrors: boolean;
}