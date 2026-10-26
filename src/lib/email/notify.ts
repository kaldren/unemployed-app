import "server-only";
import { after } from "next/server";
import { countNewJobs, getMatchContacts, listDigestCandidates, stampDigestSent } from "@/lib/matching/queries";
import { isEmailConfigured, sendEmail } from "./send";
import { candidateMatchEmail, digestEmail, employerMatchEmail } from "./templates";

// Tells both sides about a new match, after the response is sent.
export function notifyMatchSoon(jobId: string, candidateId: string) {
  after(async () => {
    try {
      const match = await getMatchContacts(jobId, candidateId);
      if (!match) return;
      const sends = [sendEmail(match.candidateEmail, candidateMatchEmail(match))];
      if (match.employerEmail) sends.push(sendEmail(match.employerEmail, employerMatchEmail(match)));
      await Promise.all(sends);
    } catch (error) {
      console.error("Match email failed", error);
    }
  });
}

// Candidates per digest run; the cron runs daily, so anyone left over goes out the next day.
const DIGESTS_PER_RUN = 500;

// Emails each candidate who wants it how many new jobs matched them since their last check.
// Candidates with nothing new get no email but are stamped too, so the next run moves on to others.
export async function sendDigests() {
  if (!isEmailConfigured()) return { sent: 0, skipped: "email not configured" };
  let sent = 0;
  for (const candidate of await listDigestCandidates(DIGESTS_PER_RUN)) {
    try {
      const count = await countNewJobs(candidate.id, candidate.since);
      if (count > 0) {
        await sendEmail(candidate.email, digestEmail({ count }));
        sent++;
      }
      await stampDigestSent(candidate.id);
    } catch (error) {
      console.error("Digest email failed", error);
    }
  }
  return { sent };
}
