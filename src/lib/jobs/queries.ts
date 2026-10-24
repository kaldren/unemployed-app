import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, jobSkills, skills } from "@/db/schema";

export async function listJobs(companyId: string) {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      seniority: jobs.seniority,
      employmentType: jobs.employmentType,
      workMode: jobs.workMode,
    })
    .from(jobs)
    .where(eq(jobs.companyId, companyId))
    .orderBy(desc(jobs.updatedAt));
}

// A company's job with its skills in display order, or null if it isn't theirs (or the id is malformed).
export async function getJob(companyId: string, jobId: string) {
  if (!z.uuid().safeParse(jobId).success) return null;
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.companyId, companyId)));
  if (!job) return null;

  const skillRows = await db
    .select({ name: skills.name })
    .from(jobSkills)
    .innerJoin(skills, eq(skills.id, jobSkills.skillId))
    .where(eq(jobSkills.jobId, jobId))
    .orderBy(asc(jobSkills.position));
  return { ...job, skills: skillRows.map((r) => r.name) };
}
