import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  searchInvoices,
  getInvoiceStats,
  getArchiveVendors,
  getArchiveProjects,
} from '@/lib/invoice-archive';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get stats
    if (action === 'stats') {
      const stats = getInvoiceStats();
      return NextResponse.json(stats);
    }

    // Get vendors from archive
    if (action === 'vendors') {
      const vendors = getArchiveVendors();
      return NextResponse.json(vendors);
    }

    // Get projects from archive
    if (action === 'projects') {
      const projects = getArchiveProjects();
      return NextResponse.json(projects);
    }

    // Search invoices
    const invoices = searchInvoices({
      search: searchParams.get('search') || undefined,
      vendor_id: searchParams.get('vendor_id') || undefined,
      project_id: searchParams.get('project_id') || undefined,
      payment_status: searchParams.get('payment_status') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error accessing invoice archive:', error);
    return NextResponse.json(
      { error: 'Failed to access invoice archive' },
      { status: 500 }
    );
  }
}
