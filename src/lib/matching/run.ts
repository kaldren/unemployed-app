import "server-only";
import { after } from "next/server";
import { getCandidateProfile, type CandidateProfileData } from "@/lib/candidate/queries";
import { isAiConfigured } from "@/lib/jobs/draft";
import { buildMatchPrompt, matchInputHash, type MatchCandidate } from "./prompt";
import {
  findPairsToScore,
  getJobsToScore,
  getScoredHashes,
  pairKey,
  saveMatchScore,
  stampMatchedAt,
} from "./queries";
import { matchModel, scoreMatch } from "./score";

// How many pairs the AI scores per run, after the SQL pre-filter. Each is one Claude call.
export const PAIRS_PER_RUN = 25;
const CONCURRENT_CALLS = 4;

type Target = { jobId: string } | { candidateId: string };

function toMatchCandidate({ profile, ...data }: CandidateProfileData): MatchCandidate | null {
  if (!profile) return null;
  return { ...profile, ...data };
}

// Runs `task` over `items`, `limit` at a time.
async function inPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]!);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// Scores the best pre-filtered pairs around a job or candidate, skipping pairs whose input hasn't changed.
async function matchAround(target: Target) {
  const pairs = await findPairsToScore(target, PAIRS_PER_RUN);
  const jobIds = [...new Set(pairs.map((p) => p.jobId))];
  const candidateIds = [...new Set(pairs.map((p) => p.candidateId))];
  const [jobsById, hashes, candidates] = await Promise.all([
    getJobsToScore(jobIds),
    getScoredHashes(jobIds, candidateIds),
    Promise.all(candidateIds.map(async (id) => [id, toMatchCandidate(await getCandidateProfile(id))] as const)),
  ]);
  const candidatesById = new Map(candidates);
  const model = matchModel();

  const toScore = pairs.flatMap(({ jobId, candidateId }) => {
    const job = jobsById.get(jobId);
    const candidate = candidatesById.get(candidateId);
    if (!job || !candidate) return [];
    const prompt = buildMatchPrompt(job, candidate);
    const inputHash = matchInputHash(model, prompt);
    if (hashes.get(pairKey(jobId, candidateId)) === inputHash) return [];
    return [{ jobId, candidateId, prompt, inputHash }];
  });

  await inPool(toScore, CONCURRENT_CALLS, async ({ prompt, ...pair }) => {
    try {
      const score = await scoreMatch(prompt);
      await saveMatchScore({ ...pair, ...score, model });
    } catch (error) {
      // The pair stays unscored (or keeps its old score) and is tried again on the next run.
      console.error("Match scoring failed", pair, error);
    }
  });
}

async function run(target: Target, onlyIfStale: boolean) {
  try {
    if (await stampMatchedAt(target, onlyIfStale)) await matchAround(target);
  } catch (error) {
    console.error("Matching run failed", target, error);
  }
}

// After a job or profile changes: rescore its pairs once the response is sent.
export function matchAfterChange(target: Target) {
  if (isAiConfigured()) after(() => run(target, false));
}

// On a deck view: look for new pairs when the last run is a day old, which also covers
// jobs and candidates that existed before matching did.
export function refreshMatches(target: Target) {
  if (isAiConfigured()) after(() => run(target, true));
}
