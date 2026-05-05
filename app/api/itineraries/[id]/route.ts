import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const it = await prisma.itinerary.findFirst({ where: { id: params.id, booking: { tenantId: auth.tenantId } }, include: { booking: { include: { client: true, tourPackage: true } }, days: { orderBy: { dayNumber: 'asc' }, include: { images: true } } } });
  if (!it) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(it);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (!await prisma.itinerary.findFirst({ where: { id: params.id, booking: { tenantId: auth.tenantId } }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  if (b.days) { await prisma.itineraryDay.deleteMany({ where: { itineraryId: params.id } }); await prisma.itineraryDay.createMany({ data: b.days.map((d: any) => ({ itineraryId: params.id, dayNumber: d.dayNumber, date: d.date?new Date(d.date):null, destination: d.destination||'', accommodation: d.accommodation||null, mealPlan: d.mealPlan||null, activities: d.activities||null, notes: d.notes||null })) }); }
  return NextResponse.json(await prisma.itinerary.update({ where: { id: params.id }, data: { title: b.title, updatedAt: new Date() }, include: { days: { orderBy: { dayNumber: 'asc' }, include: { images: true } } } }));
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (!await prisma.itinerary.findFirst({ where: { id: params.id, booking: { tenantId: auth.tenantId } }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.itinerary.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
