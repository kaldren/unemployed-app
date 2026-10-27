import "server-only";
import { and, asc, eq, notExists } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";

// Deletes the user and, through cascades, everything that's theirs: profile, swipes, matches, scores.
// Each of their companies goes too when they were its last member; where they owned one, the oldest
// teammate becomes owner.
export async function deleteUser(userId: string) {
  await db.transaction(async (tx) => {
    const memberships = await tx
      .select({ companyId: companyMembers.companyId, role: companyMembers.role })
      .from(companyMembers)
      .where(eq(companyMembers.profileId, userId));

    await tx.delete(authUsers).where(eq(authUsers.id, userId));

    for (const { companyId, role } of memberships) {
      const others = tx.select().from(companyMembers).where(eq(companyMembers.companyId, companyId));
      await tx.delete(companies).where(and(eq(companies.id, companyId), notExists(others)));
      if (role !== "owner") continue;
      const [next] = await tx
        .select({ profileId: companyMembers.profileId })
        .from(companyMembers)
        .where(eq(companyMembers.companyId, companyId))
        .orderBy(asc(companyMembers.createdAt))
        .limit(1);
      if (next) {
        await tx
          .update(companyMembers)
          .set({ role: "owner" })
          .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.profileId, next.profileId)));
      }
    }
  });
}
