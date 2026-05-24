import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

// Fail loud si no hay secret en prod — NextAuth deriva uno inseguro en ese caso.
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET es obligatorio en producción.");
}

// Hash dummy precomputado (coste 12). Lo usamos cuando el email no existe
// para igualar el tiempo de respuesta y evitar enumeración por timing.
// "x" hasheado con bcrypt cost=12 — el valor concreto da igual mientras sea válido.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.LGTbKZQ6Vj/Fer6Hxg.4xVAdWfre";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // Credenciales obligan a JWT (NextAuth no soporta sesiones en BD con
  // CredentialsProvider). Los Users sí se persisten via el adapter.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        // Constant-time-ish: aunque el user no exista, gastamos un bcrypt.compare
        // contra un hash dummy para que la respuesta tarde lo mismo.
        const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
        const ok = await bcrypt.compare(credentials.password, hashToCheck);

        if (!user || !user.passwordHash || !ok) return null;
        if (user.status === "suspended") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // Refresh image/role/status desde BD en cada firma del JWT. Permite que
      // cambios (avatar, promoción a admin, suspensión) se reflejen sin esperar
      // a que expire el token. Coste: 1 SELECT a `users` por request autenticada
      // — mitigado aguas arriba por `cache(auth)`.
      if (token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { image: true, role: true, status: true },
        });
        if (!fresh || fresh.status === "suspended") {
          // User borrado o suspendido — invalida el token. El callback de session
          // verá un id ausente y devolverá sesión sin user.id, lo que hace que
          // `auth()` retorne null y el middleware/pages redirigen al login.
          token.id = undefined;
        } else {
          token.picture = fresh.image;
          token.role = fresh.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        if (token.picture !== undefined) session.user.image = token.picture;
        session.user.role = token.role;
      } else if (!token.id && session.user) {
        // Token invalidado en jwt(): garantiza que callers lean session sin id.
        (session.user as { id?: string }).id = undefined;
      }
      return session;
    },
  },
};

// React 19 cache() deduplica por request: aunque una página llame a `auth()`
// desde layout, page y child component, getServerSession sólo corre una vez.
export const auth = cache(() => getServerSession(authOptions));
