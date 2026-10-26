ALTER TABLE "job_matches" ADD COLUMN "first_scored_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Existing pairs were first scored no later than their last score.
UPDATE "job_matches" SET "first_scored_at" = "scored_at";
