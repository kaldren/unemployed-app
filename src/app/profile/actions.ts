"use server";

import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { db } from "@/db";
import {
  candidateLanguages,
  candidateProfiles,
  candidateRoles,
  candidateSkills,
  certifications,
  educations,
  experiences,
  profiles,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ensureRoles, ensureSkills, type Tx } from "@/lib/candidate/catalog";
import {
  aboutSchema,
  certificationsSchema,
  educationsSchema,
  experienceSchema,
  experiencesSchema,
  languagesSchema,
  MAX_RESUME_BYTES,
  MAX_ROLES,
  MAX_SKILLS,
  preferencesSchema,
  privacySchema,
  skillsSchema,
  toActionError,
  type ActionState,
} from "@/lib/candidate/schemas";
import { normalizeSlug } from "@/lib/candidate/slug";
import { extractResume, ResumeExtractionError } from "@/lib/resume/extract";
import { createClient } from "@/lib/supabase/server";

async function requireCandidate() {
  const user = await getCurrentUser();
  if (user.type !== "candidate") redirect("/");
  return user;
}

// Every section form posts its state as JSON in a hidden "data" field.
function sectionAction<S extends z.ZodType>(
  schema: S,
  save: (tx: Tx, profileId: string, data: z.output<S>) => Promise<void>,
) {
  return async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    const user = await requireCandidate();
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("data") ?? ""));
    } catch {
      return { status: "error", message: "Something went wrong. Please try again." };
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return toActionError(parsed.error);

    await db.transaction(async (tx) => {
      await ensureCandidateRow(tx, user.id);
      await save(tx, user.id, parsed.data);
    });
    revalidatePath("/profile");
    return { status: "saved", at: Date.now() };
  };
}

async function ensureCandidateRow(tx: Tx, profileId: string) {
  await tx.insert(candidateProfiles).values({ profileId }).onConflictDoNothing();
}

function updateProfile(tx: Tx, profileId: string, values: Partial<typeof candidateProfiles.$inferInsert>) {
  return tx.update(candidateProfiles).set(values).where(eq(candidateProfiles.profileId, profileId));
}

const monthToDate = (month: string) => `${month}-01`;

async function replaceExperiences(tx: Tx, profileId: string, list: z.output<typeof experienceSchema>[]) {
  await tx.delete(experiences).where(eq(experiences.profileId, profileId));
  if (list.length === 0) return;
  await tx.insert(experiences).values(
    list.map(({ startMonth, endMonth, ...e }) => ({
      ...e,
      profileId,
      startDate: monthToDate(startMonth),
      endDate: endMonth ? monthToDate(endMonth) : null,
    })),
  );
}

async function replaceSkills(tx: Tx, profileId: string, list: z.output<typeof skillsSchema>["skills"]) {
  await tx.delete(candidateSkills).where(eq(candidateSkills.profileId, profileId));
  const ids = await ensureSkills(tx, list.map((s) => s.name));
  // Two spellings of one skill collapse to a single row; the first one wins.
  const rows = new Map<string, typeof candidateSkills.$inferInsert>();
  for (const s of list) {
    const skillId = ids.get(normalizeSlug(s.name));
    if (skillId && !rows.has(skillId)) rows.set(skillId, { profileId, skillId, level: s.level, years: s.years });
  }
  if (rows.size) await tx.insert(candidateSkills).values([...rows.values()]);
}

async function replaceRoles(tx: Tx, profileId: string, names: string[]) {
  await tx.delete(candidateRoles).where(eq(candidateRoles.profileId, profileId));
  const ids = [...new Set((await ensureRoles(tx, names)).values())];
  if (ids.length) await tx.insert(candidateRoles).values(ids.map((roleId) => ({ profileId, roleId })));
}

async function replaceEducations(tx: Tx, profileId: string, list: z.output<typeof educationsSchema>["educations"]) {
  await tx.delete(educations).where(eq(educations.profileId, profileId));
  if (list.length) await tx.insert(educations).values(list.map((e) => ({ ...e, profileId })));
}

async function replaceCertifications(
  tx: Tx,
  profileId: string,
  list: z.output<typeof certificationsSchema>["certifications"],
) {
  await tx.delete(certifications).where(eq(certifications.profileId, profileId));
  if (list.length) await tx.insert(certifications).values(list.map((c) => ({ ...c, profileId })));
}

async function replaceLanguages(tx: Tx, profileId: string, list: z.output<typeof languagesSchema>["languages"]) {
  await tx.delete(candidateLanguages).where(eq(candidateLanguages.profileId, profileId));
  if (list.length) await tx.insert(candidateLanguages).values(list.map((l) => ({ ...l, profileId })));
}

export const saveAbout = sectionAction(aboutSchema, (tx, id, data) => updateProfile(tx, id, data).then(() => {}));

export const savePreferences = sectionAction(preferencesSchema, async (tx, id, { roles, ...prefs }) => {
  await updateProfile(tx, id, { ...prefs, salaryCurrency: prefs.salaryMin === null ? null : prefs.salaryCurrency });
  await replaceRoles(tx, id, roles);
});

