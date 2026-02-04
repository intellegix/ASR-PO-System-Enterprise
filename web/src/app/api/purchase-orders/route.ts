import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Helper to extract and verify JWT token
async function verifyToken(request: NextRequest): Promise<JWTPayload | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// GET - Fetch purchase orders
export async function GET(request: NextRequest) {
  try {
    const tokenPayload = await verifyToken(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const divisionId = url.searchParams.get('divisionId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');

    const where: Record<string, any> = {
      deleted_at: null,
    };

    if (status) {
      where.status = status;
    }

    if (divisionId) {
      where.division_id = divisionId;
    }

    const purchaseOrders = await prisma.po_headers.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    // Transform data to match frontend expectations
    const transformedPOs = purchaseOrders.map((po: any) => ({
      id: po.id,
      poNumber: po.po_number,
      vendorId: po.vendor_id,
      vendorName: 'Unknown Vendor', // Will be resolved later
      amount: Number(po.total_amount) || 0,
      status: po.status?.toUpperCase() || 'DRAFT',
      requestedBy: po.requested_by_user_id,
      requestedDate: po.created_at?.toISOString() || new Date().toISOString(),
      approvedBy: po.approved_by_user_id || undefined,
      approvedDate: po.approved_at?.toISOString() || undefined,
      description: po.notes_vendor || po.notes_internal || '',
      divisionId: po.division_id,
      division: 'Unknown Division',
      items: [],
    }));

    return NextResponse.json({
      data: transformedPOs,
      pagination: {
        page,
        limit,
        total: transformedPOs.length,
      },
    });

  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new purchase order
export async function POST(request: NextRequest) {
  try {
    const tokenPayload = await verifyToken(request);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vendorId, amount, description, divisionId, items = [] } = body;

    if (!vendorId || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: vendorId, amount, description' },
        { status: 400 }
      );
    }

    // Get vendor and division info
    const vendor = await prisma.vendors.findUnique({
      where: { id: vendorId },
    });

    const division = await prisma.divisions.findUnique({
      where: { id: divisionId || undefined },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Generate simple PO number for now (can be enhanced later)
    const poCount = await prisma.po_headers.count();
    const poNumber = `PO-${String(poCount + 1).padStart(6, '0')}`;

    // Calculate tax (7.75% default rate)
    const TAX_RATE = 0.0775;
    const subtotal = Number(amount);
    const taxAmount = subtotal * TAX_RATE;
    const totalAmount = subtotal + taxAmount;

    // Create purchase order with basic required fields
    const po = await prisma.po_headers.create({
      data: {
        po_number: poNumber,
        vendor_id: vendorId,
        project_id: '00000000-0000-0000-0000-000000000000', // Default project
        division_id: divisionId || '00000000-0000-0000-0000-000000000000',
        status: 'Draft' as any,
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        requested_by_user_id: tokenPayload.userId,
        notes_vendor: description,
        tax_rate: TAX_RATE,
      },
    });

    // Transform response
    const transformedPO = {
      id: po.id,
      poNumber: po.po_number,
      vendorId: po.vendor_id,
      vendorName: vendor.vendor_name,
      amount: Number(po.total_amount),
      status: po.status?.toUpperCase() || 'DRAFT',
      requestedBy: po.requested_by_user_id,
      requestedDate: po.created_at?.toISOString() || new Date().toISOString(),
      description: po.notes_vendor || '',
      divisionId: po.division_id,
      division: division?.division_name || '',
      items: [],
    };

    return NextResponse.json({
      data: transformedPO,
    });

  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}