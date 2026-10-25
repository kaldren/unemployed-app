import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { clampScore, MATCH_SYSTEM, matchScoreSchema, type MatchScore } from "./prompt";

// Server-only setting: set MATCH_MODEL to switch models without a code change.
export const DEFAULT_MATCH_MODEL = "claude-sonnet-5-5";

export function matchModel() {
  return process.env.MATCH_MODEL?.trim() || DEFAULT_MATCH_MODEL;
}

export class MatchScoreError extends Error {}

// Has Claude score one job and candidate pair.
export async function scoreMatch(prompt: string): Promise<MatchScore> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: matchModel(),
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(matchScoreSchema) },
    system: MATCH_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new MatchScoreError(`Match score returned nothing (stop_reason: ${response.stop_reason})`);
  }
  return clampScore(response.parsed_output);
}
