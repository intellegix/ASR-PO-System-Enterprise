/**
 * Role-Based Access Control (RBAC) for ASR PO System
 *
 * Simplified 2-role model (Phase 1):
 *   ADMIN — Full access including settings and user management
 *   USER  — Full CRUD on POs, work orders, vendors, projects, reports (no settings/user mgmt)
 *
 * Legacy roles (DIRECTOR_OF_SYSTEMS_INTEGRATIONS, MAJORITY_OWNER, DIVISION_LEADER,
 * OPERATIONS_MANAGER, ACCOUNTING) are mapped to USER or ADMIN for backward compatibility.
 */

export type UserRole =
  | 'USER'
  | 'ADMIN'
  // Legacy roles — mapped to USER or ADMIN at runtime
  | 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS'
  | 'DIVISION_LEADER'
  | 'OPERATIONS_MANAGER'
  | 'ACCOUNTING'
  | 'MAJORITY_OWNER';

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

/**
 * Normalize any legacy role string to USER or ADMIN
 */
export function normalizeRole(role: UserRole | string): 'USER' | 'ADMIN' {
  switch (role) {
    case 'ADMIN':
    case 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS':
    case 'MAJORITY_OWNER':
      return 'ADMIN';
    case 'USER':
    case 'DIVISION_LEADER':
    case 'OPERATIONS_MANAGER':
    case 'ACCOUNTING':
    default:
      return 'USER';
  }
}

// All permissions available in the system
const ALL_PERMISSIONS: Permission[] = [
  'po:create', 'po:create:any_division', 'po:read', 'po:read:own_division',
  'po:read:all_divisions', 'po:approve', 'po:approve:own_division', 'po:reject',
  'po:issue', 'po:edit', 'po:edit:own_division', 'po:cancel', 'po:delete',
  'po:export', 'wo:create', 'wo:read', 'wo:edit', 'vendor:read', 'vendor:create',
  'vendor:edit', 'project:read', 'project:create', 'project:edit', 'report:view',
  'report:export', 'settings:view', 'settings:edit', 'division:modify_assignments',
  'user:manage',
];

// USER gets everything except settings:edit, user:manage, division:modify_assignments
const USER_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => !['settings:edit', 'user:manage', 'division:modify_assignments'].includes(p)
);

// Permission sets for the two roles
const ROLE_PERMISSIONS: Record<'USER' | 'ADMIN', Permission[]> = {
  USER: USER_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS,
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const normalized = normalizeRole(userRole);
  return ROLE_PERMISSIONS[normalized].includes(permission);
}

/**
 * Check if user is an admin (for UI gating)
 */
export function isAdmin(userRole: UserRole | string): boolean {
  return normalizeRole(userRole) === 'ADMIN';
}

/**
 * Check if user can create POs in any division — all users can
 */
export function canCreatePOInDivision(
  _userRole: UserRole,
  _userDivisionId: string | null,
  _targetDivisionId: string
): boolean {
  return true;
}

/**
 * Check if user can approve a PO — all users can, no thresholds
 */
export function canApprovePO(
  _userRole: UserRole,
  _userDivisionId: string | null,
  _poDivisionId: string,
  _poAmount: number
): { canApprove: boolean; reason?: string } {
  return { canApprove: true };
}

/**
 * Check if user can edit a PO (Draft/Rejected status only, no division restriction)
 */
export function canEditPO(
  _userRole: UserRole,
  _userDivisionId: string | null,
  _poDivisionId: string,
  poStatus: string
): boolean {
  return ['Draft', 'Rejected'].includes(poStatus);
}

/**
 * Check if user can cancel a PO — all users can
 */
export function canCancelPO(
  _userRole: UserRole,
  _userDivisionId: string | null,
  _poDivisionId: string
): boolean {
  return true;
}

/**
 * Check if user can issue a PO to vendor — all users can
 */
export function canIssuePO(_userRole: UserRole): boolean {
  return true;
}

/**
 * Check if user can view full PO details — everyone can
 */
export function canViewFullPODetails(
  _userRole: UserRole,
  _userDivisionId: string | null,
  _poDivisionId: string
): boolean {
  return true;
}

/**
 * Check if user can modify division assignments — admin only
 */
export function canModifyDivisionAssignments(userRole: UserRole): boolean {
  return isAdmin(userRole);
}

/**
 * Get role display name (handles both new and legacy roles)
 */
export function getRoleDisplayName(role: UserRole | string): string {
  const names: Record<string, string> = {
    ADMIN: 'Administrator',
    USER: 'User',
    // Legacy display names for audit trail / historical data
    DIRECTOR_OF_SYSTEMS_INTEGRATIONS: 'Director of Systems Integrations',
    MAJORITY_OWNER: 'Majority Owner',
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
  const actions: string[] = ['view'];

  if (canEditPO(userRole, userDivisionId, poDivisionId, poStatus)) {
    actions.push('edit');
  }

  if (['Draft', 'Submitted'].includes(poStatus)) {
    const { canApprove } = canApprovePO(userRole, userDivisionId, poDivisionId, poAmount);
    if (canApprove) {
      actions.push('approve');
      actions.push('reject');
    }
  }

  if (poStatus === 'Approved' && canIssuePO(userRole)) {
    actions.push('issue');
  }

  if (!['Cancelled', 'Paid'].includes(poStatus)) {
    if (canCancelPO(userRole, userDivisionId, poDivisionId)) {
      actions.push('cancel');
    }
  }

  if (hasPermission(userRole, 'po:export')) {
    actions.push('export');
  }

  return actions;
}
