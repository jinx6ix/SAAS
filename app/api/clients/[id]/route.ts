import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;
  const client = await prisma.client.findFirst({ where: { id: params.id, tenantId }, include: { bookings: { orderBy: { createdAt: 'desc' }, include: { tourPackage: true } } } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(client);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  if (!await prisma.client.findFirst({ where: { id: params.id, tenantId }, select: { id: true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  const client = await prisma.client.update({ where: { id: params.id }, data: { name: b.name, email: b.email, phone: b.phone, nationality: b.nationality, isResident: b.isResident, address: b.address, notes: b.notes } });
  log.info('Client updated', { clientId: client.id });
  return NextResponse.json(client);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.client.findFirst({ where: { id: params.id, tenantId }, select: { id: true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.client.delete({ where: { id: params.id } });
  log.info('Client deleted', { clientId: params.id });
  return NextResponse.json({ ok: true });
}
