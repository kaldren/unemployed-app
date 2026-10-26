ALTER TABLE "candidate_profiles" ADD COLUMN "email_digest" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN "digest_sent_at" timestamp with time zone;