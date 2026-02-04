/**
 * Role-Based Access Control (RBAC) for ASR PO System
 *
 * ROLE: MAJORITY_OWNER
 *   - Can: View all divisions
 *   - Can: Approve any PO above threshold
 *   - Can: Modify division assignments
 *   - Can: View all dashboards & reports
 *
 * ROLE: DIVISION_LEADER
 *   - Can: Create POs for ANY division
 *   - Can: Approve POs for their division ONLY
 *   - Can: View all POs across all divisions (READ-ONLY for other divisions)
 *   - Can: Issue approved POs to vendors
 *   - Can: View division-specific dashboard & spend
 *   - Cannot: Approve, modify, or cancel POs outside their division
 *
 * ROLE: OPERATIONS_MANAGER
 *   - Can: Create POs for Repairs division
 *   - Cannot: Approve (requires owner approval)
 *
 * ROLE: ACCOUNTING
 *   - Read-only access, can export data
 */

export type UserRole = 'MAJORITY_OWNER' | 'DIVISION_LEADER' | 'OPERATIONS_MANAGER' | 'ACCOUNTING';

export type Permission =
  | 'po:create'
  | 'po:create:any_division'
  | 'po:read'
  | 'po:read:own_division'
  | 'po:read:all_divisions'
  | 'po:approve'
  | 'po:approve:own_division'
  | 'po:reject'
  | 'po:issue'
  | 'po:edit'
  | 'po:edit:own_division'
  | 'po:cancel'
  | 'po:delete'
  | 'po:export'
  | 'wo:create'
  | 'wo:read'
  | 'wo:edit'
  | 'vendor:read'
  | 'vendor:create'
  | 'vendor:edit'
  | 'project:read'
  | 'project:create'
  | 'project:edit'
  | 'report:view'
  | 'report:export'
  | 'settings:view'
  | 'settings:edit'
  | 'division:modify_assignments'
  | 'user:manage';

// Permission sets for each role
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  MAJORITY_OWNER: [
    'po:create',
    'po:create:any_division',
    'po:read',
    'po:read:own_division',
    'po:read:all_divisions',
    'po:approve',
    'po:approve:own_division',
    'po:reject',
    'po:issue',
    'po:edit',
    'po:edit:own_division',
    'po:cancel',
    'po:delete',
    'po:export',
    'wo:create',
    'wo:read',
    'wo:edit',
    'vendor:read',
    'vendor:create',
    'vendor:edit',
    'project:read',
    'project:create',
    'project:edit',
    'report:view',
    'report:export',
    'settings:view',
    'settings:edit',
    'division:modify_assignments',
    'user:manage',
  ],
  DIVISION_LEADER: [
    'po:create',
    'po:create:any_division', // Can create POs for ANY division
    'po:read',
    'po:read:own_division',
    'po:read:all_divisions', // Read-only for other divisions
    'po:approve:own_division', // Approve ONLY for their division
    'po:reject', // Only for own division (enforced in function)
    'po:issue', // Issue approved POs to vendors
    'po:edit:own_division', // Edit ONLY for their division
    'po:export',
    'wo:create',
    'wo:read',
    'wo:edit',
    'vendor:read',
    'project:read',
    'report:view',
    'report:export',
    'settings:view',
  ],
  OPERATIONS_MANAGER: [
    'po:create',
    'po:read',
    'po:read:own_division',
    'po:read:all_divisions',
    'po:edit:own_division',
    'po:export',
    'wo:create',
    'wo:read',
    'wo:edit',
    'vendor:read',
    'project:read',
    'report:view',
  ],
  ACCOUNTING: [
    'po:read',
    'po:read:all_divisions',
    'po:export',
    'wo:read',
    'vendor:read',
    'project:read',
    'report:view',
    'report:export',
  ],
};

