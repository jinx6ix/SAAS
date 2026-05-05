import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const item = await prisma.invoice.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, include: { booking: { include: { client:true, tourPackage:true } } } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (!await prisma.invoice.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json();
  const invoice = await prisma.invoice.update({ where: { id: params.id }, data: { ...b, lineItems: b.lineItems?JSON.stringify(b.lineItems):undefined, dueDate: b.dueDate?new Date(b.dueDate):undefined, tenantId: undefined } });
  auth.log.info('Invoice updated', { invoiceId: invoice.id, status: invoice.status });
  return NextResponse.json(invoice);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.invoice.findFirst({ where: { id: params.id, tenantId: auth.tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.invoice.delete({ where: { id: params.id } });
  auth.log.info('Invoice deleted', { invoiceId: params.id });
  return NextResponse.json({ ok: true });
}
