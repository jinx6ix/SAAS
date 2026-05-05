import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const log = logger.child({ path: '/api/tenant/register' });
  try {
    const { companyName, companySlug, companyEmail, companyPhone, adminName, adminEmail, adminPassword } = await req.json();
    if (!companyName||!companySlug||!companyEmail||!adminName||!adminEmail||!adminPassword) return NextResponse.json({ error: 'All fields required' }, { status: 422 });
    if (adminPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 422 });
    if (!/^[a-z0-9-]+$/.test(companySlug)) return NextResponse.json({ error: 'Slug may only contain lowercase letters, numbers, hyphens' }, { status: 422 });

    const [slugTaken, emailTaken, adminEmailTaken] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug: companySlug } }),
      prisma.tenant.findUnique({ where: { email: companyEmail } }),
      prisma.user.findUnique({ where: { email: adminEmail } }),
    ]);
    if (slugTaken)       return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 });
    if (emailTaken)      return NextResponse.json({ error: 'Company email already registered' }, { status: 409 });
    if (adminEmailTaken) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

    const trialEndsAt = new Date(); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const hashed = await bcrypt.hash(adminPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: companyName, slug: companySlug, email: companyEmail, phone: companyPhone||null, subscriptionStatus: 'trial', trialEndsAt } });
      const user   = await tx.user.create({ data: { tenantId: tenant.id, name: adminName, email: adminEmail, password: hashed, role: 'ADMIN', isActive: true } });
      return { tenant, user };
    });

    log.info('New tenant registered', { tenantId: result.tenant.id, slug: companySlug, adminEmail });
    return NextResponse.json({ success: true, message: '14-day free trial started. Please sign in.' });
  } catch (e: any) {
    log.error('Registration failed', { error: e.message });
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ available: false });
  return NextResponse.json({ available: !(await prisma.tenant.findUnique({ where: { slug } })) });
}
