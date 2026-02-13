/**
 * QuickBooks OAuth Authentication Route
 * Handles OAuth initiation and generates authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createOAuthClient, QB_SCOPES, validateQBConfig } from '@/lib/quickbooks/config';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


export async function GET(_request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate QB configuration
    try {
      validateQBConfig();
    } catch (error: unknown) {
      return NextResponse.json(
        { error: 'QuickBooks configuration error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Create OAuth client
    const oauthClient = createOAuthClient();

    // Generate authorization URL
    const authUri = oauthClient.authorizeUri({
      scope: QB_SCOPES,
      state: `user_${session.user.id}_${Date.now()}`, // Include user ID and timestamp for security
    });

    return NextResponse.json({
      success: true,
      authUrl: authUri,
      message: 'QuickBooks authorization URL generated successfully',
    });
  } catch (error) {
    console.error('QB OAuth initiation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initiate QuickBooks authorization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}