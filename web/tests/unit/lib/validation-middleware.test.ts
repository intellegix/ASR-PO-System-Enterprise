/**
 * Test Suite: Validation Middleware
 *
 * Tests pure functions directly (sanitizeHtml, checkRateLimit, validateFileUpload, validatePathParams).
 * Functions requiring NextRequest are tested via mocked imports.
 */

import { z } from 'zod';

// Mock next/server before importing the module
jest.mock('next/server', () => {
  class MockHeaders {
    private headers: Map<string, string>;
    constructor(init?: Record<string, string>) {
      this.headers = new Map(init ? Object.entries(init) : []);
    }
    get(name: string) { return this.headers.get(name.toLowerCase()) || null; }
    set(name: string, value: string) { this.headers.set(name.toLowerCase(), value); }
    entries() { return this.headers.entries(); }
  }

  class MockNextRequest {
    url: string;
    method: string;
    headers: MockHeaders;
    private _body: unknown;

    constructor(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new MockHeaders(init?.headers);
      this._body = init?.body ? JSON.parse(init.body) : null;
    }

    async json() {
      if (this._body === null) throw new Error('No body');
      return this._body;
    }
  }

  class MockNextResponse {
    static responses: { body: unknown; status: number; headers: MockHeaders }[] = [];

    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const resp = {
        body,
        status: init?.status || 200,
        headers: new MockHeaders(init?.headers),
        async json() { return body; },
      };
      return resp;
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

import {
  sanitizeHtml,
  checkRateLimit,
  validateFileUpload,
  validatePathParams,
  validateRequestBody,
  validateQueryParams,
  withValidation,
  withRateLimit,
} from '@/lib/validation/middleware';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// sanitizeHtml — Pure function, no dependencies
// ============================================

describe('sanitizeHtml', () => {
  test('escapes HTML special characters', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  test('escapes quotes and apostrophes', () => {
    expect(sanitizeHtml('"hello"')).toContain('&quot;');
    expect(sanitizeHtml("it's")).toContain('&#x27;');
  });

  test('escapes forward slashes', () => {
    expect(sanitizeHtml('</script>')).toContain('&#x2F;');
  });

  test('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  test('handles plain text without special characters', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World');
  });

  test('prevents XSS injection attempts', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const result = sanitizeHtml(payload);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

// ============================================
// checkRateLimit — In-memory state, no Next.js deps
// ============================================

describe('checkRateLimit', () => {
  test('allows first request', () => {
    const id = `test-first-${Date.now()}`;
    const result = checkRateLimit(id, 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test('allows requests within limit', () => {
    const id = `test-within-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(id, 5, 60000);
      expect(result.allowed).toBe(true);
    }
  });

  test('blocks requests exceeding limit', () => {
    const id = `test-exceed-${Date.now()}`;
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(id, 5, 60000);
    }
    // 6th request should be blocked
    const result = checkRateLimit(id, 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('resets counter after window expires', () => {
    const id = `test-reset-${Date.now()}`;
    // Use very short window (1ms)
    checkRateLimit(id, 1, 1);

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    const result = checkRateLimit(id, 1, 1);
    expect(result.allowed).toBe(true);
  });

  test('uses different counters for different identifiers', () => {
    const id1 = `test-diff-a-${Date.now()}`;
    const id2 = `test-diff-b-${Date.now()}`;

    // Use up limit for id1
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id1, 3, 60000);
    }
    expect(checkRateLimit(id1, 3, 60000).allowed).toBe(false);

    // id2 should still be allowed
    expect(checkRateLimit(id2, 3, 60000).allowed).toBe(true);
  });
});

// ============================================
// validateFileUpload — Uses File API (available in jsdom)
// ============================================

describe('validateFileUpload', () => {
  function createMockFile(name: string, size: number, type: string): File {
    const content = new ArrayBuffer(size);
    return new File([content], name, { type });
  }

  test('validates file within size limit', () => {
    const file = createMockFile('photo.jpg', 1024 * 1024, 'image/jpeg');
    const result = validateFileUpload(file);
    expect(result.success).toBe(true);
  });

  test('rejects file exceeding size limit', () => {
    const file = createMockFile('huge.jpg', 20 * 1024 * 1024, 'image/jpeg');
    const result = validateFileUpload(file);
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.field).toBe('file');
    expect(result.errors?.[0]?.message).toContain('exceeds maximum');
  });

  test('rejects disallowed file type', () => {
    const file = createMockFile('malware.exe', 1024, 'application/x-msdownload');
    const result = validateFileUpload(file);
    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.message.includes('not allowed'))).toBe(true);
  });

  test('rejects disallowed file extension', () => {
    const file = createMockFile('data.xyz', 1024, 'image/jpeg');
    const result = validateFileUpload(file);
    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.message.includes('.xyz'))).toBe(true);
  });

  test('accepts custom file type options', () => {
    const file = createMockFile('doc.txt', 1024, 'text/plain');
    const result = validateFileUpload(file, {
      allowedTypes: ['text/plain'],
      allowedExtensions: ['.txt'],
    });
    expect(result.success).toBe(true);
  });

  test('accepts allowed image formats', () => {
    const formats = [
      { name: 'photo.jpg', type: 'image/jpeg' },
      { name: 'photo.png', type: 'image/png' },
      { name: 'photo.gif', type: 'image/gif' },
    ];

    formats.forEach(({ name, type }) => {
      const file = createMockFile(name, 1024, type);
      expect(validateFileUpload(file).success).toBe(true);
    });
  });
});

// ============================================
// validatePathParams — Takes plain objects
// ============================================

describe('validatePathParams', () => {
  const uuidSchema = z.object({
    id: z.string().uuid(),
  });

  test('validates valid path parameters', () => {
    const result = validatePathParams(
      { id: '550e8400-e29b-41d4-a716-446655440000' },
      uuidSchema
    );
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  test('returns errors for invalid UUID format', () => {
    const result = validatePathParams({ id: 'not-a-uuid' }, uuidSchema);
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.field).toBe('id');
  });

  test('returns errors for missing required params', () => {
    const result = validatePathParams({}, uuidSchema);
    expect(result.success).toBe(false);
  });
});

// ============================================
// validateRequestBody — Mocked NextRequest
// ============================================

describe('validateRequestBody', () => {
  const schema = z.object({
    name: z.string(),
    amount: z.number(),
  });

  test('validates valid request body', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', amount: 100 }),
    });
    const result = await validateRequestBody(req, schema);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'Test', amount: 100 });
  });

  test('returns errors for invalid request body', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 123, amount: 'wrong' }),
    });
    const result = await validateRequestBody(req, schema);
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  test('returns error for missing required fields', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const result = await validateRequestBody(req, schema);
    expect(result.success).toBe(false);
    expect(result.errors?.some(e => e.field === 'name')).toBe(true);
  });
});

// ============================================
// validateQueryParams — Mocked NextRequest
// ============================================

describe('validateQueryParams', () => {
  const schema = z.object({
    page: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  });

  test('validates valid query parameters', () => {
    const req = new NextRequest('http://localhost/api/test?page=1&status=active');
    const result = validateQueryParams(req, schema);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('active');
  });

  test('returns errors for invalid enum values', () => {
    const req = new NextRequest('http://localhost/api/test?status=invalid');
    const result = validateQueryParams(req, schema);
    expect(result.success).toBe(false);
  });

  test('handles empty query string', () => {
    const req = new NextRequest('http://localhost/api/test');
    const result = validateQueryParams(req, schema);
    expect(result.success).toBe(true);
  });
});

// ============================================
// withRateLimit — Mocked NextRequest/NextResponse
// ============================================

describe('withRateLimit', () => {
  const successHandler = async () => {
    return NextResponse.json({ success: true });
  };

  test('allows request within rate limit', async () => {
    const limited = withRateLimit(10, 60000)(successHandler);
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': `rate-allow-${Date.now()}` },
    });
    const resp = await limited(req);
    const body = await resp.json();
    expect(body.success).toBe(true);
  });

  test('blocks request exceeding rate limit', async () => {
    const ip = `rate-block-${Date.now()}`;
    const limited = withRateLimit(2, 60000)(successHandler);

    // First 2 requests OK
    for (let i = 0; i < 2; i++) {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': ip },
      });
      await limited(req);
    }

    // 3rd request blocked
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': ip },
    });
    const resp = await limited(req);
    expect(resp.status).toBe(429);
  });

  test('adds rate limit headers to success response', async () => {
    const limited = withRateLimit(100, 60000)(successHandler);
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': `rate-headers-${Date.now()}` },
    });
    const resp = await limited(req);
    expect(resp.headers.get('x-ratelimit-limit')).toBe('100');
  });

  test('uses different identifiers for different IPs', async () => {
    const limited = withRateLimit(1, 60000)(successHandler);

    const req1 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': `ip-a-${Date.now()}` },
    });
    const resp1 = await limited(req1);
    expect(resp1.status).toBe(200);

    const req2 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': `ip-b-${Date.now()}` },
    });
    const resp2 = await limited(req2);
    expect(resp2.status).toBe(200);
  });

  test('handles missing IP headers', async () => {
    const limited = withRateLimit(100, 60000)(successHandler);
    const req = new NextRequest('http://localhost/api/test');
    const resp = await limited(req);
    const body = await resp.json();
    expect(body.success).toBe(true);
  });
});

// ============================================
// withValidation — Mocked NextRequest/NextResponse
// ============================================

describe('withValidation', () => {
  const bodySchema = z.object({ name: z.string() });

  test('passes validated body to handler', async () => {
    const handler = jest.fn(async (_req: NextRequest, ctx: { body?: { name: string } }) => {
      return NextResponse.json({ received: ctx.body?.name });
    });

    const validated = withValidation(handler, { body: bodySchema });
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Austin' }),
    });

    await validated(req, {});
    expect(handler).toHaveBeenCalled();
    const ctx = handler.mock.calls[0][1];
    expect(ctx.body?.name).toBe('Austin');
  });

  test('returns 400 for invalid body', async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const validated = withValidation(handler, { body: bodySchema });

    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 123 }),
    });

    const resp = await validated(req, {});
    expect(resp.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  test('skips body validation for GET requests', async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const validated = withValidation(handler, { body: bodySchema });

    const req = new NextRequest('http://localhost/api/test', { method: 'GET' });
    await validated(req, {});
    expect(handler).toHaveBeenCalled();
  });
});
