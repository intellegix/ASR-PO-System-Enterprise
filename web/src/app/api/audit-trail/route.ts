import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { hasPermission } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import log from '@/lib/logging/logger';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


interface AuditTrailEntry {
  id: string;
  action: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  po: {
    id: string;
    po_number: string;
    vendor_name: string;
    total_amount: number;
    division_name: string;
  };
  statusChange: {
    from: string | null;
    to: string | null;
  };
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

const getHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user information
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { role: true, division_id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - audit trail requires elevated access
    if (!hasPermission(user.role as any, 'report:view') ||
        !['MAJORITY_OWNER', 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS', 'DIVISION_LEADER', 'ACCOUNTING'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('poId');
    const search = searchParams.get('search');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build WHERE clause
    const whereClause: any = {};

    // PO-specific audit trail
    if (poId) {
      whereClause.po_id = poId;
    }

    // Action filter
    if (action) {
      whereClause.action = action;
    }

    // User filter
    if (userId) {
      whereClause.actor_user_id = userId;
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.timestamp.lte = new Date(endDate + 'T23:59:59Z');
      }
    }

    // Text search in PO number or user name
    if (search) {
      whereClause.OR = [
        {
          po_headers: {
            po_number: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          users: {
            OR: [
              {
                first_name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                last_name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    // Apply division filtering for division leaders
    if (user.role === 'DIVISION_LEADER' && user.division_id) {
      whereClause.actor_division_id = user.division_id;
    }

    // Fetch audit trail entries
    const auditEntries = await prisma.po_approvals.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
        po_headers: {
          select: {
            id: true,
            po_number: true,
            total_amount: true,
            vendors: {
              select: {
                vendor_name: true,
              },
            },
            divisions: {
              select: {
                division_name: true,
              },
            },
          },
        },
        divisions: {
          select: {
            division_name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    // Transform data for frontend
    const entries: AuditTrailEntry[] = auditEntries
      .filter(entry => entry.po_headers) // Only include entries with valid PO references
      .map(entry => ({
        id: entry.id,
        action: entry.action,
        timestamp: entry.timestamp?.toISOString() || new Date().toISOString(),
        actor: {
          name: entry.users
            ? `${entry.users.first_name || ''} ${entry.users.last_name || ''}`.trim()
            : 'System',
          email: entry.users?.email || 'system@company.com',
          role: entry.users?.role || 'SYSTEM',
        },
        po: {
          id: entry.po_headers!.id,
          po_number: entry.po_headers!.po_number,
          vendor_name: entry.po_headers!.vendors?.vendor_name || 'Unknown Vendor',
          total_amount: entry.po_headers!.total_amount?.toNumber() || 0,
          division_name: entry.po_headers!.divisions?.division_name || 'Unknown Division',
        },
        statusChange: {
          from: entry.status_before,
          to: entry.status_after,
        },
        notes: entry.notes || undefined,
        ipAddress: entry.ip_address || undefined,
        userAgent: entry.user_agent || undefined,
      }));

    log.info('Audit trail accessed', {
      userId: session.user.id,
      userRole: user.role,
      entriesReturned: entries.length,
      filters: {
        poId,
        search,
        action,
        userId: userId,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : null,
      },
    });

    return NextResponse.json({
      entries,
      totalCount: entries.length,
      hasMore: entries.length === limit,
    });

  } catch (error) {
    log.error('Failed to fetch audit trail', {
      error: error instanceof Error ? error.message : String(error),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    );
  }
};

export const GET = withRateLimit(50, 60 * 1000)(getHandler);