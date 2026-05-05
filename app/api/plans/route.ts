import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceKES: 'asc' },
      select: {
        id: true,          // ← actual cuid (e.g., "clxyz123...")
        name: true,
        description: true,
        priceKES: true,
        maxUsers: true,
        maxBookings: true,
      },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}