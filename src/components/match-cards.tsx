import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRIES } from "@/lib/candidate/locales";
import { AVAILABILITY, SENIORITY, WORK_MODES } from "@/lib/candidate/schemas";
import { locationLabel, roleTypeLabel, salaryLabel } from "@/lib/jobs/labels";
import type { CandidateCard, JobCard } from "@/lib/matching/queries";

const COUNTRY_NAMES = new Map(COUNTRIES);

// What a candidate sees on a job in their deck.
export function JobCardBody({ job }: { job: JobCard }) {
  const roleType = roleTypeLabel(job);
  const facts = [locationLabel(job), salaryLabel(job)].filter(Boolean).join(" · ");
  return (
    <>
      <div aria-hidden className="-mt-(--card-spacing) h-1.5 bg-linear-to-r from-spark-1 via-spark-2 to-spark-3" />
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{job.companyName}</CardDescription>
          <FitBadge coverage={job.skillCoverage} />
        </div>
        <CardTitle asChild>
          <h2 className="text-2xl tracking-tight">{job.title}</h2>
        </CardTitle>
        {roleType && <CardDescription>{roleType}</CardDescription>}
        {facts && <CardDescription>{facts}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <MatchReason label="Why it fits you" reason={job.reason} />
        <p className="whitespace-pre-line">{job.description}</p>
        <Tags label="Skills" items={job.skills} />
      </CardContent>
    </>
  );
}

// What an employer sees on a candidate: the profile without name or contact details.
export function CandidateCardBody({ candidate }: { candidate: CandidateCard }) {
  const location = [candidate.locationCity, candidate.locationCountry && COUNTRY_NAMES.get(candidate.locationCountry)]
    .filter(Boolean)
    .join(", ");
  const facts = [
    location,
    candidate.seniority && SENIORITY[candidate.seniority],
    candidate.workModes.map((mode) => WORK_MODES[mode]).join(" or "),
    candidate.availableFrom && `Available ${AVAILABILITY[candidate.availableFrom].toLowerCase()}`,
  ].filter(Boolean);

  return (
    <>
      <CardHeader>
        <CardTitle asChild>
          <h2 className="text-2xl tracking-tight">{candidate.headline}</h2>
        </CardTitle>
        <CardDescription>{facts.join(" · ")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <MatchReason label="Why they fit" reason={candidate.reason} />
        <p className="whitespace-pre-line">{candidate.about}</p>
        <Tags label="Looking for" items={candidate.roles} />
        {candidate.experiences.length > 0 && (
          <section className="flex flex-col gap-2" aria-label="Experience">
            <h3 className="text-xs text-muted-foreground">Experience</h3>
            <ul className="flex flex-col gap-1.5">
              {candidate.experiences.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.title}</span> at {e.companyName}{" "}
                  <span className="text-muted-foreground">
                    {e.startDate.slice(0, 4)}–{e.endDate ? e.endDate.slice(0, 4) : "now"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Tags label="Skills" items={candidate.skills} />
      </CardContent>
    </>
  );
}

// How much of the job's skills the candidate has: the share the AI checked.
function FitBadge({ coverage }: { coverage: number }) {
  if (coverage <= 0) return null;
  return (
    <Badge className="h-6 bg-success-soft px-2.5 text-success-soft-foreground">
      <Sparkles aria-hidden />
      {coverage}% skills match
    </Badge>
  );
}

// The AI's reason for the match, told to whoever is looking.
function MatchReason({ label, reason }: { label: string; reason: string }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg bg-accent p-4" aria-label={label}>
      <h3 className="text-xs font-medium text-primary">{label}</h3>
      <p>{reason}</p>
    </section>
  );
}

function Tags({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={label}>
      <h3 className="text-xs text-muted-foreground">{label}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <Badge variant="secondary">{item}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
