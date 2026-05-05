import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyOwnerPaymentSubmitted } from '@/lib/notify';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as any).tenantId as string;
  const userId   = (session.user as any).id as string;
  const log = logger.child({ path: '/api/billing/submit', userId, tenantId });

  const { planId, method, reference, proofNote } = await req.json();
  if (!planId || !method || !reference) {
    log.warn('Billing submit missing fields', { planId, method, hasRef: !!reference });
    return NextResponse.json({ error: 'planId, method and reference required' }, { status: 422 });
  }

  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!tenant || !plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pr = await prisma.paymentRequest.create({
    data: { tenantId, planId, amount: plan.priceKES, currency: 'KES', method, reference, proofNote: proofNote||null, status: 'pending' },
  });

  await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'pending_payment' } });

  log.info('Payment submitted', { paymentRequestId: pr.id, method, planName: plan.name, amount: plan.priceKES });

  try {
    await notifyOwnerPaymentSubmitted({
      tenantId, tenantName: tenant.name, tenantEmail: tenant.email,
      planName: plan.name, amount: `KES ${plan.priceKES.toLocaleString()}`,
      method: method === 'mpesa' ? 'M-Pesa' : method === 'bank' ? 'Co-op Bank' : 'PayPal',
      reference,
    });
    log.info('Owner notified of payment');
  } catch (e: any) {
    log.warn('Owner notification failed', { error: e.message });
  }

  return NextResponse.json({ success: true, paymentRequestId: pr.id });
}
