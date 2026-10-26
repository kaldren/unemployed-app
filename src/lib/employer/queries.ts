import "server-only";
import { count, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";

export type CompanyDecision = "approved" | "rejected";

// Companies an admin may need to decide on: everything not approved, the ones the AI flagged first.
export async function listCompaniesToReview() {
  return db
    .select({
      id: companies.id,
      domain: companies.domain,
      name: companies.name,
      status: companies.status,
      vettingReason: companies.vettingReason,
      createdAt: companies.createdAt,
      members: count(companyMembers.profileId),
    })
    .from(companies)
    .leftJoin(companyMembers, eq(companyMembers.companyId, companies.id))
    .where(ne(companies.status, "approved"))
    .groupBy(companies.id)
    .orderBy(
      sql`case ${companies.status} when 'needs_review' then 0 when 'pending' then 1 else 2 end`,
      desc(companies.createdAt),
    );
}

// An admin's decision is final until changed by an admin; vetting never overwrites it.
export async function decideCompany(companyId: string, status: CompanyDecision) {
  const [updated] = await db
    .update(companies)
    .set({ status, vettedAt: sql`coalesce(${companies.vettedAt}, now())` })
    .where(eq(companies.id, companyId))
    .returning({ id: companies.id });
  return Boolean(updated);
}
