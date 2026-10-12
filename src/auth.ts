import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signInSchema } from "@/lib/auth/validation";

// Compared against when the email is unknown, so a missing account takes as
// long as a wrong password and response time doesn't reveal who has signed up.
// A fixed hash of a discarded random string: hashing at import time would make
// Next's prerender see a random value.
const DUMMY_HASH = "$2b$10$1WZIUeJm6ZRK29tdeNCM/e4Fui715ygsduPCoRbll.j4h1N3faLLe";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials sign-in only works with JWT sessions in Auth.js.
  session: { strategy: "jwt" },
  // Render (and localhost in prod mode) serve us behind a proxy we control,
  // so the Host header is trustworthy. Without this Auth.js rejects every request.
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, parsed.data.email),
        });
        const ok = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_HASH,
        );
        if (!user || !ok) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
