import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  companyDomainVerifications,
  companyInvites,
  companyMembers,
  profiles,
  type Company,
} from "@/db/schema";
import type { AssignableRole } from "./company";

// Postgres unique_violation, e.g. a second company verifying the same domain. Drizzle wraps the
// driver's error (DrizzleQueryError), so the code is on `cause`.
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  ((error as { code?: unknown }).code === "23505" || isUniqueViolation((error as { cause?: unknown }).cause));

export type CompanyProfileValues = Pick<Company, "name" | "website" | "logoUrl" | "description">;

export async function getCompany(companyId: string) {
  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      website: companies.website,
      logoUrl: companies.logoUrl,
      description: companies.description,
      verifiedAt: companies.verifiedAt,
      status: companies.status,
    })
    .from(companies)
    .where(eq(companies.id, companyId));
  return company ?? null;
}

// Whether some company already proved `domain`; then no other company can verify it.
export async function isDomainVerified(domain: string) {
  const [row] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.domain, domain), isNotNull(companies.verifiedAt)))
    .limit(1);
  return Boolean(row);
}

// Creates the company with `userId` as its owner. Returns its id.
export async function createCompany(userId: string, values: CompanyProfileValues & { domain: string }) {
  return db.transaction(async (tx) => {
    const [company] = await tx.insert(companies).values(values).returning({ id: companies.id });
    await tx.insert(companyMembers).values({ companyId: company!.id, profileId: userId, role: "owner" });
    return company!.id;
  });
}

export async function updateCompanyProfile(companyId: string, values: CompanyProfileValues) {
  await db.update(companies).set(values).where(eq(companies.id, companyId));
}

// Jobs, members, invites and swipes go with it (cascades).
export async function deleteCompany(companyId: string) {
  await db.delete(companies).where(eq(companies.id, companyId));
}

// ---------- Members ----------

export async function listMembers(companyId: string) {
  return db
    .select({
      profileId: companyMembers.profileId,
      role: companyMembers.role,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(companyMembers)
    .innerJoin(profiles, eq(profiles.id, companyMembers.profileId))
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(sql`case ${companyMembers.role} when 'owner' then 0 when 'admin' then 1 else 2 end`, asc(companyMembers.createdAt));
}

// The owner's role never changes here. Returns false when there's no such (non-owner) member.
export async function changeMemberRole(companyId: string, profileId: string, role: AssignableRole) {
  const updated = await db
    .update(companyMembers)
    .set({ role })
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.profileId, profileId), ne(companyMembers.role, "owner")))
    .returning({ profileId: companyMembers.profileId });
  return updated.length > 0;
}

export async function removeMember(companyId: string, profileId: string) {
  const removed = await db
    .delete(companyMembers)
    .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.profileId, profileId), ne(companyMembers.role, "owner")))
    .returning({ profileId: companyMembers.profileId });
  return removed.length > 0;
}

// ---------- Invites ----------

export async function listInvites(companyId: string) {
  return db
    .select({ id: companyInvites.id, email: companyInvites.email, role: companyInvites.role })
    .from(companyInvites)
    .where(eq(companyInvites.companyId, companyId))
    .orderBy(desc(companyInvites.createdAt));
}

export type InviteResult = "invited" | "member" | "exists";

// Invites `email` (lowercase) unless they're already in the company or invited.
export async function createInvite(companyId: string, invitedBy: string, email: string, role: AssignableRole): Promise<InviteResult> {
  const [member] = await db
    .select({ id: profiles.id })
    .from(companyMembers)
    .innerJoin(profiles, eq(profiles.id, companyMembers.profileId))
    .where(and(eq(companyMembers.companyId, companyId), sql`lower(${profiles.email}) = ${email}`));
  if (member) return "member";
  const [invite] = await db
    .insert(companyInvites)
    .values({ companyId, email, role, invitedBy })
    .onConflictDoNothing()
    .returning({ id: companyInvites.id });
  return invite ? "invited" : "exists";
}

export async function revokeInvite(companyId: string, inviteId: string) {
  await db.delete(companyInvites).where(and(eq(companyInvites.id, inviteId), eq(companyInvites.companyId, companyId)));
}

// Invites waiting for this (confirmed) email, with the company's name.
export async function invitesForEmail(email: string) {
  return db
    .select({ id: companyInvites.id, role: companyInvites.role, companyName: companies.name, companyDomain: companies.domain })
    .from(companyInvites)
    .innerJoin(companies, eq(companies.id, companyInvites.companyId))
    .where(eq(companyInvites.email, email.toLowerCase()))
    .orderBy(desc(companyInvites.createdAt));
}

// Joins the invite's company with its role, if the invite is addressed to `email`. Returns the company id.
export async function acceptInvite(inviteId: string, userId: string, email: string) {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .delete(companyInvites)
      .where(and(eq(companyInvites.id, inviteId), eq(companyInvites.email, email.toLowerCase())))
      .returning({ companyId: companyInvites.companyId, role: companyInvites.role });
    if (!invite) return null;
    await tx
      .insert(companyMembers)
      .values({ companyId: invite.companyId, profileId: userId, role: invite.role })
      .onConflictDoNothing();
    return invite.companyId;
  });
}

// ---------- Domain verification ----------

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// A fresh one-time token for a link to `email`, or null when one was sent less than a minute ago.
export async function createVerificationToken(companyId: string, requestedBy: string, email: string) {
  const [recent] = await db
    .select({ id: companyDomainVerifications.id })
    .from(companyDomainVerifications)
    .where(
      and(
        eq(companyDomainVerifications.companyId, companyId),
        gt(companyDomainVerifications.createdAt, new Date(Date.now() - RESEND_AFTER_MS)),
      ),
    )
    .limit(1);
  if (recent) return null;

  const token = randomBytes(32).toString("base64url");
  await db.insert(companyDomainVerifications).values({
    companyId,
    requestedBy,
    email,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });
  return token;
}

export type VerifyResult = "verified" | "invalid" | "taken";

// Spends the token: an unexpired one marks its company verified (and returns it). Every link for that
// company is then void.
export async function verifyDomainToken(
  token: string,
): Promise<{ result: VerifyResult; company?: { id: string; domain: string } }> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(companyDomainVerifications)
        .where(eq(companyDomainVerifications.tokenHash, hashToken(token)))
        .returning({ companyId: companyDomainVerifications.companyId, expiresAt: companyDomainVerifications.expiresAt });
      if (!row || row.expiresAt.getTime() < Date.now()) return { result: "invalid" as const };
      const [company] = await tx
        .update(companies)
        .set({ verifiedAt: sql`coalesce(${companies.verifiedAt}, now())` })
        .where(eq(companies.id, row.companyId))
        .returning({ id: companies.id, domain: companies.domain });
      await tx.delete(companyDomainVerifications).where(eq(companyDomainVerifications.companyId, row.companyId));
      return { result: "verified" as const, company };
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { result: "taken" };
    throw error;
  }
}
