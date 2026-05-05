import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const type = req.nextUrl.searchParams.get('type');
  const vouchers = await prisma.voucher.findMany({ where: { tenantId, ...(type?{type}:{}) }, orderBy: { createdAt: 'desc' }, include: { booking: { include: { client: true } }, property: true, vehicle: true, agent: true } });
  log.debug('Vouchers fetched', { count: vouchers.length });
  return NextResponse.json(vouchers);
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, userId, log } = auth;
  const b = await req.json();
  const type = b.type||'HOTEL';
  const pfx  = type==='HOTEL'?'HV':type==='VEHICLE'?'VV':type==='FLIGHT'?'FV':'XV';
  let voucherNo = `${pfx}-${Math.floor(Math.random()*90000)+10000}`;
  while (await prisma.voucher.findUnique({ where: { voucherNo } })) voucherNo = `${pfx}-${Math.floor(Math.random()*90000)+10000}`;
  const voucher = await prisma.voucher.create({ data: { tenantId, voucherNo, type, bookingId: b.bookingId||null, clientId: b.clientId||null, agentId: b.agentId||null, propertyId: b.propertyId||null, hotelName: b.hotelName||null, vehicleId: b.vehicleId||null, createdById: userId, roomType: b.roomType||null, checkIn: b.checkIn?new Date(b.checkIn):null, checkOut: b.checkOut?new Date(b.checkOut):null, numNights: b.numNights||null, numAdults: b.numAdults||null, numChildren: b.numChildren||null, numTwins: b.numTwins||null, numDoubles: b.numDoubles||null, numSingles: b.numSingles||null, numTriples: b.numTriples||null, clientName: b.clientName||null, remarks: b.remarks||null, vehicleName: b.vehicleName||null, vehicleType: b.vehicleType||null, pickupDate: b.pickupDate?new Date(b.pickupDate):null, dropoffDate: b.dropoffDate?new Date(b.dropoffDate):null, pickupLocation: b.pickupLocation||null, route: b.route||null, rateKES: b.rateKES||null, flightName: b.flightName||null, flightSchedule: b.flightSchedule||null, departureDate: b.departureDate?new Date(b.departureDate):null, returnDate: b.returnDate?new Date(b.returnDate):null, numDays: b.numDays||null, bookingStatus: b.bookingStatus||'book', status: 'ACTIVE', notes: b.notes||null, issuedDate: new Date() }, include: { property: true, vehicle: true, agent: true } });
  log.info('Voucher created', { voucherId: voucher.id, voucherNo, type });
  return NextResponse.json(voucher, { status: 201 });
}
