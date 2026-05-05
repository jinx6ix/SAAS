import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await prisma.itinerary.findMany({ where: { booking: { tenantId: auth.tenantId } }, orderBy: { createdAt: 'desc' }, include: { booking: { include: { client: true } }, days: { orderBy: { dayNumber: 'asc' } } } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const b = await req.json();
  if (!await prisma.booking.findFirst({ where: { id: b.bookingId, tenantId } })) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  const existing = await prisma.itinerary.findUnique({ where: { bookingId: b.bookingId } });
  if (existing) return NextResponse.json(await prisma.itinerary.update({ where: { id: existing.id }, data: { title: b.title, updatedAt: new Date() }, include: { days: { orderBy: { dayNumber: 'asc' } } } }));
  const it = await prisma.itinerary.create({ data: { bookingId: b.bookingId, title: b.title||'Safari Itinerary', days: { create: (b.days||[]).map((d: any) => ({ dayNumber: d.dayNumber, date: d.date?new Date(d.date):null, destination: d.destination||'', accommodation: d.accommodation||null, mealPlan: d.mealPlan||null, activities: d.activities||null, notes: d.notes||null })) } }, include: { days: { orderBy: { dayNumber: 'asc' } } } });
  log.info('Itinerary created', { itineraryId: it.id, bookingId: b.bookingId });
  return NextResponse.json(it, { status: 201 });
}
