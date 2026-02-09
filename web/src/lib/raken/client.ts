/**
 * Raken API Client
 * OAuth2 token refresh + project fetching with pagination
 */

import log from '@/lib/logging/logger';

const RAKEN_TOKEN_URL = 'https://app.rakenapp.com/oauth/token';
const RAKEN_API_BASE = 'https://developer.rakenapp.com/api';

export interface RakenProject {
  uuid: string;
  name: string;
  number: string;
  status: string;
}

interface RakenTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface RakenProjectsResponse {
  data: Array<{
    uuid: string;
    name: string;
    number: string;
    status: string;
    [key: string]: unknown;
  }>;
  meta?: {
    total: number;
    offset: number;
    limit: number;
  };
}

// In-memory token cache (server-side singleton via module scope)
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Refresh the OAuth2 access token using the stored refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const clientId = getEnvVar('RAKEN_CLIENT_ID');
  const clientSecret = getEnvVar('RAKEN_CLIENT_SECRET');
  const refreshToken = getEnvVar('RAKEN_REFRESH_TOKEN');

  log.info('Raken: Refreshing access token');

  const response = await fetch(RAKEN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Raken: Token refresh failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Raken token refresh failed (${response.status}): ${errorText}`);
  }

  const data: RakenTokenResponse = await response.json();

  cachedAccessToken = data.access_token;
  // Expire 60s early to avoid edge cases
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

  log.info('Raken: Access token refreshed successfully', {
    expiresIn: data.expires_in,
  });

  return cachedAccessToken;
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }
  return refreshAccessToken();
}

/**
 * Make an authenticated GET request to the Raken API
 */
async function rakenGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${RAKEN_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    log.error('Raken API request failed', {
      path,
      status: response.status,
      error: errorText,
    });
    throw new Error(`Raken API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch all active projects from Raken, paginating through results.
 * Filters to only CY-prefixed job numbers (certified payroll contracts).
 */
export async function fetchActiveProjects(): Promise<RakenProject[]> {
  const allProjects: RakenProject[] = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  log.info('Raken: Fetching active projects');

  while (hasMore) {
    const response = await rakenGet<RakenProjectsResponse>('/projects', {
      statuses: 'ACTIVE',
      limit: String(limit),
      offset: String(offset),
    });

    const projects = response.data || [];

    for (const p of projects) {
      // Only include CY-prefixed contracts
      if (p.number && p.number.startsWith('CY')) {
        allProjects.push({
          uuid: p.uuid,
          name: p.name,
          number: p.number,
          status: p.status,
        });
      }
    }

    // Check if there are more pages
    if (projects.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  log.info('Raken: Fetched active projects', {
    total: allProjects.length,
    pages: Math.ceil(offset / limit) + 1,
  });

  return allProjects;
}
