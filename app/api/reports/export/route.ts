import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type')||'summary'; const from = sp.get('from'); const to = sp.get('to');
  const dateFilter = (from && to) ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {};
  log.info('Report requested', { type, from, to });
  if (type === 'bookings')  return NextResponse.json(await prisma.booking.findMany({ where: { tenantId, ...dateFilter }, orderBy: { createdAt: 'desc' }, include: { client: true, tourPackage: true } }));
  if (type === 'invoices')  return NextResponse.json(await prisma.invoice.findMany({ where: { tenantId, ...dateFilter }, orderBy: { createdAt: 'desc' }, include: { booking: { include: { client: true } } } }));
  if (type === 'vouchers')  return NextResponse.json(await prisma.voucher.findMany({ where: { tenantId, ...dateFilter }, orderBy: { createdAt: 'desc' }, include: { booking: { include: { client: true } }, property: true, vehicle: true } }));
  if (type === 'summary') {
    const [totalBookings,confirmedBookings,totalClients,totalInvoices,totalVouchers] = await Promise.all([prisma.booking.count({where:{tenantId}}),prisma.booking.count({where:{tenantId,status:'CONFIRMED'}}),prisma.client.count({where:{tenantId}}),prisma.invoice.count({where:{tenantId}}),prisma.voucher.count({where:{tenantId}})]);
    return NextResponse.json({ totalBookings,confirmedBookings,totalClients,totalInvoices,totalVouchers });
  }
  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}
