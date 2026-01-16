import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const glAccounts = await prisma.gl_account_mappings.findMany({
      where: { is_active: true },
      orderBy: { gl_code_short: 'asc' },
      select: {
        id: true,
        gl_code_short: true,
        gl_account_number: true,
        gl_account_name: true,
        gl_account_category: true,
        is_taxable_default: true,
      },
    });

    return NextResponse.json(glAccounts);
  } catch (error) {
    console.error('Error fetching GL accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch GL accounts' }, { status: 500 });
  }
}
