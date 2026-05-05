import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const sp = req.nextUrl.searchParams;
  const hotelId = sp.get('hotelId'); const date = sp.get('date'); const boardBasis = sp.get('boardBasis')||'FB';
  if (!hotelId || !date) return NextResponse.json({ error: 'hotelId and date required' }, { status: 400 });
  const hotel = await prisma.sRHotel.findFirst({ where: { id: Number(hotelId), tenantId: auth.tenantId } });
  if (!hotel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const checkDate = new Date(date);
  const season = await prisma.sRSeason.findFirst({ where: { hotelId: Number(hotelId), startDate: { lte: checkDate }, endDate: { gte: checkDate } } });
  if (!season) return NextResponse.json({ prices: [], season: null, message: 'No season covers this date' });
  return NextResponse.json({ prices: await prisma.sRRoomPrice.findMany({ where: { seasonId: season.id, boardBasis }, include: { roomType: true } }), season, hotel });
}
