"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/candidate/schemas";
import { importResume } from "./actions";
import { secondaryButton } from "./ui";

export function ResumeImport({ hasProfileData, uploadedAt }: { hasProfileData: boolean; uploadedAt: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(importResume, { status: "idle" });

  return (
    <section aria-labelledby="resume-title" className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[.04] dark:bg-zinc-950 dark:ring-white/[.08]">
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
          <h2 id="resume-title" className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Fill in from your resume
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload a PDF (up to 5 MB) and we&apos;ll fill in your profile. You can edit everything afterwards.
            {uploadedAt && ` Last uploaded ${uploadedAt}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="resume">
            Resume PDF
          </label>
          <input
            id="resume"
            name="resume"
            type="file"
            accept="application/pdf"
            required
            disabled={pending}
            className="text-sm text-zinc-700 file:mr-3 file:h-9 file:rounded-full file:border file:border-black/[.12] file:bg-transparent file:px-4 file:text-sm file:font-medium file:text-zinc-900 dark:text-zinc-300 dark:file:border-white/[.18] dark:file:text-zinc-50"
          />
          <button type="submit" disabled={pending} className={secondaryButton}>
            {pending ? "Reading your resume…" : "Upload and fill in"}
          </button>
        </div>
        <p aria-live="polite" className="text-sm">
          {pending && <span className="text-zinc-600 dark:text-zinc-400">This usually takes 10–30 seconds.</span>}
          {!pending && state.status === "saved" && (
            <span className="text-green-700 dark:text-green-400">Done. Check each section and save any changes.</span>
          )}
          {!pending && state.status === "error" && (
            <span role="alert" className="text-red-700 dark:text-red-400">
              {state.message}
            </span>
          )}
        </p>
      </form>
    </section>
  );
}
