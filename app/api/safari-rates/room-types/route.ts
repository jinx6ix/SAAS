import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const hotelId = req.nextUrl.searchParams.get('hotelId');
  if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 });
  if (!await prisma.sRHotel.findFirst({ where: { id: Number(hotelId), tenantId: auth.tenantId } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await prisma.sRRoomType.findMany({ where: { hotelId: Number(hotelId) }, orderBy: { name: 'asc' }, include: { prices: { include: { season: true } } } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const b = await req.json();
  if (!await prisma.sRHotel.findFirst({ where: { id: Number(b.hotelId), tenantId: auth.tenantId } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(await prisma.sRRoomType.create({ data: { hotelId: Number(b.hotelId), name: b.name, description: b.description||null, maxOccupancy: b.maxOccupancy||2 } }), { status: 201 });
}
