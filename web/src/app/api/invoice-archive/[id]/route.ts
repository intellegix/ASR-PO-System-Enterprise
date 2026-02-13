import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import { getInvoiceById, getInvoiceFiles } from '@/lib/invoice-archive';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


const getHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invoice = getInvoiceById(id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get associated files
    const files = getInvoiceFiles(id);

    return NextResponse.json({
      ...invoice,
      files,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler as (request: NextRequest, context?: { params: Promise<{ id: string }> }) => Promise<NextResponse>);
