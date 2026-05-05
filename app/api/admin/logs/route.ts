// app/api/admin/logs/route.ts
// Owner-only: query audit logs and recent activity
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { log } = auth;

  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId');
  const action   = searchParams.get('action');
  const limit    = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const page     = parseInt(searchParams.get('page') || '1');

  log.info('Admin: querying audit logs', { tenantId, action, limit, page });

  const where: any = {};
  if (tenantId) where.tenantId = tenantId;
  if (action)   where.action   = { contains: action };

  const [logs, total] = await Promise.all([
    (prisma as any).auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take:    limit,
      skip:    (page - 1) * limit,
    }),
    (prisma as any).auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l: any) => ({
      ...l,
      details: (() => { try { return JSON.parse(l.details); } catch { return {}; } })(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
