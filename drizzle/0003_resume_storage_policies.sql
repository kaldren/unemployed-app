-- Candidates upload their own resume to resumes/{user id}/… through the server, using their session.
CREATE POLICY "Candidates can read their own resume" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "authenticated"
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "Candidates can upload their own resume" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO "authenticated"
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "Candidates can replace their own resume" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO "authenticated"
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (select auth.uid())::text)
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (select auth.uid())::text);
