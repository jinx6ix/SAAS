import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
import { generateBookingRef } from '@/lib/rates';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const sp = req.nextUrl.searchParams;
  const bookings = await prisma.booking.findMany({
    where: { tenantId, ...(sp.get('status')?{status:sp.get('status')!}:{}) },
    orderBy: { createdAt: 'desc' },
    include: { client: true, ...(sp.get('withTour')==='1'?{tourPackage:{include:{days:{orderBy:{dayNumber:'asc'}}}}}:{tourPackage:true}) }
  });
  log.debug('Bookings fetched', { count: bookings.length });
  return NextResponse.json(bookings);
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const b = await req.json();
  const client = await prisma.client.findFirst({ where: { id: b.clientId, tenantId } });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  const bookingRef = await generateBookingRef();
  const booking = await prisma.booking.create({ data: { tenantId, bookingRef, clientId: b.clientId, tourPackageId: b.tourPackageId||null, assignedToId: b.assignedToId||null, startDate: new Date(b.startDate), endDate: new Date(b.endDate), numAdults: b.numAdults||1, numChildren: b.numChildren||0, isResident: b.isResident||false, totalAmount: b.totalAmount||null, currency: b.currency||'USD', notes: b.notes||null, specialRequirements: b.specialRequirements||null, status: 'ENQUIRY' }, include: { client: true, tourPackage: true } });
  log.info('Booking created', { bookingId: booking.id, bookingRef, clientId: b.clientId });
  return NextResponse.json(booking, { status: 201 });
}
