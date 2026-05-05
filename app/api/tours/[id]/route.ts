import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const t = await prisma.tourPackage.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, include: { days: { orderBy: { dayNumber: 'asc' }, include: { destination: true } }, rateCards: { orderBy: { validFrom: 'asc' } } } });
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(t);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (!await prisma.tourPackage.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  return NextResponse.json(await prisma.tourPackage.update({ where: { id: params.id }, data: { title: b.title, description: b.description, durationDays: b.durationDays, durationNights: b.durationNights, countries: b.countries?JSON.stringify(b.countries):undefined, highlights: b.highlights, isActive: b.isActive } }));
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.tourPackage.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.tourPackage.delete({ where: { id: params.id } });
  auth.log.info('Tour deleted', { tourId: params.id });
  return NextResponse.json({ ok: true });
}
