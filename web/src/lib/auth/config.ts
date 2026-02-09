import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getConfig } from '@/lib/config';
import log from '@/lib/logging/logger';

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

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    divisionId: string | null;
    divisionName: string | null;
    divisionCode: string | null;
  }
}

export const authOptions: NextAuthOptions = {
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
          let emailToSearch = credentials.identifier;

          // If identifier doesn't contain @, assume it's a username and append domain
          if (!credentials.identifier.includes('@')) {
            emailToSearch = `${credentials.identifier}@allsurfaceroofing.com`;
          }

          // Find user by email
          const user = await prisma.users.findFirst({
            where: {
              OR: [
                { email: emailToSearch },
                { email: credentials.identifier } // Also try the original identifier as email
              ]
            },
            include: {
              divisions: true,
            },
          });

          if (!user || !user.is_active) {
            return null;
          }

          // Validate password using bcrypt
          if (!user.password_hash) {
            log.auth('Authentication failed: User has no password hash set', {
              userId: user.id,
              identifier: credentials.identifier,
            });
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isPasswordValid) {
            log.auth('Authentication failed: Invalid password', {
              userId: user.id,
              identifier: credentials.identifier,
            });
            return null;
          }

          // Update last login time
          await prisma.users.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
          });

          // Log successful authentication
          log.auth('User successfully authenticated', {
            userId: user.id,
            email: user.email,
            role: user.role,
            divisionId: user.division_id,
          });

          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            divisionId: user.division_id,
            divisionName: user.divisions?.division_name || null,
            divisionCode: user.divisions?.division_code || null,
          };
        } catch (error) {
          log.error('Authentication error', {
            error: error instanceof Error ? error.message : String(error),
            identifier: credentials.identifier,
            stack: error instanceof Error ? error.stack : undefined,
          });
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
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.divisionId = token.divisionId;
        session.user.divisionName = token.divisionName;
        session.user.divisionCode = token.divisionCode;
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
  secret: getConfig().NEXTAUTH_SECRET,
};