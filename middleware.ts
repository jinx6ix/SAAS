// middleware.ts — paywall enforcement on /dashboard/*
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/dashboard')) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const tenant = (token as any).tenant as {
    subscriptionStatus: string;
    trialEndsAt:        string | null;
    currentPeriodEnd:   string | null;
  } | null;

  if (!tenant) return NextResponse.redirect(new URL('/login', req.url));

  // Billing page always accessible so suspended tenants can pay
  if (pathname.startsWith('/dashboard/admin/billing')) return NextResponse.next();

  const status = tenant.subscriptionStatus;

  if (status === 'trial') {
    if (tenant.trialEndsAt && new Date() > new Date(tenant.trialEndsAt))
      return NextResponse.redirect(new URL('/billing?reason=trial_expired', req.url));
    return NextResponse.next();
  }

  if (status === 'active') {
    if (tenant.currentPeriodEnd) {
      const grace = new Date(tenant.currentPeriodEnd);
      grace.setDate(grace.getDate() + 3);
      if (new Date() > grace)
        return NextResponse.redirect(new URL('/billing?reason=expired', req.url));
    }
    return NextResponse.next();
  }

  if (status === 'pending_payment') return NextResponse.redirect(new URL('/billing?reason=pending', req.url));
  if (status === 'past_due')        return NextResponse.redirect(new URL('/billing?reason=past_due', req.url));
  if (status === 'suspended')       return NextResponse.redirect(new URL('/billing?reason=suspended', req.url));
  if (status === 'canceled')        return NextResponse.redirect(new URL('/billing?reason=suspended', req.url));

  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
