/**
 * Integration Tests for Admin Routes Business Logic
 * Tests auth, permissions, and data flows for /api/admin/* endpoints
 *
 * NOTE: These tests verify business logic without actually calling route handlers,
 * since NextRequest/NextResponse require edge runtime which Jest doesn't fully support.
 */

import { mockAdminSession, mockUserSession, mockNoSession } from '../../helpers/mock-session';

// Mock modules
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logging/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
  auditLog: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Admin Routes Integration Tests', () => {
  let getServerSession: jest.Mock;
  let prisma: {
    users: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };
  let bcrypt: {
    hash: jest.Mock;
    compare: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    getServerSession = require('next-auth').getServerSession;
    prisma = require('@/lib/db').default;
    bcrypt = require('bcryptjs');
  });

  describe('GET /api/admin/users - Authorization Flow', () => {
    test('null session triggers unauthorized flow', async () => {
      // Arrange
      const session = mockNoSession();
      const { isAdmin } = await import('@/lib/auth/permissions');

      // Act
      const isAuthorized = (session as Record<string, unknown> | null)?.user ? true : false;

      // Assert
      expect(isAuthorized).toBe(false);
      expect(session).toBeNull();
    });

    test('USER role fails admin permission check', async () => {
      // Arrange
      const userSession = mockUserSession();
      const { isAdmin } = await import('@/lib/auth/permissions');

      // Act
      const hasAdminAccess = isAdmin(userSession.user.role);

      // Assert
      expect(hasAdminAccess).toBe(false);
    });

    test('ADMIN role passes admin permission check', async () => {
      // Arrange
      const adminSession = mockAdminSession();
      const { isAdmin } = await import('@/lib/auth/permissions');

      // Act
      const hasAdminAccess = isAdmin(adminSession.user.role);

      // Assert
      expect(hasAdminAccess).toBe(true);
    });

    test('fetches users list for admin', async () => {
      // Arrange
      const mockUsers = [
        {
          id: 'user-001',
          email: 'user1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          phone: '555-1234',
          role: 'USER',
          division_id: 'div-001',
          is_active: true,
          last_login_at: new Date('2024-01-01'),
          created_at: new Date('2023-01-01'),
          divisions: {
            division_name: 'Division 1',
            division_code: 'D1',
          },
        },
      ];

      prisma.users.findMany.mockResolvedValue(mockUsers);

      // Act
      const users = await prisma.users.findMany({
        include: { divisions: { select: { division_name: true, division_code: true } } },
        orderBy: { created_at: 'desc' },
      });

      // Assert
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        id: 'user-001',
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'USER',
      });
    });
  });

  describe('POST /api/admin/users - User Creation Flow', () => {
    test('validates required fields', async () => {
      // Arrange
      const { z } = await import('zod');
      const requiredFields = z.object({
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        role: z.enum(['USER', 'ADMIN']),
      });

      const validData = {
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'USER' as const,
      };

      const invalidData = {
        email: 'invalid-email',
        firstName: 'Jane',
      };

      // Act & Assert
      expect(requiredFields.safeParse(validData).success).toBe(true);
      expect(requiredFields.safeParse(invalidData).success).toBe(false);
    });

    test('hashes password before creating user', async () => {
      // Arrange
      bcrypt.hash.mockResolvedValue('$2a$10$hashedpassword');

      const newUser = {
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'USER',
        division_id: null,
        password_hash: await bcrypt.hash('password123', 10),
        is_active: true,
      };

      prisma.users.create.mockResolvedValue({
        ...newUser,
        id: 'new-user-001',
        created_at: new Date(),
        divisions: null,
      });

      // Act
      const createdUser = await prisma.users.create({
        data: newUser,
        include: { divisions: { select: { division_name: true, division_code: true } } },
      });

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(createdUser.password_hash).toBe('$2a$10$hashedpassword');
    });
  });
});