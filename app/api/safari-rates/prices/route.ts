import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenant } from '@/lib/tenant';
export async function POST(req: NextRequest) {
  const auth = await requireTenant(req); if (auth instanceof NextResponse) return auth;
  const b = await req.json();
  const rt = await prisma.sRRoomType.findFirst({ where: { id: Number(b.roomTypeId) }, include: { hotel: true } });
  if (!rt || rt.hotel.tenantId !== auth.tenantId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    return NextResponse.json(await prisma.sRRoomPrice.upsert({ where: { roomTypeId_seasonId_boardBasis: { roomTypeId: Number(b.roomTypeId), seasonId: Number(b.seasonId), boardBasis: b.boardBasis||'FB' } }, update: { ratePerPersonSharing: b.ratePerPersonSharing??null, singleRoomRate: b.singleRoomRate??null, childRate: b.childRate??null, currency: b.currency||'USD', notes: b.notes||null }, create: { roomTypeId: Number(b.roomTypeId), seasonId: Number(b.seasonId), boardBasis: b.boardBasis||'FB', ratePerPersonSharing: b.ratePerPersonSharing??null, singleRoomRate: b.singleRoomRate??null, childRate: b.childRate??null, currency: b.currency||'USD', notes: b.notes||null } }), { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
