CREATE TABLE "candidate_swipes" (
	"profile_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"liked" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_swipes_profile_id_job_id_pk" PRIMARY KEY("profile_id","job_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_swipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employer_swipes" (
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"decided_by" uuid,
	"liked" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_swipes_job_id_candidate_id_pk" PRIMARY KEY("job_id","candidate_id")
);
--> statement-breakpoint
ALTER TABLE "employer_swipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "candidate_swipes" ADD CONSTRAINT "candidate_swipes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_swipes" ADD CONSTRAINT "candidate_swipes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_swipes" ADD CONSTRAINT "employer_swipes_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_swipes" ADD CONSTRAINT "employer_swipes_candidate_id_profiles_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_swipes" ADD CONSTRAINT "employer_swipes_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_swipes_job_id_idx" ON "candidate_swipes" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "employer_swipes_candidate_id_idx" ON "employer_swipes" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "employer_swipes_decided_by_idx" ON "employer_swipes" USING btree ("decided_by");--> statement-breakpoint
CREATE POLICY "Candidates can read their own swipes" ON "candidate_swipes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = profile_id);--> statement-breakpoint
CREATE POLICY "Members can read their company's swipes" ON "employer_swipes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from jobs j where j.id = "employer_swipes"."job_id" and exists (select 1 from company_members m where m.company_id = j.company_id and m.profile_id = (select auth.uid()))));