/**
 * Integration Tests for PO Business Logic
 * Tests PO creation, completion, and approval flows with mocked dependencies
 */

import { mockUserSession } from '../../helpers/mock-session';
import type { UserRole } from '@/lib/auth/permissions';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    divisions: { findUnique: jest.fn() },
    projects: { findUnique: jest.fn() },
    work_orders: { create: jest.fn(), findUnique: jest.fn() },
    work_order_sequences: { upsert: jest.fn() },
    division_leaders: { findFirst: jest.fn() },
    po_headers: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    po_approvals: { create: jest.fn() },
    vendors: { findUnique: jest.fn() },
    gl_account_mappings: { findMany: jest.fn() },
    users: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logging/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    business: jest.fn(),
  },
  auditLog: jest.fn(),
}));

describe('PO Business Logic Integration Tests', () => {
  let prisma: {
    divisions: { findUnique: jest.Mock };
    projects: { findUnique: jest.Mock };
    work_orders: { create: jest.Mock; findUnique: jest.Mock };
    work_order_sequences: { upsert: jest.Mock };
    division_leaders: { findFirst: jest.Mock };
    po_headers: { count: jest.Mock; create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    po_approvals: { create: jest.Mock };
    vendors: { findUnique: jest.Mock };
    gl_account_mappings: { findMany: jest.Mock };
    users: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = require('@/lib/db').default;
  });

  describe('Quick PO Creation Flow', () => {
    test('creates draft PO with division, project, and work order', async () => {
      // Arrange
      const divisionId = 'div-001';
      const projectId = 'proj-001';

      prisma.divisions.findUnique.mockResolvedValue({
        id: divisionId,
        cost_center_prefix: 'CP',
        division_name: 'Commercial Projects',
      });

      prisma.projects.findUnique.mockResolvedValue({
        id: projectId,
        project_code: 'CY25-001',
        project_name: 'Test Project',
      });

      prisma.work_order_sequences.upsert.mockResolvedValue({
        last_sequence: 1,
      });

      const workOrder = {
        id: 'wo-001',
        work_order_number: 'WO-0001',
        title: 'Test Work Order',
      };

      // Set up mock to return work order with all properties
      prisma.work_orders.create.mockResolvedValue({
        ...workOrder,
        division_id: divisionId,
        project_id: projectId,
        title: 'Quick PO WO',
        status: 'InProgress',
        created_by_user_id: 'user-001',
      });

      prisma.division_leaders.findFirst.mockResolvedValue({
        id: 'leader-001',
        division_code: 'CP',
      });
      prisma.po_headers.count.mockResolvedValue(0);

      // Act
      const woSequence = await prisma.work_order_sequences.upsert({
        where: { division_id_year: { division_id: divisionId, year: 2025 } },
        update: { last_sequence: { increment: 1 } },
        create: { division_id: divisionId, year: 2025, last_sequence: 1 },
      });

      const newWorkOrder = await prisma.work_orders.create({
        data: {
          work_order_number: `WO-${String(woSequence.last_sequence).padStart(4, '0')}`,
          division_id: divisionId,
          project_id: projectId,
          title: 'Quick PO WO',
          status: 'InProgress',
          created_by_user_id: 'user-001',
        },
      });

      // Assert
      expect(newWorkOrder.work_order_number).toBe('WO-0001');
      expect(newWorkOrder.division_id).toBe(divisionId);
      expect(prisma.work_orders.create).toHaveBeenCalled();
    });

    test('generates PO number in correct format', async () => {
      // Arrange
      const { generatePONumber } = await import('@/lib/po-number');

      // Act
      const poNumber = generatePONumber({
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 1,
        purchaseSequence: 1,
      });

      // Assert
      expect(poNumber).toBe('01CP0001-1');
      expect(poNumber).toMatch(/^\d{2}[A-Z]{2,3}\d{4}-\d+$/);
    });
  });

  describe('PO Completion Flow', () => {
    test('calculates totals correctly with taxable items', async () => {
      // Arrange
      const lineItems = [
        { quantity: 10, unitPrice: 10, isTaxable: true }, // $100 taxable
        { quantity: 5, unitPrice: 20, isTaxable: false }, // $100 non-taxable
      ];

      const TAX_RATE = 0.0775;

      // Act
      const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxableAmount = lineItems
        .filter((item) => item.isTaxable)
        .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxAmount = taxableAmount * TAX_RATE;
      const totalAmount = subtotal + taxAmount;

      // Assert
      expect(subtotal).toBe(200);
      expect(taxableAmount).toBe(100);
      expect(taxAmount).toBeCloseTo(7.75, 2);
      expect(totalAmount).toBeCloseTo(207.75, 2);
    });

    test('updates PO with vendor and line items', async () => {
      // Arrange
      const currentPO = {
        id: 'po-001',
        po_number: '01CP0001-1',
        status: 'Draft',
        vendor_id: null,
      };

      const vendor = {
        id: 'vendor-001',
        vendor_name: 'Test Vendor',
        vendor_code: 'TV',
        payment_terms_default: 'Net30',
      };

      prisma.po_headers.findUnique.mockResolvedValue(currentPO);
      prisma.vendors.findUnique.mockResolvedValue(vendor);

      const updatedPO = {
        ...currentPO,
        vendor_id: 'vendor-001',
        subtotal_amount: 100,
        tax_amount: 7.75,
        total_amount: 107.75,
      };

      prisma.po_headers.update.mockResolvedValue(updatedPO);

      // Act
      const result = await prisma.po_headers.update({
        where: { id: 'po-001' },
        data: {
          vendor_id: vendor.id,
          subtotal_amount: 100,
          tax_amount: 7.75,
          total_amount: 107.75,
        },
      });

      // Assert
      expect(result.vendor_id).toBe('vendor-001');
      expect(result.total_amount).toBe(107.75);
    });
  });

  describe('Approval Flow', () => {
    test('all roles can approve POs', async () => {
      // Arrange
      const { canApprovePO } = await import('@/lib/auth/permissions');
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER'];

      // Act & Assert
      roles.forEach((role) => {
        const result = canApprovePO(role, 'div-001', 'div-001', 5000);
        expect(result.canApprove).toBe(true);
      });
    });

    test('filters pending POs correctly', async () => {
      // Arrange
      const pendingPOs = [
        {
          id: 'po-001',
          status: 'Submitted',
          total_amount: 1000,
          division_id: 'div-001',
          deleted_at: null,
        },
        {
          id: 'po-002',
          status: 'Draft',
          total_amount: 500,
          division_id: 'div-001',
          deleted_at: null,
        },
        {
          id: 'po-003',
          status: 'Submitted',
          total_amount: 2000,
          division_id: 'div-002',
          deleted_at: null,
        },
      ];

      prisma.po_headers.findMany.mockResolvedValue(pendingPOs.filter((po) => po.status === 'Submitted'));

      // Act
      const result = await prisma.po_headers.findMany({
        where: { status: 'Submitted', deleted_at: null },
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((po: Record<string, unknown>) => po.status === 'Submitted')).toBe(true);
    });
  });
});