import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}
