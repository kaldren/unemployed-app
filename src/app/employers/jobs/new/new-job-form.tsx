"use client";

import { useActionState, useState } from "react";
import { FieldErrors, submitWithoutReset, TextArea } from "@/components/form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { JOB_BRIEF_MAX } from "@/lib/jobs/schemas";
import { createJob } from "../actions";
import { RoleTypeFields, type RoleTypeState } from "../role-type-fields";

export function NewJobForm({ aiEnabled }: { aiEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(createJob, { status: "idle" });
  const [roleType, setRoleType] = useState<RoleTypeState>({ seniority: "", employmentType: "", workMode: "" });
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const error = state.status === "error" && !pending ? state : null;

  return (
    <Card asChild>
      <form onSubmit={submitWithoutReset(formAction)} className="flex flex-col gap-6">
        <input type="hidden" name="data" value={JSON.stringify({ ...roleType, brief })} />
        <CardContent className="flex flex-col gap-5">
          <FieldErrors.Provider value={error?.fieldErrors ?? {}}>
            <RoleTypeFields value={roleType} onChange={(patch) => setRoleType({ ...roleType, ...patch })} />
            <TextArea
              label="What's the role about?"
              name="brief"
              value={brief}
              onChange={setBrief}
              rows={7}
              maxLength={JOB_BRIEF_MAX}
              placeholder="What the person will work on, the team, must-have skills, anything that makes the role special."
              hint={aiEnabled ? "A few sentences is enough. Plain notes are fine." : "AI drafting isn't available right now."}
            />
          </FieldErrors.Provider>
          {error && !error.fieldErrors && <Alert variant="destructive">{error.message}</Alert>}
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-3 border-t-0 bg-transparent pt-2 pb-6">
          <Button
            type="submit"
            name="mode"
            value="manual"
            variant="ghost"
            disabled={pending}
            onClick={() => setMode("manual")}
          >
            {pending && mode === "manual" ? "Creating…" : "Write it myself"}
          </Button>
          <Button
            type="submit"
            name="mode"
            value="ai"
            disabled={pending || !aiEnabled || !brief.trim()}
            onClick={() => setMode("ai")}
          >
            {pending && mode === "ai" ? "Writing your draft…" : "Write draft with AI"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
