/**
 * Shared Mock Session Helpers for Integration Tests
 * Provides reusable session mock patterns for testing Next.js API routes
 */

export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    divisionId: string | null;
    divisionName: string | null;
    divisionCode: string | null;
  };
}

/**
 * Returns a mock session for an admin user
 */
export function mockAdminSession(): MockSession {
  return {
    user: {
      id: 'admin-001',
      email: 'admin@allsurfaceroofing.com',
      name: 'Admin User',
      role: 'ADMIN',
      divisionId: null,
      divisionName: null,
      divisionCode: null,
    },
  };
}

/**
 * Returns a mock session for a regular user
 */
export function mockUserSession(): MockSession {
  return {
    user: {
      id: 'user-001',
      email: 'user@allsurfaceroofing.com',
      name: 'Regular User',
      role: 'USER',
      divisionId: 'div-001',
      divisionName: 'Commercial Projects',
      divisionCode: 'CP',
    },
  };
}

/**
 * Returns null session (unauthenticated)
 */
export function mockNoSession(): null {
  return null;
}
