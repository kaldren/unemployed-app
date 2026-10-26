import "server-only";
import { aliasedTable, and, asc, desc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  candidateProfiles,
  candidateRoles,
  candidateSkills,
  candidateSwipes,
  companies,
  employerSwipes,
  experiences,
  jobMatches,
  jobs,
  jobSkills,
  profiles,
  roles,
  skills,
} from "@/db/schema";
import { MIN_SKILLS } from "@/lib/candidate/completeness";
import { SKILL_COVERAGE_THRESHOLD } from "./prompt";

// Cards loaded per page of the deck; the deck refreshes for more when it runs out.
export const DECK_SIZE = 10;

// Published, from a verified company.
const jobIsLive = and(eq(jobs.status, "open"), eq(companies.status, "approved"))!;

// Jobs candidates can see: live, from a company the candidate hasn't hidden from.
function jobIsVisibleTo(candidateId: string): SQL {
  return and(
    jobIsLive,
    sql`not exists (select 1 from candidate_profiles cp where cp.profile_id = ${candidateId} and ${companies.domain} = any(cp.hidden_company_domains))`,
  )!;
}

// SQL twin of getMissingItems() in lib/candidate/completeness.ts; keep the two in sync.
const candidateIsComplete = sql`(
  coalesce(${candidateProfiles.headline}, '') <> ''
  and coalesce(${candidateProfiles.about}, '') <> ''
  and ${candidateProfiles.locationCountry} is not null
  and cardinality(${candidateProfiles.workModes}) > 0
  and exists (select 1 from candidate_roles r where r.profile_id = ${candidateProfiles.profileId})
  and (${candidateProfiles.noExperience} or exists (select 1 from experiences e where e.profile_id = ${candidateProfiles.profileId}))
  and (select count(*) from candidate_skills s where s.profile_id = ${candidateProfiles.profileId}) >= ${MIN_SKILLS}
)`;

// Candidates a company can see: complete profiles that don't hide from the company's domain.
function candidateIsVisibleTo(companyDomain: string | AnyPgColumn): SQL {
  return and(
    eq(profiles.type, "candidate"),
    candidateIsComplete,
    sql`not (${companyDomain} = any(${candidateProfiles.hiddenCompanyDomains}))`,
  )!;
}

async function skillNamesByJob(jobIds: string[]) {
  const rows = jobIds.length
    ? await db
        .select({ jobId: jobSkills.jobId, name: skills.name })
        .from(jobSkills)
        .innerJoin(skills, eq(skills.id, jobSkills.skillId))
        .where(inArray(jobSkills.jobId, jobIds))
        .orderBy(asc(jobSkills.position))
    : [];
  return groupNames(rows, (r) => r.jobId);
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(key(row));
    if (list) list.push(row);
    else map.set(key(row), [row]);
  }
  return map;
}

function groupNames<T extends { name: string }>(rows: T[], key: (row: T) => string) {
  return new Map([...groupBy(rows, key)].map(([k, list]) => [k, list.map((r) => r.name)]));
}

// Hard filters on a job and candidate pair, before and after the AI scores it: the job's work mode is
// one the candidate wants, and so is its employment type (when the candidate picked any). The candidate
// lives in the job's country, or will relocate for an on-site or hybrid one (a remote job without a country
// is open to all). And the job's top salary reaches the candidate's minimum, when both are in one currency.
const pairFits = sql`(
  ${jobs.workMode} = any(${candidateProfiles.workModes})
  and (cardinality(${candidateProfiles.employmentTypes}) = 0 or ${jobs.employmentType} = any(${candidateProfiles.employmentTypes}))
  and (
    ${jobs.locationCountry} is null
    or ${jobs.locationCountry} = ${candidateProfiles.locationCountry}
    or (${jobs.workMode} <> 'remote' and ${candidateProfiles.openToRelocation})
  )
  and (
    ${candidateProfiles.salaryMin} is null
    or ${jobs.salaryMax} is null
    or ${jobs.salaryCurrency} is distinct from ${candidateProfiles.salaryCurrency}
    or ${jobs.salaryMax} >= ${candidateProfiles.salaryMin}
  )
)`;

// The AI found enough of the job's skills in the profile for both sides to see the pair.
const isAiMatch = and(
  eq(jobMatches.jobId, jobs.id),
  eq(jobMatches.candidateId, candidateProfiles.profileId),
  gt(jobMatches.skillCoverage, SKILL_COVERAGE_THRESHOLD),
)!;

