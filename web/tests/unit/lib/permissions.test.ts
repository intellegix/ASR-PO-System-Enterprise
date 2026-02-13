/**
 * Test Suite for Simplified 2-Role RBAC Permission System
 * Phase 1: USER / ADMIN model with legacy role backward compatibility
 */

import {
  hasPermission,
  isAdmin,
  normalizeRole,
  canApprovePO,
  canEditPO,
  canCancelPO,
  canCreatePOInDivision,
  canIssuePO,
  canViewFullPODetails,
  canModifyDivisionAssignments,
  getRoleDisplayName,
  getAvailableActions,
  type UserRole,
  type Permission,
} from '@/lib/auth/permissions';

describe('Simplified 2-Role RBAC Permission System', () => {
  const division1 = 'div-001';
  const division2 = 'div-002';

  // ============================================
  // normalizeRole TESTS
  // ============================================

  describe('normalizeRole', () => {
    test('maps ADMIN to ADMIN', () => {
      expect(normalizeRole('ADMIN')).toBe('ADMIN');
    });

    test('maps USER to USER', () => {
      expect(normalizeRole('USER')).toBe('USER');
    });

    test('maps legacy admin roles to ADMIN', () => {
      expect(normalizeRole('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe('ADMIN');
      expect(normalizeRole('MAJORITY_OWNER')).toBe('ADMIN');
    });

    test('maps legacy non-admin roles to USER', () => {
      expect(normalizeRole('DIVISION_LEADER')).toBe('USER');
      expect(normalizeRole('OPERATIONS_MANAGER')).toBe('USER');
      expect(normalizeRole('ACCOUNTING')).toBe('USER');
    });

    test('maps unknown roles to USER', () => {
      expect(normalizeRole('UNKNOWN_ROLE')).toBe('USER');
    });
  });

  // ============================================
  // isAdmin TESTS
  // ============================================

  describe('isAdmin', () => {
    test('ADMIN role is admin', () => {
      expect(isAdmin('ADMIN')).toBe(true);
    });

    test('USER role is not admin', () => {
      expect(isAdmin('USER')).toBe(false);
    });

    test('legacy admin roles are admin', () => {
      expect(isAdmin('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe(true);
      expect(isAdmin('MAJORITY_OWNER')).toBe(true);
    });

    test('legacy non-admin roles are not admin', () => {
      expect(isAdmin('DIVISION_LEADER')).toBe(false);
      expect(isAdmin('OPERATIONS_MANAGER')).toBe(false);
      expect(isAdmin('ACCOUNTING')).toBe(false);
    });
  });

  // ============================================
  // hasPermission TESTS
  // ============================================

  describe('hasPermission', () => {
    describe('ADMIN role', () => {
      test('has all permissions', () => {
        const adminPerms: Permission[] = [
          'po:create', 'po:read', 'po:approve', 'po:edit', 'po:cancel',
          'po:delete', 'po:export', 'report:view', 'report:export',
          'settings:edit', 'user:manage', 'division:modify_assignments',
        ];
        adminPerms.forEach((perm) => {
          expect(hasPermission('ADMIN', perm)).toBe(true);
        });
      });
    });

    describe('USER role', () => {
      test('has CRUD and report permissions', () => {
        const userPerms: Permission[] = [
          'po:create', 'po:read', 'po:approve', 'po:edit', 'po:cancel',
          'po:delete', 'po:export', 'po:issue', 'wo:create', 'wo:read',
          'wo:edit', 'vendor:read', 'vendor:create', 'vendor:edit',
          'project:read', 'project:create', 'project:edit',
          'report:view', 'report:export', 'settings:view',
        ];
        userPerms.forEach((perm) => {
          expect(hasPermission('USER', perm)).toBe(true);
        });
      });

      test('does NOT have admin-only permissions', () => {
        expect(hasPermission('USER', 'settings:edit')).toBe(false);
        expect(hasPermission('USER', 'user:manage')).toBe(false);
        expect(hasPermission('USER', 'division:modify_assignments')).toBe(false);
      });
    });

    describe('legacy roles via normalizeRole', () => {
      test('DIRECTOR_OF_SYSTEMS_INTEGRATIONS has admin permissions', () => {
        expect(hasPermission('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'user:manage')).toBe(true);
        expect(hasPermission('DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'settings:edit')).toBe(true);
      });

      test('DIVISION_LEADER has user permissions (not admin)', () => {
        expect(hasPermission('DIVISION_LEADER', 'po:create')).toBe(true);
        expect(hasPermission('DIVISION_LEADER', 'po:approve')).toBe(true);
        expect(hasPermission('DIVISION_LEADER', 'user:manage')).toBe(false);
      });

      test('OPERATIONS_MANAGER has user permissions (not admin)', () => {
        expect(hasPermission('OPERATIONS_MANAGER', 'po:create')).toBe(true);
        expect(hasPermission('OPERATIONS_MANAGER', 'po:approve')).toBe(true);
        expect(hasPermission('OPERATIONS_MANAGER', 'user:manage')).toBe(false);
      });

      test('ACCOUNTING has user permissions (not admin)', () => {
        expect(hasPermission('ACCOUNTING', 'po:read')).toBe(true);
        expect(hasPermission('ACCOUNTING', 'po:create')).toBe(true);
        expect(hasPermission('ACCOUNTING', 'po:approve')).toBe(true);
        expect(hasPermission('ACCOUNTING', 'user:manage')).toBe(false);
      });
    });
  });

  // ============================================
  // canCreatePOInDivision TESTS
  // ============================================

  describe('canCreatePOInDivision', () => {
    test('all roles can create in any division', () => {
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'];
      roles.forEach((role) => {
        expect(canCreatePOInDivision(role, division1, division1)).toBe(true);
        expect(canCreatePOInDivision(role, division1, division2)).toBe(true);
        expect(canCreatePOInDivision(role, null, division2)).toBe(true);
      });
    });
  });

  // ============================================
  // canApprovePO TESTS
  // ============================================

  describe('canApprovePO', () => {
    test('all roles can approve any PO regardless of amount or division', () => {
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'];
      roles.forEach((role) => {
        const result = canApprovePO(role, division1, division2, 100000);
        expect(result.canApprove).toBe(true);
        expect(result.reason).toBeUndefined();
      });
    });

    test('handles null division ID', () => {
      const result = canApprovePO('USER', null, division1, 5000);
      expect(result.canApprove).toBe(true);
    });
  });

  // ============================================
  // canEditPO TESTS
  // ============================================

  describe('canEditPO', () => {
    test('can edit Draft POs regardless of role or division', () => {
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'];
      roles.forEach((role) => {
        expect(canEditPO(role, division1, division2, 'Draft')).toBe(true);
      });
    });

    test('can edit Rejected POs', () => {
      expect(canEditPO('USER', division1, division2, 'Rejected')).toBe(true);
    });

    test('cannot edit non-Draft/Rejected POs', () => {
      const statuses = ['Submitted', 'Approved', 'Issued', 'Received', 'Invoiced', 'Paid', 'Cancelled'];
      statuses.forEach((status) => {
        expect(canEditPO('ADMIN', division1, division1, status)).toBe(false);
      });
    });
  });

  // ============================================
  // canCancelPO TESTS
  // ============================================

  describe('canCancelPO', () => {
    test('all roles can cancel any PO', () => {
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'];
      roles.forEach((role) => {
        expect(canCancelPO(role, division1, division1)).toBe(true);
        expect(canCancelPO(role, division1, division2)).toBe(true);
        expect(canCancelPO(role, null, division2)).toBe(true);
      });
    });
  });

  // ============================================
  // canIssuePO TESTS
  // ============================================

  describe('canIssuePO', () => {
    test('all roles can issue POs', () => {
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'];
      roles.forEach((role) => {
        expect(canIssuePO(role)).toBe(true);
      });
    });
  });

  // ============================================
  // canViewFullPODetails TESTS
  // ============================================

  describe('canViewFullPODetails', () => {
    test('all roles can view full details across divisions', () => {
      const roles: UserRole[] = ['USER', 'ADMIN', 'DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING'];
      roles.forEach((role) => {
        expect(canViewFullPODetails(role, division1, division1)).toBe(true);
        expect(canViewFullPODetails(role, division1, division2)).toBe(true);
      });
    });
  });

  // ============================================
  // canModifyDivisionAssignments TESTS
  // ============================================

  describe('canModifyDivisionAssignments', () => {
    test('ADMIN can modify division assignments', () => {
      expect(canModifyDivisionAssignments('ADMIN')).toBe(true);
    });

    test('USER cannot modify division assignments', () => {
      expect(canModifyDivisionAssignments('USER')).toBe(false);
    });

    test('legacy admin roles can modify', () => {
      expect(canModifyDivisionAssignments('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe(true);
      expect(canModifyDivisionAssignments('MAJORITY_OWNER')).toBe(true);
    });

    test('legacy non-admin roles cannot modify', () => {
      expect(canModifyDivisionAssignments('DIVISION_LEADER')).toBe(false);
      expect(canModifyDivisionAssignments('OPERATIONS_MANAGER')).toBe(false);
      expect(canModifyDivisionAssignments('ACCOUNTING')).toBe(false);
    });
  });

  // ============================================
  // getRoleDisplayName TESTS
  // ============================================

  describe('getRoleDisplayName', () => {
    test('returns correct display names for new roles', () => {
      expect(getRoleDisplayName('ADMIN')).toBe('Administrator');
      expect(getRoleDisplayName('USER')).toBe('User');
    });

    test('returns correct display names for legacy roles', () => {
      expect(getRoleDisplayName('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe('Director of Systems Integrations');
      expect(getRoleDisplayName('MAJORITY_OWNER')).toBe('Majority Owner');
      expect(getRoleDisplayName('DIVISION_LEADER')).toBe('Division Leader');
      expect(getRoleDisplayName('OPERATIONS_MANAGER')).toBe('Operations Manager');
      expect(getRoleDisplayName('ACCOUNTING')).toBe('Accounting');
    });

    test('returns role string for unknown roles', () => {
      expect(getRoleDisplayName('UNKNOWN_ROLE')).toBe('UNKNOWN_ROLE');
    });
  });

  // ============================================
  // getAvailableActions TESTS
  // ============================================

  describe('getAvailableActions', () => {
    test('all actions on Draft PO for any user', () => {
      const actions = getAvailableActions('USER', division1, division2, 'Draft', 5000);
      expect(actions).toContain('view');
      expect(actions).toContain('edit');
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
      expect(actions).toContain('cancel');
      expect(actions).toContain('export');
    });

    test('issue action only on Approved status', () => {
      const approved = getAvailableActions('USER', division1, division1, 'Approved', 5000);
      expect(approved).toContain('issue');

      const draft = getAvailableActions('USER', division1, division1, 'Draft', 5000);
      expect(draft).not.toContain('issue');
    });

    test('no cancel action on Cancelled or Paid status', () => {
      expect(getAvailableActions('ADMIN', division1, division1, 'Cancelled', 5000)).not.toContain('cancel');
      expect(getAvailableActions('ADMIN', division1, division1, 'Paid', 5000)).not.toContain('cancel');
    });

    test('no edit action on non-Draft/Rejected status', () => {
      expect(getAvailableActions('ADMIN', division1, division1, 'Approved', 5000)).not.toContain('edit');
      expect(getAvailableActions('ADMIN', division1, division1, 'Issued', 5000)).not.toContain('edit');
    });

    test('approve/reject available on Submitted status', () => {
      const actions = getAvailableActions('USER', division1, division1, 'Submitted', 5000);
      expect(actions).toContain('approve');
      expect(actions).toContain('reject');
    });
  });
});
