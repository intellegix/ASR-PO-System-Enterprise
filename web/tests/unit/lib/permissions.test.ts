/**
 * Test Suite for RBAC Permission System
 * Tests role-based access control for the ASR PO System
 */

import {
  hasPermission,
  canApprovePO,
  canEditPO,
  canCancelPO,
  canCreatePOInDivision,
  canIssuePO,
  canViewFullPODetails,
  isReadOnlyForPO,
  canModifyDivisionAssignments,
  getRoleDisplayName,
  getAvailableActions,
  APPROVAL_THRESHOLDS,
  type UserRole,
  type Permission,
} from '@/lib/auth/permissions';

describe('RBAC Permission System', () => {
  // Sample division IDs for testing
  const division1 = 'div-001';
  const division2 = 'div-002';

  // ============================================
  // hasPermission TESTS
  // ============================================

  describe('hasPermission', () => {
    describe('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', () => {
      test('should have all permissions', () => {
        const permissions: Permission[] = [
          'po:create',
          'po:create:any_division',
          'po:read',
          'po:approve',
          'po:edit',
          'po:cancel',
          'po:delete',
          'report:view',
          'user:manage',
          'division:modify_assignments',
        ];

        permissions.forEach((permission) => {
          expect(hasPermission('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', permission)).toBe(true);
        });
      });
    });

    describe('DIVISION_LEADER', () => {
      test('should have division leader permissions', () => {
        expect(hasPermission('DIVISION_LEADER', 'po:create')).toBe(true);
        expect(hasPermission('DIVISION_LEADER', 'po:create:any_division')).toBe(true);
        expect(hasPermission('DIVISION_LEADER', 'po:read:all_divisions')).toBe(true);
        expect(hasPermission('DIVISION_LEADER', 'po:approve:own_division')).toBe(true);
        expect(hasPermission('DIVISION_LEADER', 'po:issue')).toBe(true);
      });

      test('should NOT have admin permissions', () => {
        expect(hasPermission('DIVISION_LEADER', 'user:manage')).toBe(false);
        expect(hasPermission('DIVISION_LEADER', 'division:modify_assignments')).toBe(false);
        expect(hasPermission('DIVISION_LEADER', 'po:delete')).toBe(false);
      });
    });

    describe('OPERATIONS_MANAGER', () => {
      test('should have limited permissions', () => {
        expect(hasPermission('OPERATIONS_MANAGER', 'po:create')).toBe(true);
        expect(hasPermission('OPERATIONS_MANAGER', 'po:read')).toBe(true);
        expect(hasPermission('OPERATIONS_MANAGER', 'report:view')).toBe(true);
      });

      test('should NOT have approval or admin permissions', () => {
        expect(hasPermission('OPERATIONS_MANAGER', 'po:approve')).toBe(false);
        expect(hasPermission('OPERATIONS_MANAGER', 'po:approve:own_division')).toBe(false);
        expect(hasPermission('OPERATIONS_MANAGER', 'po:issue')).toBe(false);
        expect(hasPermission('OPERATIONS_MANAGER', 'user:manage')).toBe(false);
      });
    });

    describe('ACCOUNTING', () => {
      test('should have read-only permissions', () => {
        expect(hasPermission('ACCOUNTING', 'po:read')).toBe(true);
        expect(hasPermission('ACCOUNTING', 'po:export')).toBe(true);
        expect(hasPermission('ACCOUNTING', 'report:view')).toBe(true);
      });

      test('should NOT have write or admin permissions', () => {
        expect(hasPermission('ACCOUNTING', 'po:create')).toBe(false);
        expect(hasPermission('ACCOUNTING', 'po:edit')).toBe(false);
        expect(hasPermission('ACCOUNTING', 'po:approve')).toBe(false);
        expect(hasPermission('ACCOUNTING', 'user:manage')).toBe(false);
      });
    });
  });

  // ============================================
  // canCreatePOInDivision TESTS
  // ============================================

  describe('canCreatePOInDivision', () => {
    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS can create in any division', () => {
      expect(canCreatePOInDivision('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1)).toBe(true);
      expect(canCreatePOInDivision('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division2)).toBe(true);
      expect(canCreatePOInDivision('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', null, division2)).toBe(true);
    });

    test('DIVISION_LEADER can create in any division', () => {
      expect(canCreatePOInDivision('DIVISION_LEADER', division1, division1)).toBe(true);
      expect(canCreatePOInDivision('DIVISION_LEADER', division1, division2)).toBe(true);
    });

    test('OPERATIONS_MANAGER can only create in own division', () => {
      expect(canCreatePOInDivision('OPERATIONS_MANAGER', division1, division1)).toBe(true);
      expect(canCreatePOInDivision('OPERATIONS_MANAGER', division1, division2)).toBe(false);
      expect(canCreatePOInDivision('OPERATIONS_MANAGER', null, division1)).toBe(false);
    });

    test('ACCOUNTING cannot create POs', () => {
      expect(canCreatePOInDivision('ACCOUNTING', division1, division1)).toBe(false);
      expect(canCreatePOInDivision('ACCOUNTING', division1, division2)).toBe(false);
    });
  });

  // ============================================
  // canApprovePO TESTS
  // ============================================

  describe('canApprovePO', () => {
    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS can approve any PO regardless of amount', () => {
      const result1 = canApprovePO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division2, 1000);
      expect(result1.canApprove).toBe(true);

      const result2 = canApprovePO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division2, 100000);
      expect(result2.canApprove).toBe(true);
    });

    test('DIVISION_LEADER can approve own division under $25K', () => {
      const result = canApprovePO('DIVISION_LEADER', division1, division1, 10000);
      expect(result.canApprove).toBe(true);
    });

    test('DIVISION_LEADER cannot approve other divisions', () => {
      const result = canApprovePO('DIVISION_LEADER', division1, division2, 1000);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('Can only approve POs in your division');
    });

    test('DIVISION_LEADER cannot approve over $25K', () => {
      const result = canApprovePO('DIVISION_LEADER', division1, division1, 30000);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('Requires majority owner co-approval');
    });

    test('DIVISION_LEADER can approve exactly $25K', () => {
      const result = canApprovePO('DIVISION_LEADER', division1, division1, 25000);
      expect(result.canApprove).toBe(true);
    });

    test('OPERATIONS_MANAGER cannot approve any PO', () => {
      const result = canApprovePO('OPERATIONS_MANAGER', division1, division1, 1000);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('Operations Manager POs require owner approval');
    });

    test('ACCOUNTING cannot approve any PO', () => {
      const result = canApprovePO('ACCOUNTING', division1, division1, 1000);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('Accounting users cannot approve POs');
    });

    test('handles null division ID correctly', () => {
      const result = canApprovePO('DIVISION_LEADER', null, division1, 1000);
      expect(result.canApprove).toBe(false);
    });
  });

  // ============================================
  // canEditPO TESTS
  // ============================================

  describe('canEditPO', () => {
    test('can only edit Draft or Rejected POs', () => {
      expect(canEditPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, 'Draft')).toBe(true);
      expect(canEditPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, 'Rejected')).toBe(true);

      const nonEditableStatuses = ['Submitted', 'Approved', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled'];
      nonEditableStatuses.forEach((status) => {
        expect(canEditPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, status)).toBe(false);
      });
    });

    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS can edit any division when status allows', () => {
      expect(canEditPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division2, 'Draft')).toBe(true);
      expect(canEditPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', null, division2, 'Rejected')).toBe(true);
    });

    test('DIVISION_LEADER can only edit own division', () => {
      expect(canEditPO('DIVISION_LEADER', division1, division1, 'Draft')).toBe(true);
      expect(canEditPO('DIVISION_LEADER', division1, division2, 'Draft')).toBe(false);
    });

    test('OPERATIONS_MANAGER can only edit own division', () => {
      expect(canEditPO('OPERATIONS_MANAGER', division1, division1, 'Draft')).toBe(true);
      expect(canEditPO('OPERATIONS_MANAGER', division1, division2, 'Draft')).toBe(false);
    });

    test('ACCOUNTING cannot edit any PO', () => {
      expect(canEditPO('ACCOUNTING', division1, division1, 'Draft')).toBe(false);
      expect(canEditPO('ACCOUNTING', division1, division1, 'Rejected')).toBe(false);
    });
  });

  // ============================================
  // canCancelPO TESTS
  // ============================================

  describe('canCancelPO', () => {
    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS can cancel any division', () => {
      expect(canCancelPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1)).toBe(true);
      expect(canCancelPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division2)).toBe(true);
      expect(canCancelPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', null, division2)).toBe(true);
    });

    test('DIVISION_LEADER can only cancel own division', () => {
      expect(canCancelPO('DIVISION_LEADER', division1, division1)).toBe(true);
      expect(canCancelPO('DIVISION_LEADER', division1, division2)).toBe(false);
    });

    test('OPERATIONS_MANAGER cannot cancel', () => {
      expect(canCancelPO('OPERATIONS_MANAGER', division1, division1)).toBe(false);
      expect(canCancelPO('OPERATIONS_MANAGER', division1, division2)).toBe(false);
    });

    test('ACCOUNTING cannot cancel', () => {
      expect(canCancelPO('ACCOUNTING', division1, division1)).toBe(false);
      expect(canCancelPO('ACCOUNTING', division1, division2)).toBe(false);
    });
  });

  // ============================================
  // canIssuePO TESTS
  // ============================================

  describe('canIssuePO', () => {
    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS can issue', () => {
      expect(canIssuePO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe(true);
    });

    test('DIVISION_LEADER can issue', () => {
      expect(canIssuePO('DIVISION_LEADER')).toBe(true);
    });

    test('OPERATIONS_MANAGER cannot issue', () => {
      expect(canIssuePO('OPERATIONS_MANAGER')).toBe(false);
    });

    test('ACCOUNTING cannot issue', () => {
      expect(canIssuePO('ACCOUNTING')).toBe(false);
    });
  });

  // ============================================
  // canViewFullPODetails TESTS
  // ============================================

  describe('canViewFullPODetails', () => {
    test('all roles can view full details', () => {
      const roles: UserRole[] = [
        'DIRECTOR_OF_SYSTEMS_INTEGRATIONS',
        'DIVISION_LEADER',
        'OPERATIONS_MANAGER',
        'ACCOUNTING',
      ];

      roles.forEach((role) => {
        expect(canViewFullPODetails(role, division1, division1)).toBe(true);
        expect(canViewFullPODetails(role, division1, division2)).toBe(true);
      });
    });
  });

  // ============================================
  // isReadOnlyForPO TESTS
  // ============================================

  describe('isReadOnlyForPO', () => {
    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS is never read-only', () => {
      expect(isReadOnlyForPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1)).toBe(false);
      expect(isReadOnlyForPO('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division2)).toBe(false);
    });

    test('ACCOUNTING is always read-only', () => {
      expect(isReadOnlyForPO('ACCOUNTING', division1, division1)).toBe(true);
      expect(isReadOnlyForPO('ACCOUNTING', division1, division2)).toBe(true);
    });

    test('DIVISION_LEADER is read-only for other divisions', () => {
      expect(isReadOnlyForPO('DIVISION_LEADER', division1, division1)).toBe(false);
      expect(isReadOnlyForPO('DIVISION_LEADER', division1, division2)).toBe(true);
    });

    test('OPERATIONS_MANAGER is read-only for other divisions', () => {
      expect(isReadOnlyForPO('OPERATIONS_MANAGER', division1, division1)).toBe(false);
      expect(isReadOnlyForPO('OPERATIONS_MANAGER', division1, division2)).toBe(true);
    });
  });

  // ============================================
  // canModifyDivisionAssignments TESTS
  // ============================================

  describe('canModifyDivisionAssignments', () => {
    test('only DIRECTOR_OF_SYSTEMS_INTEGRATIONS can modify division assignments', () => {
      expect(canModifyDivisionAssignments('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe(true);
      expect(canModifyDivisionAssignments('DIVISION_LEADER')).toBe(false);
      expect(canModifyDivisionAssignments('OPERATIONS_MANAGER')).toBe(false);
      expect(canModifyDivisionAssignments('ACCOUNTING')).toBe(false);
    });
  });

  // ============================================
  // getRoleDisplayName TESTS
  // ============================================

  describe('getRoleDisplayName', () => {
    test('returns correct display names', () => {
      expect(getRoleDisplayName('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe('Director of Systems Integrations');
      expect(getRoleDisplayName('DIVISION_LEADER')).toBe('Division Leader');
      expect(getRoleDisplayName('OPERATIONS_MANAGER')).toBe('Operations Manager');
      expect(getRoleDisplayName('ACCOUNTING')).toBe('Accounting');
    });
  });

  // ============================================
  // getAvailableActions TESTS (integration)
  // ============================================

  describe('getAvailableActions', () => {
    test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS has all actions on Draft PO', () => {
      const actions = getAvailableActions('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, 'Draft', 5000);
      expect(actions).toContain('view');
      expect(actions).toContain('edit');
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
      expect(actions).toContain('cancel');
      expect(actions).toContain('export');
    });

    test('DIVISION_LEADER has edit/approve/reject on own division Draft PO under $25K', () => {
      const actions = getAvailableActions('DIVISION_LEADER', division1, division1, 'Draft', 10000);
      expect(actions).toContain('view');
      expect(actions).toContain('edit');
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
      expect(actions).toContain('cancel');
      expect(actions).toContain('export');
    });

    test('DIVISION_LEADER cannot approve own division Draft PO over $25K', () => {
      const actions = getAvailableActions('DIVISION_LEADER', division1, division1, 'Draft', 30000);
      expect(actions).toContain('view');
      expect(actions).toContain('edit');
      expect(actions).not.toContain('approve');
      expect(actions).not.toContain('reject');
    });

    test('DIVISION_LEADER read-only on other division', () => {
      const actions = getAvailableActions('DIVISION_LEADER', division1, division2, 'Draft', 5000);
      expect(actions).toContain('view');
      expect(actions).toContain('export');
      expect(actions).not.toContain('edit');
      expect(actions).not.toContain('approve');
      expect(actions).not.toContain('cancel');
    });

    test('OPERATIONS_MANAGER has limited actions on own division', () => {
      const actions = getAvailableActions('OPERATIONS_MANAGER', division1, division1, 'Draft', 1000);
      expect(actions).toContain('view');
      expect(actions).toContain('edit');
      expect(actions).toContain('export');
      expect(actions).not.toContain('approve');
      expect(actions).not.toContain('cancel');
    });

    test('ACCOUNTING has only view/export', () => {
      const actions = getAvailableActions('ACCOUNTING', division1, division1, 'Draft', 5000);
      expect(actions).toContain('view');
      expect(actions).toContain('export');
      expect(actions).not.toContain('edit');
      expect(actions).not.toContain('approve');
      expect(actions).not.toContain('cancel');
    });

    test('issue action available only for Approved status', () => {
      const actions = getAvailableActions('DIVISION_LEADER', division1, division1, 'Approved', 5000);
      expect(actions).toContain('issue');

      const draftActions = getAvailableActions('DIVISION_LEADER', division1, division1, 'Draft', 5000);
      expect(draftActions).not.toContain('issue');
    });

    test('no cancel action on Cancelled or Paid status', () => {
      const cancelledActions = getAvailableActions('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, 'Cancelled', 5000);
      expect(cancelledActions).not.toContain('cancel');

      const paidActions = getAvailableActions('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, 'Paid', 5000);
      expect(paidActions).not.toContain('cancel');
    });

    test('no edit action on non-Draft/Rejected status', () => {
      const actions = getAvailableActions('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', division1, division1, 'Approved', 5000);
      expect(actions).not.toContain('edit');
    });
  });

  // ============================================
  // APPROVAL_THRESHOLDS TESTS
  // ============================================

  describe('APPROVAL_THRESHOLDS', () => {
    test('thresholds are set to expected values', () => {
      expect(APPROVAL_THRESHOLDS.OPERATIONS_MANAGER_LIMIT).toBe(2500);
      expect(APPROVAL_THRESHOLDS.OWNER_APPROVAL_REQUIRED).toBe(25000);
    });
  });
});
