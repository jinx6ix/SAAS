import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const countyId = req.nextUrl.searchParams.get('countyId');
  return NextResponse.json(await prisma.sRHotel.findMany({ where: { tenantId: auth.tenantId, ...(countyId?{countyId:Number(countyId)}:{}) }, orderBy: { name: 'asc' }, include: { county: true, roomTypes: { include: { prices: { include: { season: true } } } }, seasons: true } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const b = await req.json();
  if (!await prisma.sRCounty.findFirst({ where: { id: Number(b.countyId), tenantId: auth.tenantId } })) return NextResponse.json({ error: 'County not found' }, { status: 404 });
  try { return NextResponse.json(await prisma.sRHotel.create({ data: { tenantId: auth.tenantId, countyId: Number(b.countyId), name: b.name, stars: b.stars?Number(b.stars):null, category: b.category||null, contactEmail: b.contactEmail||null, contactPhone: b.contactPhone||null, notes: b.notes||null } }), { status: 201 }); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
