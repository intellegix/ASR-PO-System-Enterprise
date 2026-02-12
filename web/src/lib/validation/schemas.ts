/**
 * Comprehensive Zod Validation Schemas
 * Enterprise-grade input validation for all API endpoints
 */

import { z } from 'zod';

// ============================================
// COMMON VALIDATION PATTERNS
// ============================================

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Email validation
export const emailSchema = z.string().email('Invalid email format');

// Phone validation (US format)
export const phoneSchema = z.string().regex(
  /^(\+1|1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
  'Invalid phone number format'
);

// Monetary amount validation (non-negative, max 2 decimal places)
export const monetaryAmountSchema = z.number()
  .nonnegative('Amount must be non-negative')
  .refine(val => Number(val.toFixed(2)) === val, 'Amount can have at most 2 decimal places')
  .refine(val => val <= 10000000, 'Amount exceeds maximum limit');

// Percentage validation (0-1 range)
export const percentageSchema = z.number()
  .min(0, 'Percentage must be at least 0')
  .max(1, 'Percentage must be at most 1');

// Text field validation (sanitized)
export const sanitizedTextSchema = (maxLength: number = 255) =>
  z.string()
    .max(maxLength, `Text must be at most ${maxLength} characters`)
    .regex(/^[^<>]*$/, 'Text cannot contain HTML tags');

// Code validation (alphanumeric with dashes/underscores)
export const codeSchema = (maxLength: number = 20) =>
  z.string()
    .max(maxLength, `Code must be at most ${maxLength} characters`)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, dashes, and underscores');

// ============================================
// USER VALIDATION SCHEMAS
// ============================================

// Base schema without refinements (used for both create and partial updates)
const baseUserSchema = z.object({
  email: emailSchema,
  firstName: sanitizedTextSchema(50),
  lastName: sanitizedTextSchema(50),
  phone: phoneSchema,
  role: z.enum(['MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING']),
  divisionId: uuidSchema.optional(),
});

// Create schema with business rules (if any needed)
export const createUserSchema = baseUserSchema;

// Update schema from base (no conflicts with .partial())
export const updateUserSchema = baseUserSchema.partial();

// ============================================
// PURCHASE ORDER VALIDATION SCHEMAS
// ============================================

export const poLineItemSchema = z.object({
  itemDescription: sanitizedTextSchema(500)
    .min(1, 'Item description is required'),
  quantity: z.number()
    .positive('Quantity must be positive')
    .max(999999, 'Quantity exceeds maximum limit'),
  unitOfMeasure: sanitizedTextSchema(20),
  unitPrice: monetaryAmountSchema,
  glAccountId: uuidSchema,
  isTaxable: z.boolean().optional().default(true),
});

// Base PO schema without refinements
const basePOSchema = z.object({
  clientId: uuidSchema.nullable().optional(),
  projectId: uuidSchema,
  workOrderId: uuidSchema.nullable().optional(),
  vendorId: uuidSchema,
  divisionId: uuidSchema,
  lineItems: z.array(poLineItemSchema)
    .min(1, 'At least one line item is required')
    .max(50, 'Too many line items (max 50)'),
  notesInternal: sanitizedTextSchema(1000).optional(),
  notesVendor: sanitizedTextSchema(1000).optional(),
  requiredByDate: z.string().refine(
    (val) => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val),
    'Invalid date format'
  ).nullable().optional(),
  termsCode: codeSchema(10).optional(),
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled'])
    .optional()
    .default('Draft'),
});

// Create PO schema with business rule refinements
export const createPOSchema = basePOSchema.refine(
  (data) => {
    // Business rule: Calculate total amount to ensure it's within reasonable limits
    const total = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    return total <= 1000000; // $1M limit
  },
  { message: 'Total PO amount exceeds $1,000,000 limit' }
);

// Update PO schema - for field updates (separate from status updates)
export const updatePOSchema = basePOSchema.partial();

