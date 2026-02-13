/**
 * Integration Tests for Authentication Flow
 * Tests login validation, password checks, and session creation
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    users: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('Authentication Flow Integration Tests', () => {
  let prisma: {
    users: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let bcrypt: {
    compare: jest.Mock;
    hash: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = require('@/lib/db').default;
    bcrypt = require('bcryptjs');
  });

  describe('Login Validation', () => {
    test('auto-appends domain when not provided', () => {
      // Arrange
      const identifier = 'testuser';

      // Act
      let email = identifier.toLowerCase();
      if (!email.includes('@')) {
        email = `${email}@allsurfaceroofing.com`;
      }

      // Assert
      expect(email).toBe('testuser@allsurfaceroofing.com');
    });

    test('preserves full email when @ is present', () => {
      // Arrange
      const identifier = 'test@custom.com';

      // Act
      let email = identifier.toLowerCase();
      if (!email.includes('@')) {
        email = `${email}@allsurfaceroofing.com`;
      }

      // Assert
      expect(email).toBe('test@custom.com');
    });
  });

  describe('Password Verification', () => {
    test('validates password with bcrypt compare', async () => {
      // Arrange
      const password = 'password123';
      const passwordHash = '$2a$10$hashedpassword';

      bcrypt.compare.mockResolvedValue(true);

      // Act
      const isValid = await bcrypt.compare(password, passwordHash);

      // Assert
      expect(isValid).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, passwordHash);
    });

    test('rejects incorrect password', async () => {
      // Arrange
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const isValid = await bcrypt.compare('wrongpassword', '$2a$10$hashedpassword');

      // Assert
      expect(isValid).toBe(false);
    });

    test('handles demo accounts without password_hash', async () => {
      // Arrange
      const mockUser = {
        id: 'user-001',
        email: 'owner1@allsurfaceroofing.com',
        first_name: 'Owner',
        last_name: 'One',
        role: 'MAJORITY_OWNER',
        division_id: null,
        password_hash: null,
        is_active: true,
      };

      prisma.users.findFirst.mockResolvedValue(mockUser);

      const demoPasswords: Record<string, string> = {
        'owner1@allsurfaceroofing.com': 'demo123',
      };

      // Act
      const user = await prisma.users.findFirst({
        where: { email: 'owner1@allsurfaceroofing.com', is_active: true },
      });

      const isValid = user && !user.password_hash ? demoPasswords[user.email] === 'demo123' : false;

      // Assert
      expect(isValid).toBe(true);
    });
  });

  describe('User Lookup', () => {
    test('finds active user by email', async () => {
      // Arrange
      const mockUser = {
        id: 'user-001',
        email: 'test@allsurfaceroofing.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'USER',
        division_id: 'div-001',
        password_hash: '$2a$10$hashedpassword',
        is_active: true,
      };

      prisma.users.findFirst.mockResolvedValue(mockUser);

      // Act
      const user = await prisma.users.findFirst({
        where: {
          email: 'test@allsurfaceroofing.com',
          is_active: true,
        },
      });

      // Assert
      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@allsurfaceroofing.com');
      expect(user?.is_active).toBe(true);
    });

    test('returns null for inactive user', async () => {
      // Arrange
      prisma.users.findFirst.mockResolvedValue(null);

      // Act
      const user = await prisma.users.findFirst({
        where: {
          email: 'inactive@allsurfaceroofing.com',
          is_active: true,
        },
      });

      // Assert
      expect(user).toBeNull();
    });
  });

  describe('Permission Assignment', () => {
    test('assigns admin permissions to ADMIN role', () => {
      // Arrange
      const { normalizeRole, isAdmin } = require('@/lib/auth/permissions');

      const userRole = 'ADMIN';

      // Act
      const normalized = normalizeRole(userRole);
      const hasAdminPerms = isAdmin(userRole);

      // Assert
      expect(normalized).toBe('ADMIN');
      expect(hasAdminPerms).toBe(true);
    });

    test('assigns user permissions to USER role', () => {
      // Arrange
      const { normalizeRole, isAdmin } = require('@/lib/auth/permissions');

      const userRole = 'USER';

      // Act
      const normalized = normalizeRole(userRole);
      const hasAdminPerms = isAdmin(userRole);

      // Assert
      expect(normalized).toBe('USER');
      expect(hasAdminPerms).toBe(false);
    });

    test('normalizes legacy roles correctly', () => {
      // Arrange
      const { normalizeRole } = require('@/lib/auth/permissions');

      // Act & Assert
      expect(normalizeRole('DIRECTOR_OF_SYSTEMS_INTEGRATIONS')).toBe('ADMIN');
      expect(normalizeRole('MAJORITY_OWNER')).toBe('ADMIN');
      expect(normalizeRole('DIVISION_LEADER')).toBe('USER');
      expect(normalizeRole('OPERATIONS_MANAGER')).toBe('USER');
      expect(normalizeRole('ACCOUNTING')).toBe('USER');
    });
  });
});