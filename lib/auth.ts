// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const log = logger.child({ path: '/api/auth/signin', email: credentials?.email });

        if (!credentials?.email || !credentials?.password) {
          log.warn('Auth attempt with missing credentials');
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            tenant: {
              select: {
                id: true, name: true, slug: true,
                subscriptionStatus: true,
                trialEndsAt: true,
                currentPeriodEnd: true,
                planId: true,
              },
            },
          },
        });

        if (!user || !user.isActive) {
          log.warn('Auth failed — user not found or inactive', { found: !!user });
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          log.warn('Auth failed — wrong password', { userId: user.id });
          return null;
        }

        log.info('Auth successful', { userId: user.id, tenantId: user.tenantId, role: user.role });

        return {
          id:       user.id,
          name:     user.name,
          email:    user.email,
          role:     user.role,
          tenantId: user.tenantId,
          tenant:   user.tenant,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.role     = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.tenant   = (user as any).tenant;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id       = token.id;
        (session.user as any).role     = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenant   = token.tenant;
      }
      return session;
    },
  },
};
