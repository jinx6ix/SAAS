import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await prisma.sRCounty.findMany({ where: { tenantId: auth.tenantId }, orderBy: { name: 'asc' }, include: { _count: { select: { hotels: true } } } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const b = await req.json();
  try { return NextResponse.json(await prisma.sRCounty.create({ data: { tenantId: auth.tenantId, name: b.name, region: b.region||null } }), { status: 201 }); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
