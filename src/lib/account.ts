import "server-only";
import { and, asc, eq, notExists } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";

// Deletes the user and, through cascades, everything that's theirs: profile, swipes, matches, scores.
// An employer's company goes too when they were its last member; otherwise the oldest teammate becomes owner.
export async function deleteUser(userId: string) {
  await db.transaction(async (tx) => {
    const [membership] = await tx
      .select({ companyId: companyMembers.companyId, role: companyMembers.role })
      .from(companyMembers)
      .where(eq(companyMembers.profileId, userId));

    await tx.delete(authUsers).where(eq(authUsers.id, userId));
    if (!membership) return;

    const others = tx.select().from(companyMembers).where(eq(companyMembers.companyId, membership.companyId));
    await tx.delete(companies).where(and(eq(companies.id, membership.companyId), notExists(others)));
    if (membership.role !== "owner") return;
    const [next] = await tx
      .select({ profileId: companyMembers.profileId })
      .from(companyMembers)
      .where(eq(companyMembers.companyId, membership.companyId))
      .orderBy(asc(companyMembers.createdAt))
      .limit(1);
    if (next) await tx.update(companyMembers).set({ role: "owner" }).where(eq(companyMembers.profileId, next.profileId));
  });
}
