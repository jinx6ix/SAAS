import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const v = await prisma.voucher.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, include: { booking: { include: { client: true, tourPackage: true } }, client: true, property: true, vehicle: true, agent: true, createdBy: { select: { id:true,name:true } } } });
  if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(v);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  if (!await prisma.voucher.findFirst({ where: { id: params.id, tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  const v = await prisma.voucher.update({ where: { id: params.id }, data: { ...b, checkIn: b.checkIn?new Date(b.checkIn):undefined, checkOut: b.checkOut?new Date(b.checkOut):undefined, pickupDate: b.pickupDate?new Date(b.pickupDate):undefined, dropoffDate: b.dropoffDate?new Date(b.dropoffDate):undefined, departureDate: b.departureDate?new Date(b.departureDate):undefined, returnDate: b.returnDate?new Date(b.returnDate):undefined, tenantId: undefined } });
  log.info('Voucher updated', { voucherId: v.id });
  return NextResponse.json(v);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.voucher.findFirst({ where: { id: params.id, tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.voucher.delete({ where: { id: params.id } });
  log.info('Voucher deleted', { voucherId: params.id });
  return NextResponse.json({ ok: true });
}
