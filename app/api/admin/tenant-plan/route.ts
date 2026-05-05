// app/api/admin/tenant-plan/route.ts
// Owner sets a tenant's plan directly (no payment needed — manual override)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/tenant';
import { auditLog } from '@/lib/logger';
import { notifyTenantApproved } from '@/lib/notify';

export async function POST(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { userId, log } = auth;

  const { tenantId, planId, status, note, extendDays } = await req.json();
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    planId ? prisma.plan.findUnique({ where: { id: planId } }) : null,
  ]);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const updateData: any = {};
  if (planId && plan) updateData.planId = planId;
  if (status)         updateData.subscriptionStatus = status;

  if (status === 'active' || (!status && planId)) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (extendDays || 30));
    updateData.currentPeriodEnd   = endDate;
    updateData.subscriptionStatus = updateData.subscriptionStatus || 'active';
  }

  if (status === 'trial') {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + (extendDays || 14));
    updateData.trialEndsAt          = trialEnd;
    updateData.subscriptionStatus   = 'trial';
  }

  log.info('Admin: updating tenant plan/status', { tenantId, planId, status, extendDays });

  await prisma.tenant.update({ where: { id: tenantId }, data: updateData });

  await auditLog('tenant.manual_update', tenantId, userId, {
    planId, status, extendDays, note,
    oldStatus: tenant.subscriptionStatus,
    oldPlanId: tenant.planId,
  });

  // If activating, notify tenant
  if (updateData.subscriptionStatus === 'active') {
    try {
      await notifyTenantApproved({ tenantEmail: tenant.email, tenantName: tenant.name, planName: plan?.name || 'Subscription' });
    } catch {}
  }

  const updated = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  log.info('Admin: tenant updated successfully', { tenantId, newStatus: updated?.subscriptionStatus, newPlanId: updated?.planId });

  return NextResponse.json({ success: true, tenant: updated });
}
