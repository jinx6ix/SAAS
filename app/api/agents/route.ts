import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  const auth = await requireTenant(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const q = req.nextUrl.searchParams.get('q') || '';
  log.debug('Fetching agents', { q });
  const agents = await prisma.agent.findMany({
    where: { tenantId, ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }] } : {}) },
    orderBy: { name: 'asc' }, include: { _count: { select: { clients: true } } },
  });
  log.info('Agents fetched', { count: agents.length });
  return NextResponse.json(agents);
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req);
  if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const body = await req.json();
  const agent = await prisma.agent.create({ data: { tenantId, name: body.name, company: body.company||null, email: body.email||null, phone: body.phone||null, address: body.address||null, notes: body.notes||null, isActive: body.isActive??true } });
  log.info('Agent created', { agentId: agent.id, name: agent.name });
  return NextResponse.json(agent, { status: 201 });
}
