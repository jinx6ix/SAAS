import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const q = req.nextUrl.searchParams.get('q')||'';
  return NextResponse.json(await prisma.property.findMany({ where: { tenantId: auth.tenantId, ...(q?{OR:[{name:{contains:q,mode:'insensitive'}},{location:{contains:q,mode:'insensitive'}}]}:{}) }, orderBy: { name: 'asc' } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const b = await req.json();
  return NextResponse.json(await prisma.property.create({ data: { tenantId: auth.tenantId, name: b.name, type: b.type||'CAMP', location: b.location||null, country: b.country||'KENYA', category: b.category||3, contactName: b.contactName||null, phone: b.phone||null, email: b.email||null, notes: b.notes||null } }), { status: 201 });
}
