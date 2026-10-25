import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildDraftPrompt, clampDraft, type DraftRequest } from "./prompt";
import { jobDraftSchema, type JobDraft } from "./schemas";

// Server-only setting: set JOB_DRAFT_MODEL to switch models without a code change.
export const DEFAULT_JOB_DRAFT_MODEL = "claude-haiku-5-5";

export function jobDraftModel() {
  return process.env.JOB_DRAFT_MODEL?.trim() || DEFAULT_JOB_DRAFT_MODEL;
}

const SYSTEM = `You write job posts for a hiring platform, for the employer to review and edit.
Write in plain, warm, specific language. No buzzwords, no emoji, no markdown headings or bold.
"title": a short, standard job title without seniority or company name ("Backend Engineer").
"description": plain text, 150-400 words for a new post. Start with two or three sentences about the role,
then short sections "What you'll do" and "What you'll bring", each a few lines starting with "- ".
Separate paragraphs and sections with blank lines.
"seniority", "employmentType", "workMode": always pick one. Keep any the employer chose; otherwise
infer the best fit from the brief, and when it gives no hint pick the most common choice for such a role.
"skills": 5-12 short canonical skill names ("React", "PostgreSQL", "Stakeholder management"),
most important first.
Only state facts the employer gave you about the company, pay or benefits; don't invent them.
When asked to change an existing post, apply the change fully, even if it changes the length or
structure ("shorter" means clearly shorter), and leave everything the change doesn't touch alone.`;

export class JobDraftError extends Error {}

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Writes a new draft from the employer's brief, or rewrites the current one per their instruction.
export async function writeJobDraft(request: DraftRequest): Promise<JobDraft> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: jobDraftModel(),
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(jobDraftSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: buildDraftPrompt(request) }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new JobDraftError(`Job draft returned nothing (stop_reason: ${response.stop_reason})`);
  }
  return clampDraft(response.parsed_output);
}