// Approval thresholds
export const APPROVAL_THRESHOLDS = {
  OPERATIONS_MANAGER_LIMIT: 2500, // OM can approve up to $2,500
  OWNER_APPROVAL_REQUIRED: 25000, // Over $25K requires majority owner
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if user can create POs in a specific division
 *
 * REVISED RULES:
 * - MAJORITY_OWNER: Can create POs for any division
 * - DIVISION_LEADER: Can create POs for ANY division (changed!)
 * - OPERATIONS_MANAGER: Can create POs for their division only (Repairs)
 * - ACCOUNTING: Cannot create POs
 */
export function canCreatePOInDivision(
  userRole: UserRole,
  userDivisionId: string | null,
  targetDivisionId: string
): boolean {
  // Majority Owner can create for any division
  if (userRole === 'MAJORITY_OWNER') return true;

  // Division Leader can create for ANY division
  if (userRole === 'DIVISION_LEADER') return true;

  // Operations Manager can only create for their own division
  if (userRole === 'OPERATIONS_MANAGER') {
    return userDivisionId === targetDivisionId;
  }

  // Accounting cannot create
  if (userRole === 'ACCOUNTING') return false;

  return false;
}

/**
 * Check if user can approve a PO
 *
 * RULES:
 * - MAJORITY_OWNER: Can approve any PO
 * - DIVISION_LEADER: Can ONLY approve POs in their division
 * - OPERATIONS_MANAGER: Cannot approve (requires owner approval)
 * - ACCOUNTING: Cannot approve
 */
export function canApprovePO(
  userRole: UserRole,
  userDivisionId: string | null,
  poDivisionId: string,
  poAmount: number
): { canApprove: boolean; reason?: string } {
  // Accounting cannot approve
  if (userRole === 'ACCOUNTING') {
    return { canApprove: false, reason: 'Accounting users cannot approve POs' };
  }

  // Operations Manager cannot approve - requires owner approval
  if (userRole === 'OPERATIONS_MANAGER') {
    return { canApprove: false, reason: 'Operations Manager POs require owner approval' };
  }

  // Division Leader can ONLY approve their division's POs
  if (userRole === 'DIVISION_LEADER') {
    if (userDivisionId !== poDivisionId) {
      return { canApprove: false, reason: 'Can only approve POs in your division' };
    }
    if (poAmount > APPROVAL_THRESHOLDS.OWNER_APPROVAL_REQUIRED) {
      return {
        canApprove: false,
        reason: `Requires majority owner co-approval for amounts over $${APPROVAL_THRESHOLDS.OWNER_APPROVAL_REQUIRED.toLocaleString()}`,
      };
    }
    return { canApprove: true };
  }

  // Majority Owner can approve anything
  if (userRole === 'MAJORITY_OWNER') {
    return { canApprove: true };
  }

  return { canApprove: false, reason: 'Insufficient permissions' };
}

/**
 * Check if user can edit a PO
 *
 * RULES:
 * - MAJORITY_OWNER: Can edit any PO (Draft/Rejected status only)
 * - DIVISION_LEADER: Can ONLY edit POs in their division
 * - OPERATIONS_MANAGER: Can only edit their own division's POs
 * - ACCOUNTING: Cannot edit
 */
export function canEditPO(
  userRole: UserRole,
  userDivisionId: string | null,
  poDivisionId: string,
  poStatus: string
): boolean {
  // Can only edit Draft or Rejected POs
  if (!['Draft', 'Rejected'].includes(poStatus)) {
    return false;
  }

  if (userRole === 'MAJORITY_OWNER') return true;
  if (userRole === 'ACCOUNTING') return false;

  // Division Leader and OM can ONLY edit their division's POs
  return userDivisionId === poDivisionId;
}

/**
 * Check if user can cancel a PO
 *
 * RULES:
 * - MAJORITY_OWNER: Can cancel any PO
 * - DIVISION_LEADER: Can ONLY cancel POs in their division
 * - OPERATIONS_MANAGER: Cannot cancel
 * - ACCOUNTING: Cannot cancel
 */
export function canCancelPO(
  userRole: UserRole,
  userDivisionId: string | null,
  poDivisionId: string
): boolean {
  if (userRole === 'MAJORITY_OWNER') return true;

  if (userRole === 'DIVISION_LEADER') {
    return userDivisionId === poDivisionId;
  }

  return false; // OM and Accounting cannot cancel
}

/**
 * Check if user can issue a PO to vendor
 *
 * RULES:
 * - MAJORITY_OWNER: Can issue any approved PO
 * - DIVISION_LEADER: Can issue approved POs to vendors
 * - OPERATIONS_MANAGER: Cannot issue
 * - ACCOUNTING: Cannot issue
 */
export function canIssuePO(userRole: UserRole): boolean {
  return userRole === 'MAJORITY_OWNER' || userRole === 'DIVISION_LEADER';
}

/**
 * Check if user can view full PO details (vs read-only)
 * All roles can view all POs, but editing is restricted
 */
export function canViewFullPODetails(
  userRole: UserRole,
  userDivisionId: string | null,
  poDivisionId: string
): boolean {
  // Everyone can view full details for read purposes
  return true;
}

/**
 * Check if user is viewing PO in read-only mode
 * (for POs outside their division)
 */
export function isReadOnlyForPO(
  userRole: UserRole,
  userDivisionId: string | null,
  poDivisionId: string
): boolean {
  if (userRole === 'MAJORITY_OWNER') return false;
  if (userRole === 'ACCOUNTING') return true;

  // Division Leader and OM are read-only for other divisions
  return userDivisionId !== poDivisionId;
}

/**
 * Check if user can modify division assignments
 */
export function canModifyDivisionAssignments(userRole: UserRole): boolean {
  return userRole === 'MAJORITY_OWNER';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    MAJORITY_OWNER: 'Owner',
    DIVISION_LEADER: 'Division Leader',
    OPERATIONS_MANAGER: 'Operations Manager',
    ACCOUNTING: 'Accounting',
  };
  return names[role] || role;
}

/**
 * Get actions available for a user on a specific PO
 */
export function getAvailableActions(
  userRole: UserRole,
  userDivisionId: string | null,
  poDivisionId: string,
  poStatus: string,
  poAmount: number
): string[] {
  const actions: string[] = [];

  // View is always available
  actions.push('view');

  // Check edit permission
  if (canEditPO(userRole, userDivisionId, poDivisionId, poStatus)) {
    actions.push('edit');
  }

  // Check approve permission (only for Draft/Submitted status)
  if (['Draft', 'Submitted'].includes(poStatus)) {
    const { canApprove } = canApprovePO(userRole, userDivisionId, poDivisionId, poAmount);
    if (canApprove) {
      actions.push('approve');
      actions.push('reject');
    }
  }

  // Check issue permission (only for Approved status)
  if (poStatus === 'Approved' && canIssuePO(userRole)) {
    actions.push('issue');
  }

  // Check cancel permission
  if (!['Cancelled', 'Paid'].includes(poStatus)) {
    if (canCancelPO(userRole, userDivisionId, poDivisionId)) {
      actions.push('cancel');
    }
  }

  // Export is available for all
  if (hasPermission(userRole, 'po:export')) {
    actions.push('export');
  }

  return actions;
}