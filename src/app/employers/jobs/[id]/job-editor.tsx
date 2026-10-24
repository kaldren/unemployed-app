"use client";

import { useActionState, useState } from "react";
import { SectionForm, submitWithoutReset, TagInput, TextArea, TextInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionState } from "@/lib/candidate/schemas";
import {
  JOB_DESCRIPTION_MAX,
  JOB_INSTRUCTION_MAX,
  JOB_SKILLS_MAX,
  JOB_TITLE_MAX,
} from "@/lib/jobs/schemas";
import { refineJob } from "../actions";
import { RoleTypeFields, type RoleTypeState } from "../role-type-fields";

type JobState = RoleTypeState & { title: string; description: string; skills: string[] };

export function JobEditor({
  action,
  initial,
  aiEnabled,
  skillSuggestions,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial: JobState;
  aiEnabled: boolean;
  skillSuggestions: string[];
}) {
  const [job, setJob] = useState(initial);
  const update = (patch: Partial<JobState>) => setJob({ ...job, ...patch });

  return (
    <>
      <SectionForm id="job" title="Job post" description="Edit anything, then save." action={action} data={job}>
        <TextInput
          label="Job title"
          name="title"
          value={job.title}
          onChange={(title) => update({ title })}
          maxLength={JOB_TITLE_MAX}
          placeholder="Backend Engineer"
        />
        <RoleTypeFields value={job} onChange={update} />
        <TextArea
          label="Description"
          name="description"
          value={job.description}
          onChange={(description) => update({ description })}
          rows={16}
          maxLength={JOB_DESCRIPTION_MAX}
        />
        <TagInput
          label="Skills"
          name="skills"
          value={job.skills}
          onChange={(skills) => update({ skills })}
          suggestions={skillSuggestions}
          max={JOB_SKILLS_MAX}
          placeholder="Type a skill and press Enter"
        />
      </SectionForm>
      {aiEnabled && <RefineCard job={job} onRefined={(draft) => update(draft)} />}
    </>
  );
}

// Sends what's on screen plus an instruction; the rewrite replaces the fields, unsaved.
function RefineCard({
  job,
  onRefined,
}: {
  job: JobState;
  onRefined: (draft: Pick<JobState, "title" | "description" | "skills">) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: Awaited<ReturnType<typeof refineJob>>, formData: FormData) => {
      const next = await refineJob(prev, formData);
      if (next.status === "refined") {
        onRefined(next.draft);
        setInstruction("");
      }
      return next;
    },
    { status: "idle" },
  );

  return (
    <Card asChild>
      <section aria-labelledby="refine-title">
        <form onSubmit={submitWithoutReset(formAction)} className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle asChild>
              <h2 id="refine-title">Refine with AI</h2>
            </CardTitle>
            <CardDescription>Say what to change. You can review the result before saving.</CardDescription>
          </CardHeader>
          <input type="hidden" name="data" value={JSON.stringify({ instruction, job })} />
          <CardContent>
            <TextArea
              label="What should change?"
              name="instruction"
              value={instruction}
              onChange={setInstruction}
              rows={3}
              maxLength={JOB_INSTRUCTION_MAX}
              placeholder="Make it shorter, mention we're a 10-person team, add Kubernetes…"
            />
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-3 border-t-0 bg-transparent pt-2 pb-6">
            <p aria-live="polite" className="mr-auto text-sm">
              {state.status === "refined" && !pending && (
                <span className="text-muted-foreground">Draft updated. Review it, then save.</span>
              )}
              {state.status === "error" && !pending && (
                <span role="alert" className="text-destructive">
                  {state.message}
                </span>
              )}
            </p>
            <Button type="submit" variant="outline" disabled={pending || !instruction.trim()}>
              {pending ? "Refining…" : "Refine"}
            </Button>
          </CardFooter>
        </form>
      </section>
    </Card>
  );
}
