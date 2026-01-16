import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


// GET handler for vendors
const getHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - vendors are reference data needed for PO creation
    if (!hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const vendors = await prisma.vendors.findMany({
      where: { is_active: true },
      orderBy: { vendor_name: 'asc' },
      select: {
        id: true,
        vendor_code: true,
        vendor_name: true,
        vendor_type: true,
        contact_name: true,
        contact_email: true,
        contact_phone: true,
        payment_terms_default: true,
      },
    });

    log.info('Vendors retrieved', {
      userId: session.user.id,
      userRole: user.role,
      vendorCount: vendors.length,
    });

    return NextResponse.json(vendors);
  } catch (error) {
    log.error('Failed to fetch vendors', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
};

// Apply rate limiting
export const GET = withRateLimit(100, 60 * 1000)(getHandler);
