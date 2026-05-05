import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await prisma.vehicle.findMany({ where: { tenantId: auth.tenantId }, orderBy: { name: 'asc' } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const b = await req.json();
  return NextResponse.json(await prisma.vehicle.create({ data: { tenantId: auth.tenantId, name: b.name, type: b.type||'OPEN_SIDED_JEEP', seats: b.seats, regPlate: b.regPlate||null, isAvailable: b.isAvailable??true, ratePerDay: b.ratePerDay||null, currency: b.currency||'KES', notes: b.notes||null } }), { status: 201 });
}
