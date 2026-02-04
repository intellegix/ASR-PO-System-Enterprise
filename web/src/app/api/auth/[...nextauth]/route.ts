// Placeholder route for TypeScript compilation during static export
// This route is not used in the hybrid architecture where the frontend is static
// and authentication is handled by the local backend

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'NextAuth not available in static export' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'NextAuth not available in static export' }, { status: 404 });
}