
// Stub permissions for frontend-only build
export const getRoleDisplayName = (role: string) => role;
export const hasPermission = () => false;
export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};