// The employer who decided on a candidate.
const recruiters = aliasedTable(profiles, "recruiters");

// When both sides had liked: the later of the two swipes.
const matchedAt = sql`greatest(${candidateSwipes.createdAt}, ${employerSwipes.createdAt})`;

// ---------- Candidate side ----------

// The next jobs the AI matched to a candidate, to like or pass: best match first.
export async function getJobDeck(candidateId: string) {
  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
      seniority: jobs.seniority,
      employmentType: jobs.employmentType,
      workMode: jobs.workMode,
      locationCity: jobs.locationCity,
      locationCountry: jobs.locationCountry,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      companyName: companies.name,
      reason: jobMatches.candidateReason,
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(candidateProfiles, eq(candidateProfiles.profileId, candidateId))
    .innerJoin(jobMatches, isAiMatch)
    .where(
      and(
        jobIsVisibleTo(candidateId),
        pairFits,
        sql`not exists (select 1 from candidate_swipes s where s.job_id = ${jobs.id} and s.profile_id = ${candidateId})`,
      ),
    )
    .orderBy(desc(jobMatches.score), desc(jobs.createdAt), asc(jobs.id))
    .limit(DECK_SIZE);

  const skillsByJob = await skillNamesByJob(rows.map((r) => r.id));
  return rows.map((job) => ({ ...job, skills: skillsByJob.get(job.id) ?? [] }));
}

export type JobCard = Awaited<ReturnType<typeof getJobDeck>>[number];

// Candidates due a daily digest: they want it, it hasn't gone out in the last day, and they can be matched.
export async function listDigestCandidates(limit: number) {
  return db
    .select({ id: candidateProfiles.profileId, email: profiles.email, since: candidateProfiles.digestSentAt })
    .from(candidateProfiles)
    .innerJoin(profiles, eq(profiles.id, candidateProfiles.profileId))
    .where(
      and(
        eq(candidateProfiles.emailDigest, true),
        sql`(${candidateProfiles.digestSentAt} is null or ${candidateProfiles.digestSentAt} < now() - interval '20 hours')`,
        candidateIsComplete,
      ),
    )
    .orderBy(asc(candidateProfiles.digestSentAt))
    .limit(limit);
}

// Jobs in the candidate's deck that the AI matched since `since` (or ever, when null).
export async function countNewJobs(candidateId: string, since: Date | null) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(candidateProfiles, eq(candidateProfiles.profileId, candidateId))
    .innerJoin(jobMatches, isAiMatch)
    .where(
      and(
        jobIsVisibleTo(candidateId),
        pairFits,
        since ? gt(jobMatches.scoredAt, since) : undefined,
        sql`not exists (select 1 from candidate_swipes s where s.job_id = ${jobs.id} and s.profile_id = ${candidateId})`,
      ),
    );
  return row?.count ?? 0;
}

export async function stampDigestSent(candidateId: string) {
  await db.execute(sql`update candidate_profiles set digest_sent_at = now() where profile_id = ${candidateId}`);
}

// Who to tell about a new match, and what about.
export type MatchContacts = {
  jobTitle: string;
  companyName: string;
  candidateEmail: string;
  candidateName: string | null;
  employerEmail: string | null;
};

export async function getMatchContacts(jobId: string, candidateId: string): Promise<MatchContacts | null> {
  const [row] = await db
    .select({
      jobTitle: jobs.title,
      companyName: companies.name,
      candidateEmail: profiles.email,
      candidateName: profiles.fullName,
      employerEmail: recruiters.email,
    })
    .from(employerSwipes)
    .innerJoin(jobs, eq(jobs.id, employerSwipes.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(profiles, eq(profiles.id, employerSwipes.candidateId))
    .leftJoin(recruiters, eq(recruiters.id, employerSwipes.decidedBy))
    .where(and(eq(employerSwipes.jobId, jobId), eq(employerSwipes.candidateId, candidateId)));
  return row ?? null;
}

// One-query check for swipes; the full profile isn't needed for it.
export async function isCandidateComplete(candidateId: string) {
  const [row] = await db
    .select({ id: candidateProfiles.profileId })
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.profileId, candidateId), candidateIsComplete));
  return Boolean(row);
}

