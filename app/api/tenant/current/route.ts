import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as any).tenantId as string;
  return NextResponse.json(await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true, email: true, phone: true, logoUrl: true, subscriptionStatus: true, currentPeriodEnd: true, trialEndsAt: true, plan: { select: { name: true, maxUsers: true, maxBookings: true, features: true } }, _count: { select: { users: true, bookings: true, clients: true } } } }));
}
