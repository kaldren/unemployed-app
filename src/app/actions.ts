"use server";

import { z } from "zod";
import { requireCandidate } from "@/lib/auth";
import { getMissingItems } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";
import { canCandidateSee, recordCandidateSwipe } from "@/lib/matching/queries";
import { SWIPE_ERROR, type SwipeResult } from "@/lib/matching/swipe";

const swipeSchema = z.object({ jobId: z.uuid(), liked: z.boolean() });

// A candidate likes or passes on a job from their deck.
export async function swipeJob(jobId: string, liked: boolean): Promise<SwipeResult> {
  const user = await requireCandidate();
  const parsed = swipeSchema.safeParse({ jobId, liked });
  if (!parsed.success) return { status: "error", message: SWIPE_ERROR };

  const [profile, visible] = await Promise.all([
    getCandidateProfile(user.id),
    canCandidateSee(user.id, parsed.data.jobId),
  ]);
  if (getMissingItems(profile).length > 0) return { status: "error", message: "Complete your profile first." };
  if (!visible) return { status: "error", message: "This job isn't available anymore." };

  try {
    return { status: "ok", matched: await recordCandidateSwipe(user.id, parsed.data.jobId, parsed.data.liked) };
  } catch (error) {
    console.error("Candidate swipe failed", error);
    return { status: "error", message: SWIPE_ERROR };
  }
}
