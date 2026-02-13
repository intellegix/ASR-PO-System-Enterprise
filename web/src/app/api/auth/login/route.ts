import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { normalizeRole, isAdmin } from '@/lib/auth/permissions';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

interface LoginRequest {
  identifier: string;
  password: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Identifier and password are required' },
        { status: 400 }
      );
    }

    // Normalize identifier to email format
    let email = identifier.toLowerCase();
    if (!email.includes('@')) {
      email = `${email}@allsurfaceroofing.com`;
    }

    // Find user in database
    const user = await prisma.users.findFirst({
      where: {
        email: email,
        is_active: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For demo purposes, if there's no hashed password, check against demo passwords
    let isValidPassword = false;

    if (user.password_hash) {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else {
      // Demo password check
      const demoPasswords: Record<string, string> = {
        'intellegix@allsurfaceroofing.com': 'Devops$@2026',
        'owner1@allsurfaceroofing.com': 'demo123',
        'owner2@allsurfaceroofing.com': 'demo123',
        'owner3@allsurfaceroofing.com': 'demo123',
        'owner4@allsurfaceroofing.com': 'demo123',
        'owner5@allsurfaceroofing.com': 'demo123',
        'owner6@allsurfaceroofing.com': 'demo123',
        'opsmgr@allsurfaceroofing.com': 'demo123',
        'accounting@allsurfaceroofing.com': 'demo123',
      };
      isValidPassword = demoPasswords[email] === password;
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get user permissions based on role
    const permissions = getUserPermissions(user.role);

    // Create JWT payload
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate tokens
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const response = {
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        divisionId: user.division_id,
        division: null, // Would need to fetch separately if needed
        permissions,
      },
      expiresIn: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getUserPermissions(role: string): string[] {
  // Simplified 2-role permission system
  const _normalized = normalizeRole(role);

  if (isAdmin(role)) {
    // ADMIN gets all permissions including settings and user management
    return ['admin', 'read', 'write', 'approve', 'delete', 'reports', 'settings', 'users'];
  } else {
    // USER gets everything except settings and user management
    return ['read', 'write', 'approve', 'delete', 'reports'];
  }
}