import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { isAdmin } from '@/lib/auth/permissions';
import { withRateLimit } from '@/lib/validation/middleware';
import { SETTINGS_DEFAULTS, isValidSettingKey } from '@/lib/admin/settings-defaults';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const getHandler = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !isAdmin(user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const dbSettings = await prisma.app_settings.findMany({
      orderBy: { key: 'asc' },
      include: {
        users: { select: { first_name: true, last_name: true } },
      },
    });

    // Build a map of DB settings keyed by key
    const dbMap = new Map(dbSettings.map(s => [s.key, s]));

    // Merge defaults with DB values (DB overrides defaults)
    const merged = Object.entries(SETTINGS_DEFAULTS).map(([key, def]) => {
      const db = dbMap.get(key);
      if (db) {
        return {
          id: db.id,
          key: db.key,
          value: db.value,
          description: db.description || def.description,
          updatedAt: db.updated_at,
          updatedBy: db.users ? `${db.users.first_name} ${db.users.last_name}` : null,
        };
      }
      return {
        id: null,
        key,
        value: def.value,
        description: def.description,
        updatedAt: null,
        updatedBy: null,
      };
    });

    return NextResponse.json(merged);
  } catch (error) {
    log.error('Failed to fetch settings', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
};

const putHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!adminUser || !isAdmin(adminUser.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'settings must be an array of { key, value } objects' }, { status: 400 });
    }

    // Validate all keys before writing
    const invalidKeys = settings
      .map((s: { key: string }) => s.key)
      .filter((k: string) => k && !isValidSettingKey(k));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid setting keys: ${invalidKeys.join(', ')}` },
        { status: 400 }
      );
    }

    const results = [];
    for (const { key, value, description } of settings) {
      if (!key) continue;
      const result = await prisma.app_settings.upsert({
        where: { key },
        create: {
          key,
          value: value ?? null,
          description: description || null,
          updated_by_user_id: session.user.id,
        },
        update: {
          value: value ?? null,
          description: description !== undefined ? description : undefined,
          updated_at: new Date(),
          updated_by_user_id: session.user.id,
        },
      });
      results.push(result);
    }

    log.info('Admin updated settings', {
      adminUserId: session.user.id,
      keys: settings.map((s: { key: string }) => s.key),
    });

    return NextResponse.json({ updated: results.length });
  } catch (error) {
    log.error('Failed to update settings', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
};

export const GET = withRateLimit(50, 60 * 1000)(getHandler);
export const PUT = withRateLimit(10, 60 * 1000)(putHandler);
