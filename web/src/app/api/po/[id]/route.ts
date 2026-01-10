import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';

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
    const po = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
      include: {
        po_line_items: {
          select: {
            id: true,
            line_number: true,
            item_description: true,
            quantity: true,
            unit_of_measure: true,
            unit_price: true,
            gl_account_code: true,
            gl_account_number: true,
            gl_account_name: true,
            is_taxable: true,
            created_at: true,
          },
          orderBy: { line_number: 'asc' },
        },
        vendors: true,
        projects: true,
        divisions: true,
        work_orders: true,
        users_po_headers_requested_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        users_po_headers_approved_by_user_idTousers: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        po_approvals: {
          include: {
            users: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    return NextResponse.json(po);
  } catch (error) {
    console.error('Error fetching PO:', error);
    return NextResponse.json({ error: 'Failed to fetch PO' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get current PO
    const currentPO = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
    });

    if (!currentPO) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Only allow editing draft POs
    if (currentPO.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft POs can be edited' },
        { status: 400 }
      );
    }

    const {
      notesInternal,
      notesVendor,
      requiredByDate,
      termsCode,
    } = body;

    const updatedPO = await prisma.po_headers.update({
      where: { id },
      data: {
        notes_internal: notesInternal,
        notes_vendor: notesVendor,
        required_by_date: requiredByDate ? new Date(requiredByDate) : null,
        terms_code: termsCode,
        updated_at: new Date(),
      },
      include: {
        po_line_items: true,
        vendors: true,
        projects: true,
        divisions: true,
      },
    });

    return NextResponse.json(updatedPO);
  } catch (error) {
    console.error('Error updating PO:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get current PO
    const currentPO = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
    });

    if (!currentPO) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Only allow deleting draft POs
    if (currentPO.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft POs can be deleted' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.po_headers.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    // Create audit log
    await prisma.po_approvals.create({
      data: {
        po_id: id,
        action: 'Cancelled',
        actor_user_id: session.user.id,
        status_before: currentPO.status,
        status_after: 'Cancelled',
        notes: 'PO deleted',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PO:', error);
    return NextResponse.json({ error: 'Failed to delete PO' }, { status: 500 });
  }
}
