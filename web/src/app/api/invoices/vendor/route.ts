import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import log, { auditLog } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

// GET - List vendor invoices
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const poId = searchParams.get('poId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (vendorId) where.vendor_id = vendorId;
    if (poId) where.po_id = poId;

    const invoices = await prisma.vendor_invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        vendors: { select: { vendor_name: true, vendor_code: true } },
        po_headers: { select: { po_number: true, total_amount: true, status: true } },
        projects: { select: { project_code: true, project_name: true } },
        divisions: { select: { division_name: true, division_code: true } },
        users: { select: { first_name: true, last_name: true } },
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    log.error('Error fetching vendor invoices', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create vendor invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceNumber,
      poId,
      vendorId,
      projectId,
      divisionId,
      amount,
      taxAmount,
      totalAmount,
      dateReceived,
      dateDue,
      notes,
    } = body;

    if (!invoiceNumber || !vendorId || !amount || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceNumber, vendorId, amount, totalAmount' },
        { status: 400 }
      );
    }

    // Verify vendor exists
    const vendor = await prisma.vendors.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // If linked to PO, verify PO exists and belongs to vendor
    if (poId) {
      const po = await prisma.po_headers.findUnique({ where: { id: poId } });
      if (!po) {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }
      if (po.vendor_id !== vendorId) {
        return NextResponse.json({ error: 'PO does not belong to selected vendor' }, { status: 400 });
      }
    }

    const invoice = await prisma.vendor_invoices.create({
      data: {
        invoice_number: invoiceNumber,
        po_id: poId || null,
        vendor_id: vendorId,
        project_id: projectId || null,
        division_id: divisionId || null,
        amount: parseFloat(amount),
        tax_amount: taxAmount ? parseFloat(taxAmount) : null,
        total_amount: parseFloat(totalAmount),
        date_received: dateReceived ? new Date(dateReceived) : new Date(),
        date_due: dateDue ? new Date(dateDue) : null,
        notes: notes || null,
        created_by_user_id: session.user.id,
      },
      include: {
        vendors: { select: { vendor_name: true } },
        po_headers: { select: { po_number: true } },
      },
    });

    // If linked to PO, update PO status to Invoiced
    if (poId) {
      await prisma.po_headers.update({
        where: { id: poId },
        data: { status: 'Invoiced', updated_at: new Date() },
      });

      await prisma.po_approvals.create({
        data: {
          po_id: poId,
          action: 'Invoiced',
          actor_user_id: session.user.id,
          status_before: 'Issued',
          status_after: 'Invoiced',
          notes: `Vendor invoice ${invoiceNumber} recorded`,
        },
      });
    }

    auditLog(
      'VENDOR_INVOICE_CREATED',
      'vendor_invoice',
      invoice.id,
      {
        invoiceNumber,
        vendorId,
        poId,
        totalAmount: parseFloat(totalAmount),
      },
      { userId: session.user.id }
    );

    return NextResponse.json(invoice);
  } catch (error) {
    log.error('Error creating vendor invoice', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
