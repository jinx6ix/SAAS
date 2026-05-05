import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const q = req.nextUrl.searchParams.get('q') || '';
  const clients = await prisma.client.findMany({ where: { tenantId, ...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]}:{}) }, orderBy: { name: 'asc' }, include: { _count: { select: { bookings: true } } } });
  log.debug('Clients fetched', { count: clients.length });
  return NextResponse.json(clients);
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const b = await req.json();
  const client = await prisma.client.create({ data: { tenantId, name: b.name, email: b.email||null, phone: b.phone||null, nationality: b.nationality||null, isResident: b.isResident??false, address: b.address||null, notes: b.notes||null, agentId: b.agentId||null } });
  log.info('Client created', { clientId: client.id, name: client.name });
  return NextResponse.json(client, { status: 201 });
}
