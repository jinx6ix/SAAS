import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as any).tenantId as string;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id:true,name:true,slug:true,email:true,subscriptionStatus:true,currentPeriodEnd:true,trialEndsAt:true,
      plan: { select: { id:true,name:true,priceKES:true,maxUsers:true,maxBookings:true,features:true } },
      paymentRequests: { orderBy: { createdAt: 'desc' }, take: 10, include: { plan: { select: { name:true } } } },
      _count: { select: { users:true,bookings:true,clients:true } } },
  });
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let trialDaysRemaining: number | null = null;
  if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt) {
    const ms = new Date(tenant.trialEndsAt).getTime() - Date.now();
    trialDaysRemaining = Math.max(0, Math.ceil(ms / 86400000));
  }
  return NextResponse.json({ ...tenant, trialDaysRemaining });
}
