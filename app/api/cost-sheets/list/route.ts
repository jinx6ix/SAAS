import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await prisma.costSheet.findMany({ where: { tenantId: auth.tenantId, ...(sp.get('bookingId')?{bookingId:sp.get('bookingId')!}:{}), ...(sp.get('clientId')?{clientId:sp.get('clientId')!}:{}) }, orderBy: { createdAt: 'desc' }, include: { client: true, agent: true } }));
}
