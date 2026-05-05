import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const sp = req.nextUrl.searchParams; const q = sp.get('q')||''; const countyId = sp.get('countyId');
  return NextResponse.json(await prisma.sRHotel.findMany({ where: { tenantId: auth.tenantId, ...(q?{name:{contains:q,mode:'insensitive'}}:{}), ...(countyId?{countyId:Number(countyId)}:{}) }, include: { county: true, roomTypes: { include: { prices: { include: { season: true } } } }, seasons: { orderBy: { startDate: 'asc' } } }, take: 20 }));
}
