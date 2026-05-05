import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await prisma.costSheet.findMany({ where: { tenantId: auth.tenantId }, orderBy: { createdAt: 'desc' }, include: { client: true, agent: true, booking: true } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const b = await req.json();
  const sheet = await prisma.costSheet.create({ data: { tenantId, bookingId: b.bookingId||null, clientId: b.clientId||null, agentId: b.agentId||null, bookingRef: b.bookingRef||null, tourTitle: b.tourTitle, days: b.days, numAdults: b.numAdults||1, numChildren: b.numChildren||0, numPax: b.numPax||b.numAdults||1, boardBasis: b.boardBasis||'FB', currency: b.currency||'USD', dayRows: JSON.stringify(b.dayRows||[]), fileHandlingFee: b.fileHandlingFee||0, ecoBottle: b.ecoBottle||0, evacInsurance: b.evacInsurance||0, arrivalTransfer: b.arrivalTransfer||0, departureTransfer: b.departureTransfer||0, flightCostPP: b.flightCostPP||0, extras: b.extras||null, maasaiVillage: b.maasaiVillage||false, maasaiCost: b.maasaiCost||0, subtotal: b.subtotal, markupPercent: b.markupPercent||10, markupAmount: b.markupAmount, totalCost: b.totalCost, perAdultCost: b.perAdultCost, perChildCost: b.perChildCost||0, notes: b.notes||null } });
  log.info('Cost sheet created', { sheetId: sheet.id, totalCost: sheet.totalCost });
  return NextResponse.json(sheet, { status: 201 });
}
