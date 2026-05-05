import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
import bcrypt from 'bcryptjs';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, select: { id:true,name:true,email:true,role:true,isActive:true,createdAt:true } });
  log.debug('Users fetched', { count: users.length });
  return NextResponse.json(users);
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, role, log } = auth;
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const b = await req.json();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true, _count: { select: { users: true } } } });
  if (tenant?.plan?.maxUsers !== -1 && (tenant?._count.users ?? 0) >= (tenant?.plan?.maxUsers ?? 1)) {
    log.warn('User limit reached', { maxUsers: tenant?.plan?.maxUsers, currentUsers: tenant?._count.users });
    return NextResponse.json({ error: `Your plan allows max ${tenant?.plan?.maxUsers} user(s). Upgrade to add more.` }, { status: 403 });
  }
  if (await prisma.user.findUnique({ where: { email: b.email } })) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  const user = await prisma.user.create({ data: { tenantId, name: b.name, email: b.email, password: await bcrypt.hash(b.password, 12), role: b.role||'EMPLOYEE', isActive: b.isActive??true }, select: { id:true,name:true,email:true,role:true,isActive:true } });
  log.info('User created', { newUserId: user.id, newUserEmail: user.email });
  return NextResponse.json(user, { status: 201 });
}
