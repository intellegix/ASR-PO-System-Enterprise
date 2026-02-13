/**
 * Test Suite for Zod Validation Schemas
 * Tests all validation schemas used in API endpoints
 */

import {
  uuidSchema,
  emailSchema,
  phoneSchema,
  monetaryAmountSchema,
  percentageSchema,
  sanitizedTextSchema,
  codeSchema,
  createUserSchema,
  updateUserSchema,
  poLineItemSchema,
  createPOSchema,
  updatePOSchema,
  updatePOStatusSchema,
  createVendorSchema,
  updateVendorSchema,
  createProjectSchema,
  updateProjectSchema,
  createWorkOrderSchema,
  updateWorkOrderSchema,
  createDivisionSchema,
  updateDivisionSchema,
  createGLAccountSchema,
  updateGLAccountSchema,
  paginationSchema,
  poQuerySchema,
  vendorQuerySchema,
  loginSchema,
  passwordChangeSchema,
  bulkUpdatePOStatusSchema,
  quickCreatePOSchema,
  completePOSchema,
  createPropertySchema,
} from '@/lib/validation/schemas';

describe('Validation Schemas', () => {
  // ============================================
  // COMMON VALIDATION PATTERNS
  // ============================================

  describe('uuidSchema', () => {
    test('accepts valid UUID v4', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    test('rejects invalid UUID format', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    test('rejects empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    test('accepts valid email addresses', () => {
      const validEmails = ['test@example.com', 'user.name+tag@domain.co.uk'];
      validEmails.forEach((email) => {
        expect(emailSchema.safeParse(email).success).toBe(true);
      });
    });

    test('rejects invalid email formats', () => {
      const invalidEmails = ['not-an-email', '@example.com', 'user@', 'user @example.com'];
      invalidEmails.forEach((email) => {
        expect(emailSchema.safeParse(email).success).toBe(false);
      });
    });
  });

  describe('phoneSchema', () => {
    test('accepts valid US phone formats', () => {
      const validPhones = [
        '555-123-4567',
        '(555) 123-4567',
        '5551234567',
        '+1-555-123-4567',
        '1-555-123-4567',
      ];
      validPhones.forEach((phone) => {
        expect(phoneSchema.safeParse(phone).success).toBe(true);
      });
    });

    test('rejects invalid phone formats', () => {
      const invalidPhones = ['123', 'abc-def-ghij', '555-123'];
      invalidPhones.forEach((phone) => {
        expect(phoneSchema.safeParse(phone).success).toBe(false);
      });
    });
  });

  describe('monetaryAmountSchema', () => {
    test('accepts valid monetary amounts', () => {
      expect(monetaryAmountSchema.safeParse(0).success).toBe(true);
      expect(monetaryAmountSchema.safeParse(100.50).success).toBe(true);
      expect(monetaryAmountSchema.safeParse(1000000).success).toBe(true);
    });

    test('rejects negative amounts', () => {
      expect(monetaryAmountSchema.safeParse(-10).success).toBe(false);
    });

    test('rejects amounts with more than 2 decimal places', () => {
      expect(monetaryAmountSchema.safeParse(10.123).success).toBe(false);
    });

    test('rejects amounts exceeding max limit', () => {
      expect(monetaryAmountSchema.safeParse(10000001).success).toBe(false);
    });

    test('accepts amounts with exactly 2 decimal places', () => {
      expect(monetaryAmountSchema.safeParse(99.99).success).toBe(true);
    });
  });

  describe('percentageSchema', () => {
    test('accepts valid percentages (0-1 range)', () => {
      expect(percentageSchema.safeParse(0).success).toBe(true);
      expect(percentageSchema.safeParse(0.5).success).toBe(true);
      expect(percentageSchema.safeParse(1).success).toBe(true);
    });

    test('rejects values below 0', () => {
      expect(percentageSchema.safeParse(-0.1).success).toBe(false);
    });

    test('rejects values above 1', () => {
      expect(percentageSchema.safeParse(1.1).success).toBe(false);
    });
  });

  describe('sanitizedTextSchema', () => {
    test('accepts plain text', () => {
      const schema = sanitizedTextSchema(50);
      expect(schema.safeParse('Hello World').success).toBe(true);
    });

    test('rejects text with HTML tags', () => {
      const schema = sanitizedTextSchema(50);
      expect(schema.safeParse('<script>alert("xss")</script>').success).toBe(false);
    });

    test('enforces max length', () => {
      const schema = sanitizedTextSchema(10);
      expect(schema.safeParse('Short').success).toBe(true);
      expect(schema.safeParse('This is too long').success).toBe(false);
    });
  });

  describe('codeSchema', () => {
    test('accepts alphanumeric codes with dashes and underscores', () => {
      const schema = codeSchema(20);
      expect(schema.safeParse('ABC123').success).toBe(true);
      expect(schema.safeParse('test-code').success).toBe(true);
      expect(schema.safeParse('test_code').success).toBe(true);
    });

    test('rejects codes with special characters', () => {
      const schema = codeSchema(20);
      expect(schema.safeParse('code@123').success).toBe(false);
      expect(schema.safeParse('code#123').success).toBe(false);
    });

    test('enforces max length', () => {
      const schema = codeSchema(5);
      expect(schema.safeParse('ABC').success).toBe(true);
      expect(schema.safeParse('TOOLONG').success).toBe(false);
    });
  });

  // ============================================
  // USER VALIDATION SCHEMAS
  // ============================================

  describe('createUserSchema', () => {
    test('accepts valid user data', () => {
      const validUser = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
        role: 'USER' as const,
        divisionId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const invalidUser = {
        email: 'user@example.com',
        firstName: 'John',
      };
      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('rejects invalid role', () => {
      const invalidUser = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
        role: 'INVALID_ROLE',
      };
      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('allows optional divisionId', () => {
      const validUser = {
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-123-4567',
        role: 'ADMIN' as const,
      };
      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });
  });

  describe('updateUserSchema', () => {
    test('accepts partial user updates', () => {
      const update = { firstName: 'Jane' };
      const result = updateUserSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    test('accepts empty update object', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // PURCHASE ORDER VALIDATION SCHEMAS
  // ============================================

  describe('poLineItemSchema', () => {
    test('accepts valid line item', () => {
      const validItem = {
        itemDescription: 'Test item',
        quantity: 10,
        unitOfMeasure: 'EA',
        unitPrice: 25.50,
        glAccountId: '123e4567-e89b-12d3-a456-426614174000',
        isTaxable: true,
      };
      const result = poLineItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    test('defaults isTaxable to true', () => {
      const item = {
        itemDescription: 'Test item',
        quantity: 5,
        unitOfMeasure: 'EA',
        unitPrice: 10.00,
        glAccountId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = poLineItemSchema.safeParse(item);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isTaxable).toBe(true);
      }
    });

    test('rejects negative quantity', () => {
      const invalidItem = {
        itemDescription: 'Test item',
        quantity: -5,
        unitOfMeasure: 'EA',
        unitPrice: 10.00,
        glAccountId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = poLineItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    test('rejects empty description', () => {
      const invalidItem = {
        itemDescription: '',
        quantity: 5,
        unitOfMeasure: 'EA',
        unitPrice: 10.00,
        glAccountId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = poLineItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('createPOSchema', () => {
    const validLineItem = {
      itemDescription: 'Test item',
      quantity: 1,
      unitOfMeasure: 'EA',
      unitPrice: 100.00,
      glAccountId: '123e4567-e89b-12d3-a456-426614174000',
      isTaxable: true,
    };

    test('accepts valid PO data', () => {
      const validPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: '123e4567-e89b-12d3-a456-426614174001',
        divisionId: '123e4567-e89b-12d3-a456-426614174002',
        lineItems: [validLineItem],
        status: 'Draft' as const,
      };
      const result = createPOSchema.safeParse(validPO);
      expect(result.success).toBe(true);
    });

    test('rejects PO with no line items', () => {
      const invalidPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: '123e4567-e89b-12d3-a456-426614174001',
        divisionId: '123e4567-e89b-12d3-a456-426614174002',
        lineItems: [],
      };
      const result = createPOSchema.safeParse(invalidPO);
      expect(result.success).toBe(false);
    });

    test('rejects PO exceeding $1M total', () => {
      const expensiveItem = { ...validLineItem, quantity: 1, unitPrice: 1000001 };
      const invalidPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: '123e4567-e89b-12d3-a456-426614174001',
        divisionId: '123e4567-e89b-12d3-a456-426614174002',
        lineItems: [expensiveItem],
      };
      const result = createPOSchema.safeParse(invalidPO);
      expect(result.success).toBe(false);
    });

    test('rejects PO with more than 50 line items', () => {
      const tooManyItems = Array(51).fill(validLineItem);
      const invalidPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: '123e4567-e89b-12d3-a456-426614174001',
        divisionId: '123e4567-e89b-12d3-a456-426614174002',
        lineItems: tooManyItems,
      };
      const result = createPOSchema.safeParse(invalidPO);
      expect(result.success).toBe(false);
    });

    test('allows optional fields', () => {
      const poWithOptionals = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        vendorId: '123e4567-e89b-12d3-a456-426614174001',
        divisionId: '123e4567-e89b-12d3-a456-426614174002',
        lineItems: [validLineItem],
        notesInternal: 'Internal note',
        notesVendor: 'Vendor note',
        requiredByDate: '2024-12-31',
        termsCode: 'Net30',
      };
      const result = createPOSchema.safeParse(poWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('updatePOStatusSchema', () => {
    test('accepts valid status update', () => {
      const update = { status: 'Approved' as const, notes: 'Approved by manager' };
      const result = updatePOStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    test('rejects invalid status', () => {
      const update = { status: 'InvalidStatus' };
      const result = updatePOStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    test('allows optional notes', () => {
      const update = { status: 'Cancelled' as const };
      const result = updatePOStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // VENDOR VALIDATION SCHEMAS
  // ============================================

  describe('createVendorSchema', () => {
    test('accepts valid vendor data', () => {
      const validVendor = {
        vendorName: 'Test Vendor',
        vendorCode: 'TV01',
        vendorType: 'Material' as const,
        contactName: 'John Doe',
        contactEmail: 'john@vendor.com',
        contactPhone: '555-123-4567',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92101',
      };
      const result = createVendorSchema.safeParse(validVendor);
      expect(result.success).toBe(true);
    });

    test('rejects invalid state code', () => {
      const invalidVendor = {
        vendorName: 'Test Vendor',
        vendorCode: 'TV01',
        vendorType: 'Material' as const,
        contactName: 'John Doe',
        contactEmail: 'john@vendor.com',
        contactPhone: '555-123-4567',
        city: 'San Diego',
        state: 'CALIFORNIA',
        zipCode: '92101',
      };
      const result = createVendorSchema.safeParse(invalidVendor);
      expect(result.success).toBe(false);
    });

    test('rejects invalid ZIP code', () => {
      const invalidVendor = {
        vendorName: 'Test Vendor',
        vendorCode: 'TV01',
        vendorType: 'Material' as const,
        contactName: 'John Doe',
        contactEmail: 'john@vendor.com',
        contactPhone: '555-123-4567',
        city: 'San Diego',
        state: 'CA',
        zipCode: 'ABCDE',
      };
      const result = createVendorSchema.safeParse(invalidVendor);
      expect(result.success).toBe(false);
    });

    test('accepts ZIP+4 format', () => {
      const vendor = {
        vendorName: 'Test Vendor',
        vendorCode: 'TV01',
        vendorType: 'Material' as const,
        contactName: 'John Doe',
        contactEmail: 'john@vendor.com',
        contactPhone: '555-123-4567',
        city: 'San Diego',
        state: 'CA',
        zipCode: '92101-1234',
      };
      const result = createVendorSchema.safeParse(vendor);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // PROJECT VALIDATION SCHEMAS
  // ============================================

  describe('createProjectSchema', () => {
    test('accepts valid project data', () => {
      const validProject = {
        projectCode: 'PROJ-001',
        projectName: 'Test Project',
        districtCode: 'SD',
        districtName: 'San Diego',
        primaryDivisionId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'Active' as const,
        budgetTotal: 100000.00,
      };
      const result = createProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    test('defaults status to Active', () => {
      const project = {
        projectCode: 'PROJ-001',
        projectName: 'Test Project',
        districtCode: 'SD',
        districtName: 'San Diego',
        primaryDivisionId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = createProjectSchema.safeParse(project);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('Active');
      }
    });
  });

  // ============================================
  // WORK ORDER VALIDATION SCHEMAS
  // ============================================

  describe('createWorkOrderSchema', () => {
    test('accepts valid work order data', () => {
      const validWO = {
        title: 'Install Roofing',
        description: 'Install new roof',
        divisionId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'Pending' as const,
      };
      const result = createWorkOrderSchema.safeParse(validWO);
      expect(result.success).toBe(true);
    });

    test('rejects if end date is before start date', () => {
      const invalidWO = {
        title: 'Install Roofing',
        divisionId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        targetStartDate: '2024-12-31T00:00:00Z',
        targetEndDate: '2024-01-01T00:00:00Z',
      };
      const result = createWorkOrderSchema.safeParse(invalidWO);
      expect(result.success).toBe(false);
    });

    test('allows end date same as start date', () => {
      const validWO = {
        title: 'Same Day Work',
        divisionId: '123e4567-e89b-12d3-a456-426614174000',
        projectId: '123e4567-e89b-12d3-a456-426614174001',
        targetStartDate: '2024-06-15T00:00:00Z',
        targetEndDate: '2024-06-15T00:00:00Z',
      };
      const result = createWorkOrderSchema.safeParse(validWO);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // QUERY PARAMETER VALIDATION SCHEMAS
  // ============================================

  describe('paginationSchema', () => {
    test('transforms string to number', () => {
      const result = paginationSchema.safeParse({ page: '2', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });

    test('applies default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    test('rejects page less than 1', () => {
      const result = paginationSchema.safeParse({ page: '0', limit: '10' });
      expect(result.success).toBe(false);
    });

    test('rejects limit greater than 100', () => {
      const result = paginationSchema.safeParse({ page: '1', limit: '101' });
      expect(result.success).toBe(false);
    });
  });

  describe('poQuerySchema', () => {
    test('accepts valid PO query parameters', () => {
      const query = {
        status: 'Approved' as const,
        divisionId: '123e4567-e89b-12d3-a456-426614174000',
        page: '1',
        limit: '20',
      };
      const result = poQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    test('allows optional filters', () => {
      const query = { page: '1', limit: '10' };
      const result = poQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // AUTHENTICATION VALIDATION SCHEMAS
  // ============================================

  describe('loginSchema', () => {
    test('accepts valid login credentials', () => {
      const credentials = {
        email: 'user@example.com',
        password: 'password123',
      };
      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(true);
    });

    test('rejects missing password', () => {
      const credentials = { email: 'user@example.com', password: '' };
      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });

    test('rejects invalid email', () => {
      const credentials = { email: 'not-an-email', password: 'password123' };
      const result = loginSchema.safeParse(credentials);
      expect(result.success).toBe(false);
    });
  });

  describe('passwordChangeSchema', () => {
    test('accepts valid password change', () => {
      const change = {
        currentPassword: 'oldPass123!',
        newPassword: 'NewPass123!',
      };
      const result = passwordChangeSchema.safeParse(change);
      expect(result.success).toBe(true);
    });

    test('rejects weak password (no uppercase)', () => {
      const change = {
        currentPassword: 'oldPass123!',
        newPassword: 'newpass123!',
      };
      const result = passwordChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
    });

    test('rejects weak password (no number)', () => {
      const change = {
        currentPassword: 'oldPass123!',
        newPassword: 'NewPassword!',
      };
      const result = passwordChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
    });

    test('rejects weak password (no special character)', () => {
      const change = {
        currentPassword: 'oldPass123!',
        newPassword: 'NewPass123',
      };
      const result = passwordChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
    });

    test('rejects password shorter than 8 characters', () => {
      const change = {
        currentPassword: 'oldPass123!',
        newPassword: 'Np1!',
      };
      const result = passwordChangeSchema.safeParse(change);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // BULK OPERATION VALIDATION SCHEMAS
  // ============================================

  describe('bulkUpdatePOStatusSchema', () => {
    test('accepts valid bulk update', () => {
      const update = {
        poIds: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
        status: 'Approved' as const,
      };
      const result = bulkUpdatePOStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    test('rejects empty PO ID array', () => {
      const update = {
        poIds: [],
        status: 'Approved' as const,
      };
      const result = bulkUpdatePOStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    test('rejects more than 50 PO IDs', () => {
      const update = {
        poIds: Array(51).fill('123e4567-e89b-12d3-a456-426614174000'),
        status: 'Cancelled' as const,
      };
      const result = bulkUpdatePOStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // QUICK PO CREATION (PHASE 1)
  // ============================================

  describe('quickCreatePOSchema', () => {
    test('accepts minimal quick PO data', () => {
      const quickPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        divisionId: '123e4567-e89b-12d3-a456-426614174001',
      };
      const result = quickCreatePOSchema.safeParse(quickPO);
      expect(result.success).toBe(true);
    });

    test('accepts quick PO with work order creation', () => {
      const quickPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        divisionId: '123e4567-e89b-12d3-a456-426614174001',
        createWorkOrder: { title: 'New Work Order' },
      };
      const result = quickCreatePOSchema.safeParse(quickPO);
      expect(result.success).toBe(true);
    });

    test('accepts quick PO with optional fields', () => {
      const quickPO = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        divisionId: '123e4567-e89b-12d3-a456-426614174001',
        clientId: '123e4567-e89b-12d3-a456-426614174002',
        propertyId: '123e4567-e89b-12d3-a456-426614174003',
        workOrderId: '123e4567-e89b-12d3-a456-426614174004',
        notesInternal: 'Internal note',
      };
      const result = quickCreatePOSchema.safeParse(quickPO);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // COMPLETE PO (PHASE 2)
  // ============================================

  describe('completePOSchema', () => {
    const validLineItem = {
      itemDescription: 'Test item',
      quantity: 1,
      unitOfMeasure: 'EA',
      unitPrice: 100.00,
      glAccountId: '123e4567-e89b-12d3-a456-426614174000',
      isTaxable: true,
    };

    test('accepts valid PO completion data', () => {
      const completePO = {
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        lineItems: [validLineItem],
      };
      const result = completePOSchema.safeParse(completePO);
      expect(result.success).toBe(true);
    });

    test('rejects completion without line items', () => {
      const incompletePO = {
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        lineItems: [],
      };
      const result = completePOSchema.safeParse(incompletePO);
      expect(result.success).toBe(false);
    });

    test('accepts status Draft or Approved only', () => {
      const draftPO = {
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        lineItems: [validLineItem],
        status: 'Draft' as const,
      };
      expect(completePOSchema.safeParse(draftPO).success).toBe(true);

      const approvedPO = {
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        lineItems: [validLineItem],
        status: 'Approved' as const,
      };
      expect(completePOSchema.safeParse(approvedPO).success).toBe(true);
    });

    test('rejects invalid status values', () => {
      const invalidPO = {
        vendorId: '123e4567-e89b-12d3-a456-426614174000',
        lineItems: [validLineItem],
        status: 'Submitted' as any,
      };
      const result = completePOSchema.safeParse(invalidPO);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // PROPERTY VALIDATION SCHEMAS
  // ============================================

  describe('createPropertySchema', () => {
    test('accepts valid property data', () => {
      const validProperty = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        propertyName: 'Main Office Building',
        propertyAddress: '123 Main St',
        city: 'San Diego',
        state: 'CA',
        zip: '92101',
      };
      const result = createPropertySchema.safeParse(validProperty);
      expect(result.success).toBe(true);
    });

    test('accepts minimal property data', () => {
      const minimalProperty = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        propertyName: 'Property Name Only',
      };
      const result = createPropertySchema.safeParse(minimalProperty);
      expect(result.success).toBe(true);
    });

    test('rejects missing clientId', () => {
      const invalidProperty = {
        propertyName: 'Test Property',
      };
      const result = createPropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });

    test('rejects empty property name', () => {
      const invalidProperty = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        propertyName: '',
      };
      const result = createPropertySchema.safeParse(invalidProperty);
      expect(result.success).toBe(false);
    });
  });
});
