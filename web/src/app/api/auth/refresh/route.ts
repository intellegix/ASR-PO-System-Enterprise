import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { normalizeRole, isAdmin } from '@/lib/auth/permissions';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RefreshRequest {
  refreshToken: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

export async function POST(request: NextRequest) {
  try {
    const body: RefreshRequest = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JWTPayload;
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Get user from database to ensure they still exist and are active
    const user = await prisma.users.findFirst({
      where: {
        id: payload.userId,
        is_active: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Get user permissions based on role
    const permissions = getUserPermissions(user.role);

    // Create new JWT payload with fresh data
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate new tokens
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
    const newRefreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const response = {
      success: true,
      token,
      refreshToken: newRefreshToken,
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
    console.error('Token refresh error:', error);
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