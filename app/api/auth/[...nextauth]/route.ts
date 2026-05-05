// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if there is an active session (unexpired) for this user
      const activeSession = await prisma.session.findFirst({
        where: {
          userId: user.id,
          expires: { gt: new Date() },
        },
      });
      if (activeSession) {
        // Reject new login and redirect with custom error
        return `/login?error=session_active`;
      }
      return true;
    },
    async session({ session, user }) {
      // Attach user id to session object (optional)
      session.user.id = user.id;
      return session;
    },
  },
  session: {
    strategy: 'database',   // Use database sessions
    maxAge: 24 * 60 * 60,   // 1 day (adjust as needed)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};