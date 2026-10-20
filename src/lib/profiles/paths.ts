import type { Role } from "@/db/schema";

/** Where an account's public profile lives, by role. */
export function profilePath(role: Role, id: string): string {
  return role === "nonprofit" ? `/nonprofits/${id}` : role === "sponsor" ? `/sponsors/${id}` : `/users/${id}`;
}
