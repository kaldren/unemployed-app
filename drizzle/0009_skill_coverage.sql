ALTER TABLE "job_matches" ADD COLUMN "matched_skills" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "skill_coverage" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_match_skill_coverage_range" CHECK ("job_matches"."skill_coverage" between 0 and 100);