export const updatePOStatusSchema = z.object({
  status: z.enum(['Submitted', 'Approved', 'Rejected', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled']),
  notes: sanitizedTextSchema(500).optional(),
});

// ============================================
// VENDOR VALIDATION SCHEMAS
// ============================================

// Base vendor schema without refinements
const baseVendorSchema = z.object({
  vendorName: sanitizedTextSchema(100).min(1, 'Vendor name is required'),
  vendorCode: codeSchema(10).min(2, 'Vendor code must be at least 2 characters'),
  vendorType: z.enum(['Material', 'Subcontractor', 'Equipment', 'Other']),
  contactName: sanitizedTextSchema(100),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  addressLine1: sanitizedTextSchema(100).optional(),
  addressLine2: sanitizedTextSchema(100).optional(),
  city: sanitizedTextSchema(50),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  paymentTermsDefault: codeSchema(20).optional().default('Net30'),
  is1099Required: z.boolean().optional().default(false),
});

// Create vendor schema with business rules (if any needed)
export const createVendorSchema = baseVendorSchema;

// Update vendor schema from base (no conflicts with .partial())
export const updateVendorSchema = baseVendorSchema.partial();

// ============================================
// PROJECT VALIDATION SCHEMAS
// ============================================

// Base project schema without refinements
const baseProjectSchema = z.object({
  projectCode: codeSchema(20).min(1, 'Project code is required'),
  projectName: sanitizedTextSchema(100).min(1, 'Project name is required'),
  districtCode: codeSchema(10),
  districtName: sanitizedTextSchema(100),
  primaryDivisionId: uuidSchema,
  status: z.enum(['Active', 'OnHold', 'Completed', 'Cancelled']).default('Active'),
  budgetTotal: monetaryAmountSchema.optional(),
});

// Create project schema with business rules (if any needed)
export const createProjectSchema = baseProjectSchema;

// Update project schema from base (no conflicts with .partial())
export const updateProjectSchema = baseProjectSchema.partial();

// ============================================
// WORK ORDER VALIDATION SCHEMAS
// ============================================

// Base work order schema without refinements
const baseWorkOrderSchema = z.object({
  workOrderNumber: codeSchema(20).optional(), // Auto-generated if not provided
  title: sanitizedTextSchema(200).min(1, 'Work order title is required'),
  description: sanitizedTextSchema(1000).optional(),
  divisionId: uuidSchema,
  projectId: uuidSchema,
  status: z.enum(['Pending', 'InProgress', 'Completed', 'OnHold', 'Cancelled']).default('Pending'),
  budgetEstimate: monetaryAmountSchema.optional(),
  targetStartDate: z.string().datetime('Invalid date format').optional(),
  targetEndDate: z.string().datetime('Invalid date format').optional(),
});

// Create work order schema with business rule refinements
export const createWorkOrderSchema = baseWorkOrderSchema.refine(
  (data) => {
    if (data.targetStartDate && data.targetEndDate) {
      return new Date(data.targetStartDate) <= new Date(data.targetEndDate);
    }
    return true;
  },
  { message: 'Target end date must be after start date' }
);

// Update work order schema from base (no conflicts with .partial())
export const updateWorkOrderSchema = baseWorkOrderSchema.partial();

// ============================================
// DIVISION VALIDATION SCHEMAS
// ============================================

// Base division schema without refinements
const baseDivisionSchema = z.object({
  divisionName: sanitizedTextSchema(100).min(1, 'Division name is required'),
  divisionCode: codeSchema(5).min(2, 'Division code must be at least 2 characters'),
  costCenterPrefix: codeSchema(5).min(2, 'Cost center prefix must be at least 2 characters'),
  qbClassName: sanitizedTextSchema(100),
  isActive: z.boolean().default(true),
});

// Create division schema with business rules (if any needed)
export const createDivisionSchema = baseDivisionSchema;

// Update division schema from base (no conflicts with .partial())
export const updateDivisionSchema = baseDivisionSchema.partial();

// ============================================
// GL ACCOUNT VALIDATION SCHEMAS
// ============================================

// Base GL account schema without refinements
const baseGLAccountSchema = z.object({
  glCodeShort: codeSchema(5).min(1, 'GL code short is required'),
  glAccountNumber: z.string().regex(/^\d{4,}$/, 'GL account number must be numeric'),
  glAccountName: sanitizedTextSchema(100).min(1, 'GL account name is required'),
  glAccountCategory: z.enum(['COGS', 'OpEx', 'Asset', 'Liability', 'Equity']),
  isTaxableDefault: z.boolean().default(true),
  qbSyncEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

// Create GL account schema with business rules (if any needed)
export const createGLAccountSchema = baseGLAccountSchema;

// Update GL account schema from base (no conflicts with .partial())
export const updateGLAccountSchema = baseGLAccountSchema.partial();

// ============================================
// QUERY PARAMETER VALIDATION SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 100).optional().default(50),
});

export const poQuerySchema = z.object({
  status: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled']).optional(),
  divisionId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  dateFrom: z.string().datetime('Invalid date format').optional(),
  dateTo: z.string().datetime('Invalid date format').optional(),
}).merge(paginationSchema);

export const vendorQuerySchema = z.object({
  vendorType: z.enum(['Material', 'Subcontractor', 'Equipment', 'Other']).optional(),
  isActive: z.string().transform(s => s === 'true').optional(),
  city: sanitizedTextSchema(50).optional(),
  state: z.string().length(2).optional(),
}).merge(paginationSchema);

// ============================================
// AUTHENTICATION VALIDATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
           'Password must contain uppercase, lowercase, number, and special character'),
});

