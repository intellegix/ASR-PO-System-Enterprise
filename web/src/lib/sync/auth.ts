/**
 * Sync API Key Authentication
 * Validates server-to-server requests between Certified Payroll and P.O. System
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import log from '@/lib/logging/logger';

const SYNC_API_KEY = process.env.SYNC_API_KEY;

export interface SyncAuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Validate the Authorization: Bearer <key> header against SYNC_API_KEY.
 */
export function validateSyncApiKey(request: NextRequest): SyncAuthResult {
  if (!SYNC_API_KEY) {
    log.error('SYNC_API_KEY not configured on server');
    return { authenticated: false, error: 'Sync not configured' };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return { authenticated: false, error: 'Invalid Authorization format. Expected: Bearer <token>' };
  }

  // Timing-safe comparison to prevent timing attacks
  const tokenBuf = Buffer.from(token);
  const keyBuf = Buffer.from(SYNC_API_KEY);
  if (tokenBuf.length !== keyBuf.length || !timingSafeEqual(tokenBuf, keyBuf)) {
    log.security('Invalid sync API key attempt', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return { authenticated: false, error: 'Invalid API key' };
  }

  return { authenticated: true };
}

/**
 * Returns a 401 JSON response for failed sync auth.
 */
export function syncUnauthorizedResponse(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 401 });
}
