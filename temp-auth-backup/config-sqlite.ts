import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateUser } from '../db-sqlite';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      divisionId: string | null;
      divisionName: string | null;
      divisionCode: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    divisionId: string | null;
    divisionName: string | null;
    divisionCode: string | null;
  }
}

export const authOptionsSQLite: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Username or Email', type: 'text', placeholder: 'username or email@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        try {
          const user = await authenticateUser(credentials.identifier, credentials.password);
          
          if (user) {
            console.log('✅ User authenticated successfully:', user.email);
            return user;
          } else {
            console.log('❌ Authentication failed for:', credentials.identifier);
            return null;
          }
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.divisionId = user.divisionId;
        token.divisionName = user.divisionName;
        token.divisionCode = user.divisionCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.divisionId = token.divisionId as string | null;
        session.user.divisionName = token.divisionName as string | null;
        session.user.divisionCode = token.divisionCode as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET || '24c824ed024bd7d1494fcf1e3cba5448f2fe5ff82fbed7b4f4b723f35858a493',
};

export default authOptionsSQLite;
