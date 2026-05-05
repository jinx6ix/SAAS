// app/api/admin/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/tenant';
import { notifyTenantApproved, notifyTenantRejected } from '@/lib/notify';
import { auditLog, logger } from '@/lib/logger';

async function isOwnerByToken(req: NextRequest): Promise<boolean> {
  const token = req.nextUrl.searchParams.get('token');
  return !!token && token === process.env.ADMIN_SECRET_TOKEN;
}

// GET — one-click approve/reject from email link
export async function GET(req: NextRequest) {
  const tokenValid = await isOwnerByToken(req);
  const auth = tokenValid ? { userId: 'owner-email-link', log: logger.child({ path: '/api/admin/approve' }), email: process.env.OWNER_EMAIL! } : await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { userId, log } = auth;

  const tenantId = req.nextUrl.searchParams.get('tenantId');
  const action   = req.nextUrl.searchParams.get('action');
  if (!tenantId || !action) return NextResponse.json({ error: 'tenantId and action required' }, { status: 400 });

  log.info('Admin: processing approval from email link', { tenantId, action });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const pr = await prisma.paymentRequest.findFirst({
    where: { tenantId, status: 'pending' }, orderBy: { createdAt: 'desc' }, include: { plan: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (action === 'approve') {
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'active', planId: pr?.planId || tenant.planId, currentPeriodEnd: endDate } });
      if (pr) {
        await tx.paymentRequest.update({ where: { id: pr.id }, data: { status: 'approved', reviewedAt: new Date() } });
        await tx.subscription.create({ data: { tenantId, planId: pr.planId, status: 'active', amount: pr.amount, currency: pr.currency, paymentMethod: pr.method, paymentRequestId: pr.id, endDate } });
      }
    });
    await auditLog('tenant.approve', tenantId, userId, { planName: pr?.plan?.name, amount: pr?.amount, method: pr?.method, reference: pr?.reference });
    log.info('Admin: tenant approved', { tenantId, tenantName: tenant.name, planId: pr?.planId });
    try { await notifyTenantApproved({ tenantEmail: tenant.email, tenantName: tenant.name, planName: pr?.plan?.name || 'Subscription' }); } catch {}
    return NextResponse.redirect(new URL(`/admin?approved=${tenant.name}`, baseUrl));
  }

  if (action === 'reject') {
    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'trial' } });
      if (pr) await tx.paymentRequest.update({ where: { id: pr.id }, data: { status: 'rejected', reviewedAt: new Date() } });
    });
    await auditLog('tenant.reject', tenantId, userId, { reference: pr?.reference });
    log.info('Admin: tenant rejected', { tenantId, tenantName: tenant.name });
    try { await notifyTenantRejected({ tenantEmail: tenant.email, tenantName: tenant.name }); } catch {}
    return NextResponse.redirect(new URL(`/admin?rejected=${tenant.name}`, baseUrl));
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// POST — from admin dashboard UI (approve, reject, suspend, cancel)
export async function POST(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { userId, log } = auth;

  const { tenantId, paymentRequestId, action, reviewNote, planId: newPlanId } = await req.json();
  if (!tenantId || !action) return NextResponse.json({ error: 'tenantId and action required' }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  log.info('Admin: action on tenant', { tenantId, action, tenantName: tenant.name });

  // ── Approve ──────────────────────────────────────────────────────────────
  if (action === 'approve') {
    const pr = paymentRequestId
      ? await prisma.paymentRequest.findUnique({ where: { id: paymentRequestId }, include: { plan: true } })
      : await prisma.paymentRequest.findFirst({ where: { tenantId, status: 'pending' }, orderBy: { createdAt: 'desc' }, include: { plan: true } });

    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
    const effectivePlanId = newPlanId || pr?.planId || tenant.planId;
    if (!effectivePlanId) return NextResponse.json({ error: 'No plan specified' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'active', planId: effectivePlanId, currentPeriodEnd: endDate } });
      if (pr) {
        await tx.paymentRequest.update({ where: { id: pr.id }, data: { status: 'approved', reviewedAt: new Date(), reviewNote: reviewNote || null } });
        await tx.subscription.create({ data: { tenantId, planId: effectivePlanId, status: 'active', amount: pr.amount, currency: pr.currency, paymentMethod: pr.method, paymentRequestId: pr.id, endDate } });
      }
    });
    await auditLog('tenant.approve', tenantId, userId, { planId: effectivePlanId, reviewNote, amount: pr?.amount });
    log.info('Admin: tenant approved', { tenantId, planId: effectivePlanId });
    try {
      const plan = await prisma.plan.findUnique({ where: { id: effectivePlanId } });
      await notifyTenantApproved({ tenantEmail: tenant.email, tenantName: tenant.name, planName: plan?.name || 'Subscription' });
    } catch {}
    return NextResponse.json({ success: true, action: 'approved' });
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    const pr = paymentRequestId
      ? await prisma.paymentRequest.findUnique({ where: { id: paymentRequestId } })
      : await prisma.paymentRequest.findFirst({ where: { tenantId, status: 'pending' }, orderBy: { createdAt: 'desc' } });

    await prisma.$transaction(async (tx) => {
      await tx.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'trial' } });
      if (pr) await tx.paymentRequest.update({ where: { id: pr.id }, data: { status: 'rejected', reviewedAt: new Date(), reviewNote: reviewNote || null } });
    });
    await auditLog('tenant.reject', tenantId, userId, { reviewNote });
    log.info('Admin: tenant rejected', { tenantId });
    try { await notifyTenantRejected({ tenantEmail: tenant.email, tenantName: tenant.name }); } catch {}
    return NextResponse.json({ success: true, action: 'rejected' });
  }

  // ── Change Plan ───────────────────────────────────────────────────────────
  if (action === 'change_plan') {
    if (!newPlanId) return NextResponse.json({ error: 'planId required for plan change' }, { status: 400 });
    const oldPlanId = tenant.planId;
    await prisma.tenant.update({ where: { id: tenantId }, data: { planId: newPlanId } });
    await auditLog('tenant.plan_change', tenantId, userId, { oldPlanId, newPlanId, reviewNote });
    log.info('Admin: tenant plan changed', { tenantId, oldPlanId, newPlanId });
    return NextResponse.json({ success: true, action: 'plan_changed' });
  }

  // ── Suspend ───────────────────────────────────────────────────────────────
  if (action === 'suspend') {
    await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'suspended' } });
    await auditLog('tenant.suspend', tenantId, userId, { reason: reviewNote });
    log.warn('Admin: tenant suspended', { tenantId, tenantName: tenant.name });
    return NextResponse.json({ success: true, action: 'suspended' });
  }

  // ── Reactivate ────────────────────────────────────────────────────────────
  if (action === 'reactivate') {
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 30);
    await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'active', currentPeriodEnd: endDate } });
    await auditLog('tenant.reactivate', tenantId, userId, { note: reviewNote });
    log.info('Admin: tenant reactivated', { tenantId });
    return NextResponse.json({ success: true, action: 'reactivated' });
  }

  // ── Extend Trial ──────────────────────────────────────────────────────────
  if (action === 'extend_trial') {
    const days      = parseInt(reviewNote || '7') || 7;
    const trialEndsAt = new Date(); trialEndsAt.setDate(trialEndsAt.getDate() + days);
    await prisma.tenant.update({ where: { id: tenantId }, data: { subscriptionStatus: 'trial', trialEndsAt } });
    await auditLog('tenant.extend_trial', tenantId, userId, { days });
    log.info('Admin: tenant trial extended', { tenantId, days });
    return NextResponse.json({ success: true, action: 'trial_extended' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
