import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
import bcrypt from 'bcryptjs';
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!await prisma.user.findFirst({ where: { id: params.id, tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b: any = await req.json();
  const data: any = { name: b.name, role: b.role, isActive: b.isActive };
  if (b.password) data.password = await bcrypt.hash(b.password, 12);
  const user = await prisma.user.update({ where: { id: params.id }, data, select: { id:true,name:true,email:true,role:true,isActive:true } });
  log.info('User updated', { targetUserId: user.id });
  return NextResponse.json(user);
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, userId, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (params.id === userId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  if (!await prisma.user.findFirst({ where: { id: params.id, tenantId }, select: { id:true } })) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.user.delete({ where: { id: params.id } });
  log.info('User deleted', { targetUserId: params.id });
  return NextResponse.json({ ok: true });
}
