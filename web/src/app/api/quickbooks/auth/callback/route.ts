/**
 * QuickBooks OAuth Callback Route
 * Handles OAuth callback and token exchange
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createOAuthClient, validateQBConfig } from '@/lib/quickbooks/config';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      console.error('QB OAuth error:', error, errorDescription);

      // Redirect to a page showing the error
      const redirectUrl = new URL('/settings?qb_error=auth_failed', request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Validate required parameters
    if (!code || !realmId || !state) {
      console.error('Missing required OAuth parameters:', { code: !!code, realmId: !!realmId, state: !!state });

      const redirectUrl = new URL('/settings?qb_error=invalid_callback', request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Verify session and state
    const session = await getServerSession(authOptions);
    if (!session || !state.includes(`user_${session.user.id}`)) {
      console.error('Invalid session or state:', { hasSession: !!session, state });

      const redirectUrl = new URL('/settings?qb_error=invalid_session', request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Validate QB configuration
    try {
      validateQBConfig();
    } catch (configError: any) {
      console.error('QB configuration error:', configError.message);

      const redirectUrl = new URL('/settings?qb_error=config_error', request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    // Create OAuth client and exchange code for tokens
    const oauthClient = createOAuthClient();

    try {
      const authResponse = await oauthClient.createToken(request.url);
      const tokens = authResponse.getJson();

      if (!tokens || !tokens.access_token || !tokens.refresh_token) {
        throw new Error('Invalid token response from QuickBooks');
      }

      // Calculate token expiration
      const expiresIn = tokens.expires_in || 3600; // Default to 1 hour
      const tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));

      // Store tokens in database (deactivate any existing tokens first)
      await prisma.$transaction(async (tx) => {
        // Deactivate existing tokens for this realm
        await tx.qb_auth_tokens.updateMany({
          where: { realm_id: realmId, is_active: true },
          data: { is_active: false },
        });

        // Create new token record
        await tx.qb_auth_tokens.create({
          data: {
            realm_id: realmId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: tokenExpiresAt,
            is_active: true,
          },
        });
      });

      console.log(`QB tokens stored successfully for realm: ${realmId}`);

      // Redirect to success page
      const redirectUrl = new URL('/settings?qb_success=connected', request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);

    } catch (tokenError) {
      console.error('Token exchange error:', tokenError);

      const redirectUrl = new URL('/settings?qb_error=token_exchange', request.nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

  } catch (error) {
    console.error('QB OAuth callback error:', error);

    const redirectUrl = new URL('/settings?qb_error=callback_failed', request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }
}