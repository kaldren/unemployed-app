"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/candidate/schemas";
import { importResume } from "./actions";

export function ResumeImport({ hasProfileData, uploadedAt }: { hasProfileData: boolean; uploadedAt: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(importResume, { status: "idle" });

  return (
    <Card asChild className="px-6">
      <section aria-labelledby="resume-title">
        <form
          action={formAction}
          onSubmit={(e) => {
            if (
              hasProfileData &&
              !confirm("This replaces your experience, skills, education, certifications and languages. Continue?")
            ) {
              e.preventDefault();
            }
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="resume-title" className="text-lg font-semibold">
              Fill in from your resume
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload a PDF (up to 5 MB) and we&apos;ll fill in your profile. You can edit everything afterwards.
              {uploadedAt && ` Last uploaded ${uploadedAt}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="resume">
              Resume PDF
            </label>
            <Input
              id="resume"
              name="resume"
              type="file"
              accept="application/pdf"
              required
              disabled={pending}
              className="w-auto max-w-full flex-1 pt-1.5 file:mr-3"
            />
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Reading your resume…" : "Upload and fill in"}
            </Button>
          </div>
          <p aria-live="polite" className="text-sm">
            {pending && <span className="text-muted-foreground">This usually takes 10–30 seconds.</span>}
            {!pending && state.status === "saved" && (
              <span className="text-success">Done. Check each section and save any changes.</span>
            )}
            {!pending && state.status === "error" && (
              <span role="alert" className="text-destructive">
                {state.message}
              </span>
            )}
          </p>
        </form>
      </section>
    </Card>
  );
}
