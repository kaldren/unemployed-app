"use server";

import { z } from "zod";
import { requireEmployer } from "@/lib/auth";
import { getJob } from "@/lib/jobs/queries";
import { canCompanySee, recordEmployerSwipe } from "@/lib/matching/queries";
import { SWIPE_ERROR, type SwipeResult } from "@/lib/matching/swipe";

const swipeSchema = z.object({ jobId: z.uuid(), candidateId: z.uuid(), liked: z.boolean() });

// An employer likes or passes on a candidate for one of their company's published jobs.
export async function swipeCandidate(jobId: string, candidateId: string, liked: boolean): Promise<SwipeResult> {
  const user = await requireEmployer();
  const parsed = swipeSchema.safeParse({ jobId, candidateId, liked });
  if (!parsed.success) return { status: "error", message: SWIPE_ERROR };
  if (user.company.status !== "approved") {
    return { status: "error", message: "You can review candidates once your company is verified." };
  }

  const [job, visible] = await Promise.all([
    getJob(user.company.id, parsed.data.jobId),
    canCompanySee(user.company.domain, parsed.data.candidateId),
  ]);
  if (job?.status !== "open") return { status: "error", message: "Publish this job to review candidates." };
  if (!visible) return { status: "error", message: "This candidate isn't available anymore." };

  try {
    const matched = await recordEmployerSwipe(job.id, parsed.data.candidateId, user.id, parsed.data.liked);
    return { status: "ok", matched };
  } catch (error) {
    console.error("Employer swipe failed", error);
    return { status: "error", message: SWIPE_ERROR };
  }
}
