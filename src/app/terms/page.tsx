import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR_NAME, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="26 October 2026">
      <p>
        These terms are between you and {OPERATOR_NAME} (&quot;we&quot;), who run {SITE_NAME}. By signing in you
        agree to them. {SITE_NAME} is in its pilot, so features may change.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 16 and use your own, accurate details.</li>
        <li>Keep your sign-in secure. You&apos;re responsible for what happens in your account.</li>
        <li>You can delete your account at any time.</li>
      </ul>

      <h2>Candidates</h2>
      <ul>
        <li>Your profile must be truthful: real experience, skills and education.</li>
        <li>Liking a job tells the company you&apos;re interested. It isn&apos;t a contract.</li>
      </ul>

      <h2>Employers</h2>
      <ul>
        <li>Sign in with your work email, and only for a company you&apos;re allowed to hire for.</li>
        <li>Post only real, open jobs with an honest description and pay range.</li>
        <li>
          Don&apos;t discriminate. Treat candidates&apos; details as confidential and use them only to hire for the
          job they matched.
        </li>
        <li>We may verify your company and refuse or remove any company or job.</li>
      </ul>

      <h2>Not allowed</h2>
      <ul>
        <li>Spam, scams, or collecting people&apos;s data for anything but hiring.</li>
        <li>Scraping, reverse engineering or overloading the service.</li>
        <li>Anything illegal or that harms other users.</li>
      </ul>
      <p>We may suspend or close accounts that break these terms.</p>

      <h2>Matching and AI</h2>
      <p>
        AI suggests matches and explains them. It can be wrong. We don&apos;t promise any particular number of
        matches, interviews or hires, and every decision to like, interview or hire is yours.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as it is, free during the pilot. As far as the law allows, we aren&apos;t liable for
        indirect losses, or for what candidates or employers do. Nothing here limits rights you have by law.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle your data is in our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we change these terms in a way that matters, we&apos;ll tell you first. Questions:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
