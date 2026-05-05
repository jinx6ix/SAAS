import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const sp = req.nextUrl.searchParams;
  const hotelName = sp.get('hotel'); const dateStr = sp.get('date'); const boardBasis = sp.get('board')||'FB';
  if (!hotelName || !dateStr) return NextResponse.json({ error: 'hotel and date required' }, { status: 400 });
  const hotel = await prisma.sRHotel.findFirst({ where: { tenantId: auth.tenantId, name: { contains: hotelName, mode: 'insensitive' } } });
  if (!hotel) return NextResponse.json({ found: false, prices: [] });
  const checkDate = new Date(dateStr);
  const season = await prisma.sRSeason.findFirst({ where: { hotelId: hotel.id, startDate: { lte: checkDate }, endDate: { gte: checkDate } } });
  if (!season) return NextResponse.json({ found: true, hotel, season: null, prices: [] });
  return NextResponse.json({ found: true, hotel, season, prices: await prisma.sRRoomPrice.findMany({ where: { seasonId: season.id, boardBasis }, include: { roomType: true } }) });
}
