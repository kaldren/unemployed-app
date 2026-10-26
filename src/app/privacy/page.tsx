import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="26 October 2026">
      <p>
        {SITE_NAME} is run by {OPERATOR_NAME} (&quot;we&quot;). This page explains what we collect, why, who we share
        it with and the choices you have. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your name, email and profile photo from Google or LinkedIn, or your work email if
          you sign in with a link.
        </li>
        <li>
          <strong>Candidate profile:</strong> what you enter: headline, about, location, experience, education,
          skills, languages, certifications, links, the roles, pay and work you want, and the companies you hide
          from.
        </li>
        <li>
          <strong>Company and jobs:</strong> your company&apos;s domain and name, and the job posts you write,
          including the briefs you give the AI.
        </li>
        <li>
          <strong>Activity:</strong> which jobs or candidates you like or pass, and the matches that result.
        </li>
        <li>
          <strong>Technical:</strong> a sign-in cookie that keeps you signed in, and server logs (such as IP
          address) kept briefly for security and to fix errors. We don&apos;t use advertising or tracking cookies.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the service you signed up for: show you matches, and connect you when both sides say yes.</li>
        <li>To keep it safe: verify that companies are real and prevent abuse.</li>
        <li>To answer you when you contact us.</li>
      </ul>
      <p>
        We rely on our contract with you (running the service) and our legitimate interest in keeping it safe. We
        don&apos;t sell your data or use it for advertising.
      </p>

      <h2>How the AI is used</h2>
      <p>
        We use AI (Anthropic&apos;s Claude) to draft job posts, to check whether a company is real from its public
        website, and to check how well each candidate fits each job. For matching, the AI sees your profile without
        your name, email or links. It gives a score and a short reason, and we store both so any match can be
        checked. The AI only decides which pairs are shown; a person on each side decides whether to like, and a
        person at the company makes every hiring decision. Our AI provider doesn&apos;t use this data to train its
        models.
      </p>

      <h2>Who sees what</h2>
      <ul>
        <li>
          Companies see your profile on an anonymous card, without your name, photo, email or links. They see those
          only after you both say yes.
        </li>
        <li>Companies whose domain you hide never see you.</li>
        <li>Nobody learns about a pass, or about a like that wasn&apos;t returned.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        We use these providers to run the service. They process data only on our instructions: Supabase (database,
        sign-in and file storage, EU region), Vercel (hosting) and Anthropic (AI). Some may process data outside
        the EU under the European Commission&apos;s standard contractual clauses.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while you have an account. When you delete your account, we delete your profile, swipes,
        matches and files straight away; backups roll over within 30 days.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see and correct your profile at any time, and delete your account from your profile page (employers:
        from the employer home). You can also ask us for a copy of your data, to restrict or object to how we use it,
        or anything else about it, at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. If you think we&apos;ve
        got something wrong, you can complain to your local data protection authority.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&apos;ll tell you by email or in the app first.</p>
    </LegalPage>
  );
}