// ============================================
// BULK OPERATION VALIDATION SCHEMAS
// ============================================

export const bulkUpdatePOStatusSchema = z.object({
  poIds: z.array(uuidSchema).min(1, 'At least one PO ID required').max(50, 'Too many POs (max 50)'),
  status: z.enum(['Approved', 'Cancelled']),
  notes: sanitizedTextSchema(500).optional(),
});

// ============================================
// QUICK PO (PHASE 1) — Just division, project, work order
// ============================================

export const quickCreatePOSchema = z.object({
  projectId: uuidSchema,
  divisionId: uuidSchema,
  clientId: uuidSchema.nullable().optional(),
  propertyId: uuidSchema.nullable().optional(),
  workOrderId: uuidSchema.nullable().optional(),
  createWorkOrder: z.object({
    title: sanitizedTextSchema(200).min(1, 'Work order title is required'),
  }).optional(),
  notesInternal: sanitizedTextSchema(1000).optional(),
});

export type QuickCreatePOInput = z.infer<typeof quickCreatePOSchema>;

// ============================================
// COMPLETE PO (PHASE 2) — Add vendor + line items to existing draft
// ============================================

export const completePOSchema = z.object({
  vendorId: uuidSchema,
  lineItems: z.array(poLineItemSchema).min(1, 'At least one line item is required').max(50, 'Too many line items (max 50)'),
  notesInternal: sanitizedTextSchema(1000).optional(),
  notesVendor: sanitizedTextSchema(1000).optional(),
  requiredByDate: z.string().refine(
    (val) => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val),
    'Invalid date format'
  ).nullable().optional(),
  termsCode: codeSchema(10).optional(),
  status: z.enum(['Draft', 'Approved']).optional(),
});

export type CompletePOInput = z.infer<typeof completePOSchema>;

// ============================================
// PROPERTY VALIDATION SCHEMAS
// ============================================

export const createPropertySchema = z.object({
  clientId: uuidSchema,
  propertyName: sanitizedTextSchema(200).min(1, 'Property name is required'),
  propertyAddress: sanitizedTextSchema(300).optional(),
  city: sanitizedTextSchema(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string().max(10).optional(),
  notes: sanitizedTextSchema(1000).optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

// ============================================
// EXPORT TYPE DEFINITIONS
// ============================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreatePOInput = z.infer<typeof createPOSchema>;
export type UpdatePOInput = z.infer<typeof updatePOSchema>;
export type UpdatePOStatusInput = z.infer<typeof updatePOStatusSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type POQueryInput = z.infer<typeof poQuerySchema>;
export type VendorQueryInput = z.infer<typeof vendorQuerySchema>;