import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { lookup } from "node:dns/promises";
import { and, eq, isNull } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { isAiConfigured } from "@/lib/jobs/draft";
import {
  buildVettingPrompt,
  clampReason,
  htmlToText,
  isFetchableHost,
  isPublicIp,
  isReservedDomain,
  STATUS_FOR_DECISION,
  VETTING_SYSTEM,
  vettingSchema,
  type Vetting,
} from "./vetting-prompt";

// Server-only setting: set VETTING_MODEL to switch models without a code change.
export const DEFAULT_VETTING_MODEL = "claude-haiku-5-5";

export function vettingModel() {
  return process.env.VETTING_MODEL?.trim() || DEFAULT_VETTING_MODEL;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 500_000;

// The homepage's text, or null when it can't be loaded. Each redirect is checked again, so it can't lead inside.
export async function fetchHomepageText(domain: string): Promise<string | null> {
  let url = new URL(`https://${domain}/`);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.port || url.username || !isFetchableHost(url.hostname)) return null;
    try {
      if (!(await resolvesToPublicIps(url.hostname))) return null;
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": "Mozilla/5.0 (compatible; company-vetting)", accept: "text/html" },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }
      if (!response.ok || !response.body) return null;
      return htmlToText(await readCapped(response.body)) || null;
    } catch {
      return null;
    }
  }
  return null;
}

// The name's addresses are all public, so a domain pointing at a private or local address isn't fetched.
// fetch resolves again, so a DNS change in between could still slip by; the page only ever reaches Claude.
async function resolvesToPublicIps(host: string) {
  const addresses = await lookup(host, { all: true });
  return addresses.length > 0 && addresses.every(({ address }) => isPublicIp(address));
}

async function readCapped(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  while (html.length < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return html;
}

async function askClaude(prompt: string): Promise<Vetting> {
  const response = await new Anthropic().messages.parse({
    model: vettingModel(),
    max_tokens: 2000,
    output_config: { effort: "low", format: zodOutputFormat(vettingSchema) },
    system: VETTING_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Vetting returned nothing (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}

// Vets a pending company once. Any failure becomes `needs_review`, so a human always gets the final say.
// Reserved domains (example.com, *.test) are never real companies and stay pending.
export async function vetCompany(companyId: string) {
  // Claims the company by stamping vettedAt first, so concurrent page views start one run, not many.
  const [company] = await db
    .update(companies)
    .set({ vettedAt: new Date() })
    .where(and(eq(companies.id, companyId), eq(companies.status, "pending"), isNull(companies.vettedAt)))
    .returning({ domain: companies.domain, name: companies.name });
  if (!company) return;

  let vetting: Vetting;
  let model: string | null = null;
  if (!isAiConfigured()) {
    vetting = { decision: "needs_review", reason: "AI vetting isn't set up, so this needs a manual check." };
  } else {
    try {
      const pageText = await fetchHomepageText(company.domain);
      vetting = await askClaude(buildVettingPrompt(company.domain, company.name, pageText));
      model = vettingModel();
    } catch (error) {
      console.error("Company vetting failed", error);
      vetting = { decision: "needs_review", reason: "AI vetting failed, so this needs a manual check." };
    }
  }

  // Only while still pending: an admin's decision made meanwhile wins.
  await db
    .update(companies)
    .set({ status: STATUS_FOR_DECISION[vetting.decision], vettingReason: clampReason(vetting.reason), vettingModel: model })
    .where(and(eq(companies.id, companyId), eq(companies.status, "pending")));
}

// Vets after the response is sent, so sign-in doesn't wait on the AI. Reserved domains are skipped up front.
export function vetCompanySoon(companyId: string, domain: string) {
  if (isReservedDomain(domain)) return;
  after(() => vetCompany(companyId).catch((error) => console.error("Company vetting failed", error)));
}
