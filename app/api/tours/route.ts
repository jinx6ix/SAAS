import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await prisma.tourPackage.findMany({ where: { tenantId: auth.tenantId }, orderBy: { title: 'asc' }, include: { days: { orderBy: { dayNumber: 'asc' }, include: { destination: true } }, _count: { select: { bookings: true } } } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const b = await req.json();
  const tour = await prisma.tourPackage.create({ data: { tenantId, title: b.title, description: b.description||null, durationDays: b.durationDays, durationNights: b.durationNights, countries: JSON.stringify(b.countries||['KENYA']), highlights: b.highlights||null, isActive: b.isActive??true } });
  log.info('Tour created', { tourId: tour.id, title: tour.title });
  return NextResponse.json(tour, { status: 201 });
}