export async function canCandidateSee(candidateId: string, jobId: string) {
  const [row] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(candidateProfiles, eq(candidateProfiles.profileId, candidateId))
    .innerJoin(jobMatches, isAiMatch)
    .where(and(eq(jobs.id, jobId), jobIsVisibleTo(candidateId), pairFits));
  return Boolean(row);
}

// Saves the candidate's like or pass (a later swipe replaces it). True when it makes a match.
export async function recordCandidateSwipe(candidateId: string, jobId: string, liked: boolean) {
  await db
    .insert(candidateSwipes)
    .values({ profileId: candidateId, jobId, liked })
    .onConflictDoUpdate({ target: [candidateSwipes.profileId, candidateSwipes.jobId], set: { liked } });
  if (!liked) return false;
  const [match] = await db
    .select({ jobId: employerSwipes.jobId })
    .from(employerSwipes)
    .where(and(eq(employerSwipes.jobId, jobId), eq(employerSwipes.candidateId, candidateId), eq(employerSwipes.liked, true)));
  return Boolean(match);
}

// Jobs where the candidate and the employer liked each other, newest match first.
export async function listCandidateMatches(candidateId: string) {
  return db
    .select({
      jobId: jobs.id,
      title: jobs.title,
      companyName: companies.name,
      contactName: recruiters.fullName,
      contactEmail: recruiters.email,
    })
    .from(candidateSwipes)
    .innerJoin(
      employerSwipes,
      and(eq(employerSwipes.jobId, candidateSwipes.jobId), eq(employerSwipes.candidateId, candidateSwipes.profileId)),
    )
    .innerJoin(jobs, eq(jobs.id, candidateSwipes.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(recruiters, eq(recruiters.id, employerSwipes.decidedBy))
    .where(and(eq(candidateSwipes.profileId, candidateId), eq(candidateSwipes.liked, true), eq(employerSwipes.liked, true)))
    .orderBy(desc(matchedAt));
}

// ---------- Employer side ----------

// The next candidates the AI matched to a job, without names or contact details until they match.
// Candidates who already liked the job come first, so matches don't wait behind everyone else; then best match.
export async function getCandidateDeck(jobId: string, companyDomain: string) {
  const rows = await db
    .select({
      id: candidateProfiles.profileId,
      headline: candidateProfiles.headline,
      about: candidateProfiles.about,
      locationCity: candidateProfiles.locationCity,
      locationCountry: candidateProfiles.locationCountry,
      seniority: candidateProfiles.seniority,
      workModes: candidateProfiles.workModes,
      availableFrom: candidateProfiles.availableFrom,
      reason: jobMatches.employerReason,
    })
    .from(candidateProfiles)
    .innerJoin(profiles, eq(profiles.id, candidateProfiles.profileId))
    .innerJoin(jobs, eq(jobs.id, jobId))
    .innerJoin(jobMatches, isAiMatch)
    .where(
      and(
        candidateIsVisibleTo(companyDomain),
        pairFits,
        sql`not exists (select 1 from employer_swipes s where s.job_id = ${jobId} and s.candidate_id = ${candidateProfiles.profileId})`,
      ),
    )
    .orderBy(
      desc(
        sql`exists (select 1 from candidate_swipes s where s.job_id = ${jobId} and s.profile_id = ${candidateProfiles.profileId} and s.liked)`,
      ),
      desc(jobMatches.score),
      desc(candidateProfiles.updatedAt),
      asc(candidateProfiles.profileId),
    )
    .limit(DECK_SIZE);

  const ids = rows.map((r) => r.id);
  const [skillRows, roleRows, experienceRows] = ids.length
    ? await Promise.all([
        db
          .select({ profileId: candidateSkills.profileId, name: skills.name })
          .from(candidateSkills)
          .innerJoin(skills, eq(skills.id, candidateSkills.skillId))
          .where(inArray(candidateSkills.profileId, ids))
          .orderBy(asc(skills.name)),
        db
          .select({ profileId: candidateRoles.profileId, name: roles.name })
          .from(candidateRoles)
          .innerJoin(roles, eq(roles.id, candidateRoles.roleId))
          .where(inArray(candidateRoles.profileId, ids))
          .orderBy(asc(roles.name)),
        db
          .select({
            profileId: experiences.profileId,
            id: experiences.id,
            title: experiences.title,
            companyName: experiences.companyName,
            startDate: experiences.startDate,
            endDate: experiences.endDate,
          })
          .from(experiences)
          .where(inArray(experiences.profileId, ids))
          .orderBy(sql`${experiences.endDate} is not null`, desc(experiences.startDate)),
      ])
    : [[], [], []];

  const skillsBy = groupNames(skillRows, (r) => r.profileId);
  const rolesBy = groupNames(roleRows, (r) => r.profileId);
  const experiencesBy = groupBy(experienceRows, (r) => r.profileId);
  return rows.map((candidate) => ({
    ...candidate,
    skills: skillsBy.get(candidate.id) ?? [],
    roles: rolesBy.get(candidate.id) ?? [],
    experiences: (experiencesBy.get(candidate.id) ?? []).slice(0, 3),
  }));
}

export type CandidateCard = Awaited<ReturnType<typeof getCandidateDeck>>[number];

export async function canCompanySee(jobId: string, companyDomain: string, candidateId: string) {
  const [row] = await db
    .select({ id: candidateProfiles.profileId })
    .from(candidateProfiles)
    .innerJoin(profiles, eq(profiles.id, candidateProfiles.profileId))
    .innerJoin(jobs, eq(jobs.id, jobId))
    .innerJoin(jobMatches, isAiMatch)
    .where(and(eq(candidateProfiles.profileId, candidateId), candidateIsVisibleTo(companyDomain), pairFits));
  return Boolean(row);
}

// Saves the employer's like or pass for a job (a later swipe replaces it). True when it makes a match.
export async function recordEmployerSwipe(jobId: string, candidateId: string, employerId: string, liked: boolean) {
  await db
    .insert(employerSwipes)
    .values({ jobId, candidateId, decidedBy: employerId, liked })
    .onConflictDoUpdate({
      target: [employerSwipes.jobId, employerSwipes.candidateId],
      set: { liked, decidedBy: employerId },
    });
  if (!liked) return false;
  const [match] = await db
    .select({ jobId: candidateSwipes.jobId })
    .from(candidateSwipes)
    .where(and(eq(candidateSwipes.jobId, jobId), eq(candidateSwipes.profileId, candidateId), eq(candidateSwipes.liked, true)));
  return Boolean(match);
}

// Candidates who matched any of the company's jobs, newest match first.
// A candidate who has since hidden the company's domain drops out, like everywhere else.
export async function listCompanyMatches(companyId: string) {
  return db
    .select({
      jobId: jobs.id,
      candidateId: profiles.id,
      title: jobs.title,
      fullName: profiles.fullName,
      email: profiles.email,
      headline: candidateProfiles.headline,
      linkedinUrl: candidateProfiles.linkedinUrl,
    })
    .from(employerSwipes)
    .innerJoin(
      candidateSwipes,
      and(eq(candidateSwipes.jobId, employerSwipes.jobId), eq(candidateSwipes.profileId, employerSwipes.candidateId)),
    )
    .innerJoin(jobs, eq(jobs.id, employerSwipes.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(profiles, eq(profiles.id, employerSwipes.candidateId))
    .innerJoin(candidateProfiles, eq(candidateProfiles.profileId, profiles.id))
    .where(
      and(
        eq(jobs.companyId, companyId),
        eq(employerSwipes.liked, true),
        eq(candidateSwipes.liked, true),
        sql`not (${companies.domain} = any(${candidateProfiles.hiddenCompanyDomains}))`,
      ),
    )
    .orderBy(desc(matchedAt));
}

// ---------- AI matching ----------

// Pairs for the AI to score, around one job or one candidate: live jobs and visible, complete
// candidates that pass the hard filters and that neither side has swiped yet (a swiped pair keeps
// its score). Among those, most shared skills first, as a cheap pre-filter before the AI.
export async function findPairsToScore(target: { jobId: string } | { candidateId: string }, limit: number) {
  const sharedSkills = sql`(
    select count(*) from job_skills js join candidate_skills cs on cs.skill_id = js.skill_id
    where js.job_id = ${jobs.id} and cs.profile_id = ${candidateProfiles.profileId}
  )`;
  return db
    .select({ jobId: jobs.id, candidateId: candidateProfiles.profileId })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .innerJoin(candidateProfiles, pairFits)
    .innerJoin(profiles, eq(profiles.id, candidateProfiles.profileId))
    .where(
      and(
        "jobId" in target ? eq(jobs.id, target.jobId) : eq(candidateProfiles.profileId, target.candidateId),
        jobIsLive,
        candidateIsVisibleTo(companies.domain),
        sql`not exists (select 1 from candidate_swipes s where s.job_id = ${jobs.id} and s.profile_id = ${candidateProfiles.profileId})`,
        sql`not exists (select 1 from employer_swipes s where s.job_id = ${jobs.id} and s.candidate_id = ${candidateProfiles.profileId})`,
      ),
    )
    // Unscored pairs first, then the longest since scored: otherwise the same top pairs (skipped by their
    // unchanged hash) fill every run, and pairs past the limit are never scored or rescored.
    .orderBy(
      sql`(select m.scored_at from job_matches m where m.job_id = ${jobs.id} and m.candidate_id = ${candidateProfiles.profileId}) asc nulls first`,
      desc(sharedSkills),
      desc(jobs.createdAt),
      desc(candidateProfiles.updatedAt),
    )
    .limit(limit);
}

// What the AI reads about each job.
export async function getJobsToScore(jobIds: string[]) {
  const [rows, skillsByJob] = await Promise.all([
    db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        seniority: jobs.seniority,
        employmentType: jobs.employmentType,
        workMode: jobs.workMode,
        locationCity: jobs.locationCity,
        locationCountry: jobs.locationCountry,
        companyName: companies.name,
      })
      .from(jobs)
      .innerJoin(companies, eq(companies.id, jobs.companyId))
      .where(inArray(jobs.id, jobIds)),
    skillNamesByJob(jobIds),
  ]);
  return new Map(rows.map((job) => [job.id, { ...job, skills: skillsByJob.get(job.id) ?? [] }]));
}

// Hashes of the pairs already scored, to skip any whose input hasn't changed.
export async function getScoredHashes(jobIds: string[], candidateIds: string[]) {
  if (jobIds.length === 0 || candidateIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ jobId: jobMatches.jobId, candidateId: jobMatches.candidateId, inputHash: jobMatches.inputHash })
    .from(jobMatches)
    .where(and(inArray(jobMatches.jobId, jobIds), inArray(jobMatches.candidateId, candidateIds)));
  return new Map(rows.map((r) => [pairKey(r.jobId, r.candidateId), r.inputHash]));
}

export const pairKey = (jobId: string, candidateId: string) => `${jobId}:${candidateId}`;

export async function saveMatchScore(values: typeof jobMatches.$inferInsert) {
  const { score, matchedSkills, skillCoverage, candidateReason, employerReason, model, inputHash } = values;
  await db
    .insert(jobMatches)
    .values(values)
    .onConflictDoUpdate({
      target: [jobMatches.jobId, jobMatches.candidateId],
      set: { score, matchedSkills, skillCoverage, candidateReason, employerReason, model, inputHash, scoredAt: new Date() },
    });
}

const STALE_AFTER = sql`now() - interval '24 hours'`;
const RETRY_AFTER = sql`interval '1 hour'`;

// Stamps a job's or candidate's last matching run. With `onlyIfStale`, only when the last run is a day
// old or there's none, and returns whether it stamped: concurrent page views start one run, not many.
// Raw SQL, so the stamp doesn't count as a profile or job update.
export async function stampMatchedAt(target: { jobId: string } | { candidateId: string }, onlyIfStale: boolean) {
  const [table, idColumn, id] =
    "jobId" in target ? [jobs, jobs.id, target.jobId] : [candidateProfiles, candidateProfiles.profileId, target.candidateId];
  const stale = onlyIfStale ? sql`and (matched_at is null or matched_at < ${STALE_AFTER})` : sql``;
  const rows = await db.execute(
    sql`update ${table} set matched_at = now() where ${idColumn} = ${id} ${stale} returning 1`,
  );
  return rows.length > 0;
}

// Backdates the stamp so the next deck view an hour from now runs again, after a run that failed.
export async function retryMatchingSoon(target: { jobId: string } | { candidateId: string }) {
  const [table, idColumn, id] =
    "jobId" in target ? [jobs, jobs.id, target.jobId] : [candidateProfiles, candidateProfiles.profileId, target.candidateId];
  await db.execute(sql`update ${table} set matched_at = ${STALE_AFTER} + ${RETRY_AFTER} where ${idColumn} = ${id}`);
}
