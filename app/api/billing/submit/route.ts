import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyOwnerPaymentSubmitted } from '@/lib/notify';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // === DEBUG LOGGING START ===
  console.log('🔵 [billing/submit] Route entered', {
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  
  let session;
  try {
    console.log('🔵 [billing/submit] Fetching session...');
    session = await getServerSession(authOptions);
    console.log('🔵 [billing/submit] Session fetched', { hasSession: !!session });
  } catch (sessionErr) {
    console.error('🔴 [billing/submit] Session fetch error:', sessionErr);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }

  if (!session) {
    console.log('❌ [billing/submit] No session, returning 401');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as any).tenantId as string;
  const userId = (session.user as any).id as string;
  const log = logger.child({ path: '/api/billing/submit', userId, tenantId });

  console.log('🔵 [billing/submit] User data', { tenantId, userId });

  let body;
  try {
    body = await req.json();
    console.log('🔵 [billing/submit] Request body', body);
  } catch (parseErr) {
    console.error('🔴 [billing/submit] JSON parse error', parseErr);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { planId, method, reference, proofNote } = body;
  if (!planId || !method || !reference) {
    log.warn('Billing submit missing fields', { planId, method, hasRef: !!reference });
    console.log('❌ [billing/submit] Missing fields', { planId, method, reference });
    return NextResponse.json({ error: 'planId, method and reference required' }, { status: 422 });
  }

  console.log('🔵 [billing/submit] Fetching tenant and plan...');
  let tenant, plan;
  try {
    [tenant, plan] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ]);
    console.log('🔵 [billing/submit] Fetch results', {
      tenantFound: !!tenant,
      planFound: !!plan,
      tenantId,
      planId,
    });
  } catch (dbErr) {
    console.error('🔴 [billing/submit] Database fetch error', dbErr);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!tenant || !plan) {
    console.log('❌ [billing/submit] Returning 404 - tenant or plan missing', {
      tenantId,
      planId,
      tenantExists: !!tenant,
      planExists: !!plan,
    });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  console.log('🔵 [billing/submit] Creating payment request...');
  let pr;
  try {
    pr = await prisma.paymentRequest.create({
      data: {
        tenantId,
        planId,
        amount: plan.priceKES,
        currency: 'KES',
        method,
        reference,
        proofNote: proofNote || null,
        status: 'pending',
      },
    });
    console.log('🔵 [billing/submit] Payment request created', { paymentRequestId: pr.id });
  } catch (createErr) {
    console.error('🔴 [billing/submit] Payment request creation error', createErr);
    return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: 'pending_payment' },
    });
    console.log('🔵 [billing/submit] Tenant subscription status updated to pending_payment');
  } catch (updateErr) {
    console.error('🔴 [billing/submit] Tenant update error', updateErr);
    // Non-fatal, continue
  }

  log.info('Payment submitted', { paymentRequestId: pr.id, method, planName: plan.name, amount: plan.priceKES });

  try {
    await notifyOwnerPaymentSubmitted({
      tenantId,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      planName: plan.name,
      amount: `KES ${plan.priceKES.toLocaleString()}`,
      method: method === 'mpesa' ? 'M-Pesa' : method === 'bank' ? 'Co-op Bank' : 'PayPal',
      reference,
    });
    console.log('🔵 [billing/submit] Owner notified of payment');
  } catch (e: any) {
    log.warn('Owner notification failed', { error: e.message });
    console.warn('⚠️ [billing/submit] Owner notification failed', e.message);
  }

  console.log('✅ [billing/submit] Success, returning 200');
  return NextResponse.json({ success: true, paymentRequestId: pr.id });
}