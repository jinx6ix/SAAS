import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const agent = await prisma.agent.findFirst({ where: { id: params.id, tenantId }, include: { clients: { select: { id:true,name:true,email:true } }, _count: { select: { clients: true } } } });
  if (!agent) { log.warn('Agent not found', { agentId: params.id }); return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
  return NextResponse.json(agent);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const exists = await prisma.agent.findFirst({ where: { id: params.id, tenantId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const agent = await prisma.agent.update({ where: { id: params.id }, data: { name: body.name, company: body.company, email: body.email, phone: body.phone, address: body.address, notes: body.notes, isActive: body.isActive } });
  log.info('Agent updated', { agentId: agent.id });
  return NextResponse.json(agent);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const exists = await prisma.agent.findFirst({ where: { id: params.id, tenantId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.agent.delete({ where: { id: params.id } });
  log.info('Agent deleted', { agentId: params.id });
  return NextResponse.json({ ok: true });
}
