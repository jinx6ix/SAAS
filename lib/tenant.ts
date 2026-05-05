// lib/tenant.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { v4 as uuid } from 'uuid';

export async function requireTenant(req?: NextRequest): Promise<
  { tenantId: string; userId: string; role: string; log: ReturnType<typeof logger.child>; requestId: string } | NextResponse
> {
  const session = await getServerSession(authOptions);
  const requestId = req?.headers.get('x-request-id') || uuid();

  if (!session) {
    logger.warn('Unauthenticated request', { requestId, path: req?.nextUrl.pathname });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as any).tenantId as string | undefined;
  const userId   = (session.user as any).id       as string | undefined;
  const role     = (session.user as any).role     as string | undefined;

  if (!tenantId || !userId) {
    logger.warn('Session missing tenantId or userId', { requestId, email: session.user?.email });
    return NextResponse.json({ error: 'No tenant' }, { status: 400 });
  }

  const log = logger.child({
    requestId,
    userId,
    tenantId,
    email:  session.user?.email || undefined,
    path:   req?.nextUrl.pathname,
    method: req?.method,
  });

  return { tenantId, userId, role: role ?? 'EMPLOYEE', log, requestId };
}

export async function requireOwner(req?: NextRequest): Promise<
  { userId: string; email: string; log: ReturnType<typeof logger.child>; requestId: string } | NextResponse
> {
  const session    = await getServerSession(authOptions);
  const ownerEmail = process.env.OWNER_EMAIL || '';
  const requestId  = req?.headers.get('x-request-id') || uuid();

  if (!session || session.user?.email !== ownerEmail) {
    logger.warn('Non-owner attempted admin access', {
      requestId,
      email: session?.user?.email,
      path:  req?.nextUrl.pathname,
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const log = logger.child({
    requestId,
    userId:  (session.user as any).id,
    email:   session.user.email || undefined,
    path:    req?.nextUrl.pathname,
    method:  req?.method,
    isOwner: true,
  });

  return { userId: (session.user as any).id, email: session.user.email!, log, requestId };
}
