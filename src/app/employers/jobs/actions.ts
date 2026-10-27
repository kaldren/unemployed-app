"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { jobs, jobSkills } from "@/db/schema";
import { requireEmployer } from "@/lib/auth";
import { ensureSkills, type Tx } from "@/lib/candidate/catalog";
import { toActionError, type ActionState } from "@/lib/candidate/schemas";
import { normalizeSlug } from "@/lib/candidate/slug";
import { isAiConfigured, writeJobDraft } from "@/lib/jobs/draft";
import { keepChosenRoleType, type DraftRequest } from "@/lib/jobs/prompt";
import { matchAfterChange } from "@/lib/matching/run";
import { jobSchema, newJobSchema, refineSchema, type JobDraft, type RoleType } from "@/lib/jobs/schemas";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const JOB_GONE = "This job no longer exists.";
const AI_UNAVAILABLE = "AI drafting isn't available right now. Write the post yourself for now.";
const AI_FAILED = "The AI couldn't write a draft this time. Try again, or write it yourself.";

// Forms post their state as JSON in a hidden "data" field.
function parseData<S extends z.ZodType>(schema: S, formData: FormData) {
  try {
    return schema.safeParse(JSON.parse(String(formData.get("data") ?? "")));
  } catch {
    return null;
  }
}

async function draftOrError(request: DraftRequest): Promise<JobDraft | ActionState> {
  if (!isAiConfigured()) return { status: "error", message: AI_UNAVAILABLE };
  try {
    return await writeJobDraft(request);
  } catch (error) {
    console.error("Job draft failed", error);
    return { status: "error", message: AI_FAILED };
  }
}

async function replaceSkills(tx: Tx, jobId: string, names: string[]) {
  await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));
  const ids = await ensureSkills(tx, names);
  const seen = new Set<string>();
  const rows = names.flatMap((name) => {
    const skillId = ids.get(normalizeSlug(name));
    if (!skillId || seen.has(skillId)) return [];
    seen.add(skillId);
    return [{ jobId, skillId, position: seen.size - 1 }];
  });
  if (rows.length > 0) await tx.insert(jobSkills).values(rows);
}

// "Write draft with AI" drafts from the brief; "Write it myself" starts an empty post.
export async function createJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireEmployer();
  const parsed = parseData(newJobSchema, formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error);
  const { brief, ...roleType } = parsed.data;

  let draft: Omit<JobDraft, keyof RoleType> & RoleType = { ...roleType, title: "", description: "", skills: [] };
  if (formData.get("mode") === "ai") {
    if (!brief) return { status: "error", message: "Tell us about the role first", fieldErrors: { brief: "Tell us about the role first" } };
    const result = await draftOrError({ companyName: user.company.name, roleType, brief });
    if ("status" in result) return result;
    draft = keepChosenRoleType(roleType, result);
  }

  const jobId = await db.transaction(async (tx) => {
    const [job] = await tx
      .insert(jobs)
      .values({
        companyId: user.company.id,
        createdBy: user.id,
        seniority: draft.seniority,
        employmentType: draft.employmentType,
        workMode: draft.workMode,
        title: draft.title,
        description: draft.description,
        brief: brief || null,
      })
      .returning({ id: jobs.id });
    await replaceSkills(tx, job!.id, draft.skills);
    return job!.id;
  });

  revalidatePath("/employers");
  redirect(`/employers/jobs/${jobId}`);
}

export async function saveJob(jobId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireEmployer();
  // Bound args come from the client; a malformed id would make Postgres throw.
  if (!z.uuid().safeParse(jobId).success) return { status: "error", message: JOB_GONE };
  const parsed = parseData(jobSchema, formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error);
  const { skills, ...values } = parsed.data;
  // The database enforces this too (jobs_require_verified_company trigger).
  if (values.status === "open" && !user.company.verifiedAt) {
    const message = "Verify your company's domain to publish. Go to Company to send the link.";
    return { status: "error", message, fieldErrors: { status: message } };
  }

  const saved = await db.transaction(async (tx) => {
    const [job] = await tx
      .update(jobs)
      .set(values)
      .where(and(eq(jobs.id, jobId), eq(jobs.companyId, user.company.id)))
      .returning({ id: jobs.id });
    if (!job) return false;
    await replaceSkills(tx, jobId, skills);
    return true;
  });
  if (!saved) return { status: "error", message: JOB_GONE };
  if (values.status === "open") matchAfterChange({ jobId });

  revalidatePath("/employers");
  revalidatePath(`/employers/jobs/${jobId}`);
  return { status: "saved", at: Date.now() };
}

export type RefineState =
  | { status: "idle" }
  | { status: "refined"; at: number; draft: JobDraft }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

// Rewrites the post on screen (saved or not) per the employer's instruction. Nothing is saved
// until they press Save, so they can review the change first.
export async function refineJob(_prev: RefineState, formData: FormData): Promise<RefineState> {
  const user = await requireEmployer();
  const parsed = parseData(refineSchema, formData);
  if (!parsed) return { status: "error", message: GENERIC_ERROR };
  if (!parsed.success) return toActionError(parsed.error) as RefineState;
  const { instruction, job } = parsed.data;

  const result = await draftOrError({ companyName: user.company.name, current: job, instruction });
  if ("status" in result) return result as RefineState;
  return { status: "refined", at: Date.now(), draft: result };
}
