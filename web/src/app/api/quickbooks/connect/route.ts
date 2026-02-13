/**
 * QuickBooks Connection Management Route
 * Handles connecting/disconnecting QuickBooks accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createOAuthClient, QB_SCOPES, validateQBConfig } from '@/lib/quickbooks/config';
import { isAdmin } from '@/lib/auth/permissions';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin users to connect QuickBooks
    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only administrators can connect QuickBooks.' },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    if (action === 'initiate') {
      // Validate QB configuration
      try {
        validateQBConfig();
      } catch (error: unknown) {
        return NextResponse.json(
          { error: 'QuickBooks configuration error', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }

      // Create OAuth client and generate authorization URL
      const oauthClient = createOAuthClient();

      const authUri = oauthClient.authorizeUri({
        scope: QB_SCOPES,
        state: `connect_user_${session.user.id}_${Date.now()}`,
      });

      return NextResponse.json({
        success: true,
        authUrl: authUri,
        message: 'QuickBooks authorization URL generated',
      });

    } else if (action === 'disconnect') {
      // Deactivate all QB tokens
      const result = await prisma.qb_auth_tokens.updateMany({
        where: { is_active: true },
        data: { is_active: false },
      });

      return NextResponse.json({
        success: true,
        message: `QuickBooks disconnected. Deactivated ${result.count} token(s).`,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "initiate" or "disconnect".' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('QB connect error:', error);
    return NextResponse.json(
      {
        error: 'QuickBooks connection operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current connection status
    const activeToken = await prisma.qb_auth_tokens.findFirst({
      where: {
        is_active: true,
        token_expires_at: { gte: new Date() }, // Not expired
      },
      orderBy: { created_at: 'desc' },
    });

    const isConnected = !!activeToken;
    const connectionInfo = activeToken ? {
      realm_id: activeToken.realm_id,
      connected_at: activeToken.created_at,
      expires_at: activeToken.token_expires_at,
    } : null;

    return NextResponse.json({
      success: true,
      connected: isConnected,
      connection: connectionInfo,
      message: isConnected
        ? 'QuickBooks is connected and active'
        : 'QuickBooks is not connected or token has expired',
    });

  } catch (error) {
    console.error('QB connection status error:', error);
    return NextResponse.json(
      { error: 'Failed to check QuickBooks connection status' },
      { status: 500 }
    );
  }
}