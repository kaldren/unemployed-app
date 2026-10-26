ALTER TABLE "job_matches" ADD COLUMN "matched_skills" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "skill_coverage" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_match_skill_coverage_range" CHECK ("job_matches"."skill_coverage" between 0 and 100);--> statement-breakpoint
-- A pair one side already swiped is never rescored, so keep the old gate's verdict for it: otherwise a
-- candidate who liked a job (or a job an employer liked) drops out of the other side's deck for good.
UPDATE "job_matches" m SET "skill_coverage" = 100
WHERE m."score" >= 70
  AND (exists (select 1 from "candidate_swipes" s where s."job_id" = m."job_id" and s."profile_id" = m."candidate_id")
    or exists (select 1 from "employer_swipes" s where s."job_id" = m."job_id" and s."candidate_id" = m."candidate_id"));
