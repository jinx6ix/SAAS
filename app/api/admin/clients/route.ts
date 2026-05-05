// app/api/admin/clients/route.ts
// Owner can view clients across tenants and delete them
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/tenant';
import { auditLog } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { log } = auth;

  const { searchParams } = req.nextUrl;
  const tenantId = searchParams.get('tenantId');
  const q        = searchParams.get('q') || '';

  log.info('Admin: fetching clients', { tenantId, q });

  const clients = await prisma.client.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      ...(q ? { OR: [
        { name:  { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ]} : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      tenant:   { select: { name: true, slug: true } },
      _count:   { select: { bookings: true } },
    },
    take: 100,
  });

  return NextResponse.json(clients);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { userId, log } = auth;

  const { clientId, reason } = await req.json();
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  const client = await prisma.client.findUnique({
    where:   { id: clientId },
    include: { tenant: { select: { name: true } } },
  });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  log.warn('Admin: deleting client', { clientId, clientName: client.name, tenantId: client.tenantId });

  await prisma.client.delete({ where: { id: clientId } });
  await auditLog('client.delete', client.tenantId, userId, { clientName: client.name, clientEmail: client.email, reason });

  return NextResponse.json({ success: true });
}
