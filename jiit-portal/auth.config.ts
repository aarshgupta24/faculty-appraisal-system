import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [], // we don't configure providers here to keep it edge-compatible
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.id = user.id;
            token.department = (user as any).department;
            token.code = (user as any).employeeCode;
            token.role = (user as any).role;
        }
        return token;
    },
    async session({ session, token }) {
        if (token && session.user) {
            (session.user as any).id = token.sub;
            (session.user as any).department = token.department;
            (session.user as any).employeeCode = token.code;
            (session.user as any).role = token.role;
        }
        return session;
    },
  },
} satisfies NextAuthConfig;
