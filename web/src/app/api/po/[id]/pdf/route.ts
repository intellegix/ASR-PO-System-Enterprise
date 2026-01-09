import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { generatePOPdfBuffer } from '@/lib/pdf/po-pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch PO with all related data
    const po = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
      include: {
        po_line_items: {
          orderBy: { line_number: 'asc' },
        },
        vendors: true,
        projects: true,
        divisions: true,
        work_orders: true,
        users_po_headers_requested_by_idTousers: {
          select: { name: true, email: true },
        },
        users_po_headers_approved_by_idTousers: {
          select: { name: true },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = generatePOPdfBuffer(po as Parameters<typeof generatePOPdfBuffer>[0]);

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${po.po_number.replace(/\s+/g, '-')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
