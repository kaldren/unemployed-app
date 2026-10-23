import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { resumeExtractionSchema, type ResumeExtraction } from "@/lib/candidate/schemas";

const MODEL = "claude-haiku-5-5";

const SYSTEM = `You extract a candidate's profile from their resume for a hiring platform.
Only use facts stated in the resume; use null or an empty list when something isn't there.
Write "headline" and "about" in the candidate's own voice (first person for "about").
List skills as short canonical names ("React", "PostgreSQL", "Project Management"), at most 30.
Order experiences from most recent to oldest.`;

export class ResumeExtractionError extends Error {}

export async function extractResume(pdf: Buffer): Promise<ResumeExtraction> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(resumeExtractionSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") },
          },
          { type: "text", text: "Extract the profile from this resume." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new ResumeExtractionError(`Resume extraction returned no profile (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}
