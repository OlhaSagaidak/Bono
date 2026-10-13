import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { follows } from "@/db/schema";

export async function isFollowing(followerId: string, nonprofitId: string): Promise<boolean> {
  const row = await db.query.follows.findFirst({
    where: and(eq(follows.followerId, followerId), eq(follows.nonprofitId, nonprofitId)),
    columns: { nonprofitId: true },
  });
  return Boolean(row);
}
