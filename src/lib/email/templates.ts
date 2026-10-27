import { SITE_NAME, SITE_URL } from "@/lib/site";

export type Email = { subject: string; text: string; html: string };

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// One short message with one button, as plain text and simple HTML.
function compose({ subject, lines, action, footer }: { subject: string; lines: string[]; action: { label: string; path: string }; footer?: string }): Email {
  const url = `${SITE_URL}${action.path}`;
  const text = [...lines, "", `${action.label}: ${url}`, ...(footer ? ["", footer] : [])].join("\n");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1C1917;background:#FAF8F5;padding:24px">
<div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:24px">
${lines.map((line) => `<p style="margin:0 0 12px;line-height:1.5">${escape(line)}</p>`).join("\n")}
<p style="margin:20px 0 0"><a href="${escape(url)}" style="display:inline-block;background:#C8452F;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:999px">${escape(action.label)}</a></p>
</div>
${footer ? `<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#6F6862">${escape(footer)}</p>` : ""}
</body></html>`;
  return { subject, text, html };
}

export function candidateMatchEmail({ jobTitle, companyName }: { jobTitle: string; companyName: string }): Email {
  return compose({
    subject: `It's a match: ${jobTitle} at ${companyName}`,
    lines: [
      `${companyName} liked you back for ${jobTitle}.`,
      "They can now see your full profile and get in touch. You can reach them too.",
    ],
    action: { label: "See your match", path: "/matches" },
  });
}

export function employerMatchEmail({ jobTitle, candidateName }: { jobTitle: string; candidateName: string | null }): Email {
  const who = candidateName || "A candidate";
  return compose({
    subject: `It's a match for ${jobTitle}`,
    lines: [`${who} matched with you for ${jobTitle}.`, "Their full profile and contact details are now open to you."],
    action: { label: "See your match", path: "/employers/matches" },
  });
}

export function digestEmail({ count }: { count: number }): Email {
  const jobs = count === 1 ? "1 new job" : `${count} new jobs`;
  return compose({
    subject: `${jobs} matched to you`,
    lines: [`${jobs} on ${SITE_NAME} ${count === 1 ? "fits" : "fit"} your profile.`, "Like the ones you want. Companies only see your profile, without your name, until you both say yes."],
    action: { label: "See your jobs", path: "/" },
    footer: "You get this at most once a day when there are new matches. Turn it off in your profile, under Account.",
  });
}

export function companyInviteEmail({ companyName, inviterName }: { companyName: string; inviterName: string | null }): Email {
  return compose({
    subject: `Join ${companyName} on ${SITE_NAME}`,
    lines: [
      `${inviterName || "A teammate"} invited you to hire with ${companyName} on ${SITE_NAME}.`,
      "Sign in or create an account with this email address, then accept the invite.",
    ],
    action: { label: "Accept the invite", path: "/employers/login?next=/employers/company/new" },
  });
}

export function domainVerificationEmail({ companyName, domain, token }: { companyName: string; domain: string; token: string }): Email {
  return compose({
    subject: `Confirm ${domain} for ${companyName}`,
    lines: [
      `Someone on ${SITE_NAME} asked to verify ${companyName} with this address on ${domain}.`,
      "Confirm it to let the company publish jobs. The link works once, for 24 hours.",
    ],
    action: { label: `Verify ${domain}`, path: `/auth/verify-domain?token=${encodeURIComponent(token)}` },
    footer: "Didn't expect this? Ignore this email and nothing changes.",
  });
}
