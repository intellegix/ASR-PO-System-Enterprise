import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import prisma from '@/lib/db';
import log, { auditLog } from '@/lib/logging/logger';

export const dynamic = 'force-dynamic';

// Auto-generate invoice number: INV-YYYY-NNNN
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInvoice = await prisma.customer_invoices.findFirst({
    where: { invoice_number: { startsWith: prefix } },
    orderBy: { invoice_number: 'desc' },
    select: { invoice_number: true },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// GET - List customer invoices
const getHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || !hasPermission(user.role as any, 'po:read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (projectId) where.project_id = projectId;

    const invoices = await prisma.customer_invoices.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        projects: { select: { project_code: true, project_name: true } },
        divisions: { select: { division_name: true, division_code: true } },
        users: { select: { first_name: true, last_name: true } },
        line_items: { orderBy: { line_number: 'asc' } },
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    log.error('Error fetching customer invoices', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// POST - Create customer invoice
const postHandler = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user || !hasPermission(user.role as any, 'po:create')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      projectId,
      divisionId,
      customerName,
      customerEmail,
      customerAddress,
      lineItems,
      dateDue,
      notes,
      terms,
      status = 'Draft',
    } = body;

    if (!projectId || !customerName || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, customerName, lineItems' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate totals from line items
    const TAX_RATE = 0.0775;
    let subtotal = 0;
    const processedLineItems = lineItems.map((item: {
      description: string;
      quantity: number;
      unitPrice: number;
    }, index: number) => {
      const lineAmount = item.quantity * item.unitPrice;
      subtotal += lineAmount;
      return {
        line_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: lineAmount,
      };
    });

    const taxAmount = subtotal * TAX_RATE;
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.customer_invoices.create({
      data: {
        invoice_number: invoiceNumber,
        project_id: projectId,
        division_id: divisionId || project.primary_division_id || null,
        client_id: clientId || null,
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_address: customerAddress || null,
        amount: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        date_issued: new Date(),
        date_due: dateDue ? new Date(dateDue) : null,
        status: status as any,
        notes: notes || null,
        terms: terms || 'Net30',
        created_by_user_id: session.user.id,
        line_items: {
          create: processedLineItems,
        },
      },
      include: {
        projects: { select: { project_code: true, project_name: true } },
        line_items: { orderBy: { line_number: 'asc' } },
      },
    });

    auditLog(
      'CUSTOMER_INVOICE_CREATED',
      'customer_invoice',
      invoice.id,
      {
        invoiceNumber,
        projectId,
        customerName,
        totalAmount,
        lineItemCount: lineItems.length,
      },
      { userId: session.user.id }
    );

    return NextResponse.json(invoice);
  } catch (error) {
    log.error('Error creating customer invoice', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

export const GET = withRateLimit(100, 60 * 1000)(getHandler);
export const POST = withRateLimit(20, 60 * 1000)(postHandler);
