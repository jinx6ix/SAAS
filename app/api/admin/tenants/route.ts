// app/api/admin/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/tenant';
import { auditLog } from '@/lib/logger';

// GET — list all tenants with full stats
export async function GET(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { log } = auth;

  log.info('Admin: fetching all tenants');

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      plan: { select: { name: true, priceKES: true, priceUSD: true } },
      _count: { select: { users: true, bookings: true, clients: true, invoices: true, vouchers: true } },
      paymentRequests: {
        where:   { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take:    5,
        include: { plan: { select: { name: true, priceKES: true } } },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take:    3,
        select:  { id: true, status: true, amount: true, currency: true, paymentMethod: true, startDate: true, endDate: true },
      },
    },
  });

  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceKES: 'asc' } });

  const activeCount  = tenants.filter(t => t.subscriptionStatus === 'active').length;
  const trialCount   = tenants.filter(t => t.subscriptionStatus === 'trial').length;
  const pendingCount = tenants.filter(t => t.subscriptionStatus === 'pending_payment').length;
  const suspended    = tenants.filter(t => ['suspended','canceled','past_due'].includes(t.subscriptionStatus)).length;
  const mrr          = tenants.filter(t => t.subscriptionStatus === 'active' && t.plan).reduce((s, t) => s + (t.plan?.priceKES || 0), 0);

  log.info('Admin: tenants fetched', { count: tenants.length, mrr });

  return NextResponse.json({
    summary: { total: tenants.length, active: activeCount, trial: trialCount, pending: pendingCount, suspended, mrr },
    tenants,
    plans,
  });
}

// DELETE — delete a tenant and all their data
export async function DELETE(req: NextRequest) {
  const auth = await requireOwner(req);
  if (auth instanceof NextResponse) return auth;
  const { userId, log } = auth;

  const { tenantId, reason } = await req.json();
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  log.warn('Admin: deleting tenant', { tenantId, tenantName: tenant.name, reason });

  // Delete in dependency order
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { tenantId } });
    await tx.subscription.deleteMany({ where: { tenantId } });
    await tx.paymentRequest.deleteMany({ where: { tenantId } });
    await tx.itineraryImage.deleteMany({ where: { day: { itinerary: { booking: { tenantId } } } } });
    await tx.itineraryDay.deleteMany({ where: { itinerary: { booking: { tenantId } } } });
    await tx.itinerary.deleteMany({ where: { booking: { tenantId } } });
    await tx.invoice.deleteMany({ where: { tenantId } });
    await tx.costSheet.deleteMany({ where: { tenantId } });
    await tx.voucher.deleteMany({ where: { tenantId } });
    await tx.booking.deleteMany({ where: { tenantId } });
    await tx.client.deleteMany({ where: { tenantId } });
    await tx.agent.deleteMany({ where: { tenantId } });
    await tx.sRRoomPrice.deleteMany({ where: { roomType: { hotel: { tenantId } } } });
    await tx.sRRoomType.deleteMany({ where: { hotel: { tenantId } } });
    await tx.sRSeason.deleteMany({ where: { hotel: { tenantId } } });
    await tx.sRHotel.deleteMany({ where: { tenantId } });
    await tx.sRCounty.deleteMany({ where: { tenantId } });
    await tx.rateCard.deleteMany({ where: { tourPackage: { tenantId } } });
    await tx.tourDay.deleteMany({ where: { tourPackage: { tenantId } } });
    await tx.tourPackage.deleteMany({ where: { tenantId } });
    await tx.destination.deleteMany({ where: { tenantId } });
    await tx.vehicle.deleteMany({ where: { tenantId } });
    await tx.property.deleteMany({ where: { tenantId } });
    await tx.user.deleteMany({ where: { tenantId } });
    await tx.tenant.delete({ where: { id: tenantId } });
  });

  // Audit log (global — tenantId is now deleted)
  await auditLog('tenant.delete', tenantId, userId, { tenantName: tenant.name, tenantEmail: tenant.email, reason });
  log.warn('Admin: tenant deleted successfully', { tenantId, tenantName: tenant.name });

  return NextResponse.json({ success: true });
}
