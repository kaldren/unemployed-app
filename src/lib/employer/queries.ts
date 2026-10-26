import "server-only";
import { and, count, desc, eq, ne, notLike, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyMembers } from "@/db/schema";
import { SEED_DOMAIN } from "@/lib/seed/domain";

export type CompanyDecision = "approved" | "rejected";

// Companies an admin may need to decide on: everything not approved, the ones the AI flagged first.
// Dev seed companies (lib/seed) show only in development, since dev shares the production database.
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
    .where(
      and(
        ne(companies.status, "approved"),
        process.env.NODE_ENV === "development"
          ? undefined
          : and(ne(companies.domain, SEED_DOMAIN), notLike(companies.domain, `%.${SEED_DOMAIN}`)),
      ),
    )
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
