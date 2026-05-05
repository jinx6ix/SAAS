import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const s = await prisma.costSheet.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, include: { client: true, agent: true, booking: { include: { client: true } } } });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(s);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (!await prisma.costSheet.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  return NextResponse.json(await prisma.costSheet.update({ where: { id: params.id }, data: { ...b, dayRows: b.dayRows?JSON.stringify(b.dayRows):undefined, tenantId: undefined } }));
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.costSheet.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.costSheet.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
