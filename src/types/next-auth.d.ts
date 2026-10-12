import type { DefaultSession } from "next-auth";
import type { Role } from "@/db/schema";

// Carry the user's id and role in the JWT and session so pages can check them
// without a database round trip.
declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
