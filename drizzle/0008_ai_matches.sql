CREATE TABLE "job_matches" (
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"candidate_reason" text NOT NULL,
	"employer_reason" text NOT NULL,
	"model" text NOT NULL,
	"input_hash" text NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_matches_job_id_candidate_id_pk" PRIMARY KEY("job_id","candidate_id"),
	CONSTRAINT "job_match_score_range" CHECK ("job_matches"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "job_matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "matched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_candidate_id_profiles_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_matches_candidate_id_idx" ON "job_matches" USING btree ("candidate_id");