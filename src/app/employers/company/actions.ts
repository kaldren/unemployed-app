"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembership, requireEmployer, requireEmployerAccount, type CurrentEmployer } from "@/lib/auth";
import { toActionError, type ActionState } from "@/lib/candidate/schemas";
import { canManageCompany, companyProfileSchema, emailSchema, inviteSchema, isEmailOnDomain, newCompanySchema } from "@/lib/employer/company";
import {
  acceptInvite,
  changeMemberRole,
  createCompany,
  createInvite,
  createVerificationToken,
  deleteCompany,
  removeMember,
  revokeInvite,
  updateCompanyProfile,
} from "@/lib/employer/companies";
import { vetCompanySoon } from "@/lib/employer/vetting";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { companyInviteEmail, domainVerificationEmail } from "@/lib/email/templates";
import { COMPANY_PATH, HOME_PATH, NEW_COMPANY_PATH } from "@/lib/portal";
import { SITE_URL } from "@/lib/site";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NOT_ALLOWED = "Only owners and admins can do that.";
const ONE_COMPANY = "You're already in a company. For now, each account hires for one company.";

// Forms post their state as JSON in a hidden "data" field, like the job and profile forms.
function parseData<S extends z.ZodType>(schema: S, formData: FormData) {
  try {
    return schema.safeParse(JSON.parse(String(formData.get("data") ?? "")));
  } catch {
    return null;
  }
}

// For actions only owners and admins may take. Recruiters get an error (or nothing, for plain forms).
async function requireManager(): Promise<CurrentEmployer | null> {
  const user = await requireEmployer();
  return canManageCompany(user.role) ? user : null;
}

function revalidateCompany() {
  revalidatePath(COMPANY_PATH);
  revalidatePath(HOME_PATH.employer);
}

export async function createCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireEmployerAccount();
  if (await getMembership(user.id)) return { status: "error", message: ONE_COMPANY };
  const parsed = parseData(newCompanySchema, formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error);

  const companyId = await createCompany(user.id, parsed.data);
  vetCompanySoon(companyId, parsed.data.domain);
  revalidateCompany();
  redirect(COMPANY_PATH);
}

export async function acceptInviteAction(formData: FormData) {
  const user = await requireEmployerAccount();
  const inviteId = z.uuid().safeParse(formData.get("inviteId"));
  if (!inviteId.success || (await getMembership(user.id))) redirect(NEW_COMPANY_PATH);
  // The profile email is the confirmed sign-in email, so only its owner can accept.
  await acceptInvite(inviteId.data, user.id, user.email);
  revalidateCompany();
  redirect(HOME_PATH.employer);
}

// Profile fields come as JSON from SectionForm.
export async function updateCompanyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return { status: "error", message: NOT_ALLOWED };
  const parsed = parseData(companyProfileSchema, formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error);
  await updateCompanyProfile(user.company.id, parsed.data);
  revalidateCompany();
  return { status: "saved", at: Date.now() };
}

export async function sendVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Any member may verify: what counts is access to an address on the domain.
  const user = await requireEmployer();
  if (user.company.verifiedAt) return { status: "saved", at: Date.now() };
  const parsed = parseData(z.object({ email: emailSchema }), formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error);
  const { email } = parsed.data;
  if (!isEmailOnDomain(email, user.company.domain)) {
    const message = `Use an address ending in @${user.company.domain}`;
    return { status: "error", message, fieldErrors: { email: message } };
  }

  const token = await createVerificationToken(user.company.id, user.id, email);
  if (!token) return { status: "error", message: "We just sent a link. Wait a minute before sending another." };
  if (!isEmailConfigured() && process.env.NODE_ENV !== "production") {
    // No email locally: print the link so it can still be opened.
    console.info(`Domain verification link for ${email}: ${SITE_URL}/auth/verify-domain?token=${token}`);
  }
  const message = domainVerificationEmail({ companyName: user.company.name, domain: user.company.domain, token });
  after(() => sendEmail(email, message).catch((error) => console.error("Verification email failed", error)));
  return { status: "saved", at: Date.now() };
}

export async function inviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireManager();
  if (!user) return { status: "error", message: NOT_ALLOWED };
  const parsed = parseData(inviteSchema, formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error);

  const result = await createInvite(user.company.id, user.id, parsed.data.email, parsed.data.role);
  if (result === "member") return { status: "error", message: "They're already on your team.", fieldErrors: { email: "Already on your team" } };
  if (result === "exists") return { status: "error", message: "They're already invited.", fieldErrors: { email: "Already invited" } };
  const message = companyInviteEmail({ companyName: user.company.name, inviterName: user.fullName });
  after(() => sendEmail(parsed.data.email, message).catch((error) => console.error("Invite email failed", error)));
  revalidateCompany();
  return { status: "saved", at: Date.now() };
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireManager();
  const inviteId = z.uuid().safeParse(formData.get("inviteId"));
  if (!user || !inviteId.success) return;
  await revokeInvite(user.company.id, inviteId.data);
  revalidateCompany();
}

const memberSchema = z.object({ profileId: z.uuid(), role: z.enum(["admin", "recruiter"]) });

export async function changeRoleAction(formData: FormData) {
  const user = await requireManager();
  const parsed = memberSchema.safeParse({ profileId: formData.get("profileId"), role: formData.get("role") });
  if (!user || !parsed.success) return;
  await changeMemberRole(user.company.id, parsed.data.profileId, parsed.data.role);
  revalidateCompany();
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireManager();
  const profileId = z.uuid().safeParse(formData.get("profileId"));
  if (!user || !profileId.success) return;
  await removeMember(user.company.id, profileId.data);
  revalidateCompany();
}

export async function deleteCompanyAction() {
  const user = await requireEmployer();
  if (user.role !== "owner") return;
  await deleteCompany(user.company.id);
  revalidateCompany();
  redirect(NEW_COMPANY_PATH);
}