export const saveExperiences = sectionAction(experiencesSchema, async (tx, id, data) => {
  await replaceExperiences(tx, id, data.experiences);
  await updateProfile(tx, id, { noExperience: data.experiences.length === 0 && data.noExperience });
});

export const saveSkills = sectionAction(skillsSchema, (tx, id, data) => replaceSkills(tx, id, data.skills));

export const saveEducations = sectionAction(educationsSchema, (tx, id, data) =>
  replaceEducations(tx, id, data.educations),
);

export const saveCertifications = sectionAction(certificationsSchema, (tx, id, data) =>
  replaceCertifications(tx, id, data.certifications),
);

export const saveLanguages = sectionAction(languagesSchema, (tx, id, data) =>
  replaceLanguages(tx, id, data.languages),
);

export const savePrivacy = sectionAction(privacySchema, (tx, id, data) =>
  updateProfile(tx, id, { hiddenCompanyDomains: [...new Set(data.hiddenCompanyDomains)] }).then(() => {}),
);

// Uploads the resume, has Claude extract a profile from it, and fills the profile.
// Lists (experience, skills, education, certifications, languages) are replaced;
// text fields the candidate already filled in are kept.
export async function importResume(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCandidate();
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a PDF file." };
  if (file.type !== "application/pdf") return { status: "error", message: "Your resume must be a PDF." };
  if (file.size > MAX_RESUME_BYTES) return { status: "error", message: "Your resume must be 5 MB or smaller." };

  const pdf = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/resume.pdf`;
  // The user's own session: Storage policies limit them to their own folder.
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) {
    console.error("Resume upload failed", uploadError);
    return { status: "error", message: "We couldn't upload your resume. Please try again." };
  }

  let extracted;
  try {
    extracted = await extractResume(pdf);
  } catch (err) {
    console.error("Resume extraction failed", err);
    const message =
      err instanceof ResumeExtractionError || err instanceof Anthropic.BadRequestError
        ? "We couldn't read this resume. Try another PDF, or fill in your profile by hand."
        : "Reading your resume failed. Please try again in a minute.";
    return { status: "error", message };
  }

  // Keep only entries that pass the same validation as the forms.
  const valid = <T>(items: unknown[], schema: z.ZodType<T>) =>
    items.flatMap((item) => {
      const r = schema.safeParse(item);
      return r.success ? [r.data] : [];
    });
  const field = <K extends keyof z.output<typeof aboutSchema>>(key: K, value: unknown) => {
    const r = aboutSchema.shape[key].safeParse(value ?? "");
    return r.success ? r.data : null;
  };

  await db.transaction(async (tx) => {
    await ensureCandidateRow(tx, user.id);
    const [current] = await tx.select().from(candidateProfiles).where(eq(candidateProfiles.profileId, user.id));

    await updateProfile(tx, user.id, {
      headline: current.headline ?? field("headline", extracted.headline?.slice(0, 120)),
      about: current.about ?? field("about", extracted.about?.slice(0, 2000)),
      locationCity: current.locationCity ?? field("locationCity", extracted.locationCity),
      locationCountry: current.locationCountry ?? field("locationCountry", extracted.locationCountry),
      linkedinUrl: current.linkedinUrl ?? field("linkedinUrl", extracted.linkedinUrl),
      githubUrl: current.githubUrl ?? field("githubUrl", extracted.githubUrl),
      portfolioUrl: current.portfolioUrl ?? field("portfolioUrl", extracted.portfolioUrl),
      seniority: current.seniority ?? extracted.seniority,
      resumePath: path,
      resumeUploadedAt: new Date(),
    });
    await replaceExperiences(tx, user.id, valid(extracted.experiences, experienceSchema));
    await replaceSkills(tx, user.id, valid(
        extracted.skills.map((s) => ({ ...s, years: null })),
        skillsSchema.shape.skills.element,
      ).slice(0, MAX_SKILLS));
    await replaceEducations(tx, user.id, valid(extracted.educations, educationsSchema.shape.educations.element));
    await replaceCertifications(
      tx,
      user.id,
      valid(extracted.certifications, certificationsSchema.shape.certifications.element),
    );
    const languages = valid(extracted.languages, languagesSchema.shape.languages.element);
    await replaceLanguages(
      tx,
      user.id,
      languages.filter((l, i) => languages.findIndex((o) => o.languageCode === l.languageCode) === i),
    );

    const [hasRole] = await tx.select().from(candidateRoles).where(eq(candidateRoles.profileId, user.id)).limit(1);
    if (!hasRole && extracted.suggestedRoles.length) {
      await replaceRoles(tx, user.id, extracted.suggestedRoles.slice(0, MAX_ROLES));
    }
    if (!user.fullName && extracted.fullName) {
      await tx.update(profiles).set({ fullName: extracted.fullName }).where(eq(profiles.id, user.id));
    }
  });

  revalidatePath("/profile");
  return { status: "saved", at: Date.now() };
}
