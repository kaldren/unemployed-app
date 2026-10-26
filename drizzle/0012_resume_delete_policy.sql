-- Deleting an account removes the candidate's resume, through the server, using their session.
CREATE POLICY "Candidates can delete their own resume" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO "authenticated"
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (select auth.uid())::text);
