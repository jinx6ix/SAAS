import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function GET(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId } = auth;
  return NextResponse.json(await prisma.invoice.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { booking: { include: { client: true } } } }));
}
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const { tenantId, log } = auth;
  const b = await req.json();
  if (!await prisma.booking.findFirst({ where: { id: b.bookingId, tenantId } })) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  const year = new Date().getFullYear();
  let invoiceNo = `INV-${year}-${Math.floor(Math.random()*9000)+1000}`;
  while (await prisma.invoice.findUnique({ where: { invoiceNo } })) invoiceNo = `INV-${year}-${Math.floor(Math.random()*9000)+1000}`;
  const invoice = await prisma.invoice.create({ data: { tenantId, invoiceNo, bookingId: b.bookingId, billTo: b.billTo, billToEmail: b.billToEmail||null, billToPhone: b.billToPhone||null, invoiceDate: b.invoiceDate?new Date(b.invoiceDate):new Date(), dueDate: new Date(b.dueDate), lineItems: JSON.stringify(b.lineItems||[]), subtotal: b.subtotal, taxAmount: b.taxAmount||0, depositReceived: b.depositReceived||0, totalAmount: b.totalAmount, amountPaid: b.amountPaid||0, currency: b.currency||'KES', paymentInstructions: b.paymentInstructions||null, notes: b.notes||null, status: b.status||'DRAFT' }, include: { booking: { include: { client: true } } } });
  log.info('Invoice created', { invoiceId: invoice.id, invoiceNo, totalAmount: invoice.totalAmount });
  return NextResponse.json(invoice, { status: 201 });
}
