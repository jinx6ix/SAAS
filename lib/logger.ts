// lib/logger.ts
// Centralized structured logger with log levels, timestamps, request IDs, user IDs.
// Outputs JSON lines to stdout (Vercel captures these → searchable in Vercel Logs).
// In dev: pretty-prints to console.
// Log levels: debug < info < warn < error
// Usage:
//   import { logger } from '@/lib/logger'
//   const log = logger.child({ requestId, userId, tenantId })
//   log.info('Booking created', { bookingId, amount })
//   log.error('Payment failed', { error: e.message, planId })

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  requestId?: string;
  userId?:    string;
  tenantId?:  string;
  email?:     string;
  path?:      string;
  method?:    string;
  [key: string]:  unknown;
};

type LogEntry = {
  timestamp: string;
  level:     LogLevel;
  message:   string;
  service:   string;
  env:       string;
  context:   LogContext;
  data?:     Record<string, unknown>;
};

const LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const IS_DEV = process.env.NODE_ENV !== 'production';

// ANSI colors for dev pretty-print
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_VALUES[level] >= LEVEL_VALUES[MIN_LEVEL];
}

function output(entry: LogEntry) {
  if (IS_DEV) {
    const color = COLORS[entry.level];
    const ctx   = Object.keys(entry.context).length
      ? ` ${JSON.stringify(entry.context)}`
      : '';
    const data  = entry.data && Object.keys(entry.data).length
      ? `\n  ${JSON.stringify(entry.data, null, 2)}`
      : '';
    console.log(
      `${color}[${entry.level.toUpperCase().padEnd(5)}]${RESET} ${entry.timestamp} ${entry.message}${ctx}${data}`
    );
  } else {
    // Production: single JSON line per log entry (Vercel/any log aggregator)
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

class ChildLogger {
  constructor(private ctx: LogContext) {}

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service:   'safarops',
      env:       process.env.NODE_ENV || 'development',
      context:   this.ctx,
      ...(data && Object.keys(data).length ? { data } : {}),
    };
    output(entry);
  }

  debug(message: string, data?: Record<string, unknown>) { this.log('debug', message, data); }
  info (message: string, data?: Record<string, unknown>) { this.log('info',  message, data); }
  warn (message: string, data?: Record<string, unknown>) { this.log('warn',  message, data); }
  error(message: string, data?: Record<string, unknown>) { this.log('error', message, data); }

  child(extra: LogContext): ChildLogger {
    return new ChildLogger({ ...this.ctx, ...extra });
  }
}

class Logger {
  child(ctx: LogContext): ChildLogger {
    return new ChildLogger(ctx);
  }

  debug(message: string, data?: Record<string, unknown>) {
    new ChildLogger({}).debug(message, data);
  }
  info(message: string, data?: Record<string, unknown>) {
    new ChildLogger({}).info(message, data);
  }
  warn(message: string, data?: Record<string, unknown>) {
    new ChildLogger({}).warn(message, data);
  }
  error(message: string, data?: Record<string, unknown>) {
    new ChildLogger({}).error(message, data);
  }
}

export const logger = new Logger();

// ── Request logger middleware helper ──────────────────────────────────────────
// Use at the top of every API route:
//   const { log, requestId } = requestLogger(req, session)
import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';

export function requestLogger(
  req:     NextRequest,
  session?: { user?: { email?: string | null; id?: string; tenantId?: string } } | null
) {
  const requestId = req.headers.get('x-request-id') || uuid();
  const log = logger.child({
    requestId,
    userId:   (session?.user as any)?.id       || undefined,
    tenantId: (session?.user as any)?.tenantId || undefined,
    email:    session?.user?.email             || undefined,
    path:     req.nextUrl.pathname,
    method:   req.method,
  });

  log.info('Request received');
  return { log, requestId };
}

// ── Store logs in DB for the admin log viewer ─────────────────────────────────
// Call this for important audit events (approve, reject, plan change, etc.)
export async function auditLog(
  action:   string,
  tenantId: string,
  actorId:  string,
  details:  Record<string, unknown>
) {
  try {
    const { prisma } = await import('@/lib/prisma');
    await (prisma as any).auditLog.create({
      data: {
        action,
        tenantId,
        actorId,
        details: JSON.stringify(details),
        timestamp: new Date(),
      },
    });
  } catch (e) {
    logger.warn('auditLog write failed (AuditLog table may not exist yet)', { error: String(e) });
  }
}
