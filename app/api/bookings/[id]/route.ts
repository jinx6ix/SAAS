import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;
  const b = await prisma.booking.findFirst({ where: { id: params.id, tenantId }, include: { client: true, tourPackage: { include: { days: { orderBy: { dayNumber: 'asc' } } } }, assignedTo: { select: { id:true,name:true } }, vouchers: { include: { property:true,vehicle:true } }, invoices: true, costSheets: true, itinerary: { include: { days: { include: { images:true }, orderBy: { dayNumber:'asc' } } } } } });
  if (!b) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(b);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  if (!await prisma.booking.findFirst({ where: { id: params.id, tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  const booking = await prisma.booking.update({ where: { id: params.id }, data: { status: b.status, startDate: b.startDate?new Date(b.startDate):undefined, endDate: b.endDate?new Date(b.endDate):undefined, numAdults: b.numAdults, numChildren: b.numChildren, totalAmount: b.totalAmount, paidAmount: b.paidAmount, currency: b.currency, notes: b.notes, specialRequirements: b.specialRequirements, tourPackageId: b.tourPackageId, assignedToId: b.assignedToId }, include: { client:true, tourPackage:true } });
  log.info('Booking updated', { bookingId: booking.id, status: booking.status });
  return NextResponse.json(booking);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.booking.findFirst({ where: { id: params.id, tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.booking.delete({ where: { id: params.id } });
  log.info('Booking deleted', { bookingId: params.id });
  return NextResponse.json({ ok: true });
}
