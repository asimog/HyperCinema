import Link from "next/link";

import { TRENDING_SPOTLIGHTS } from "@/lib/hypermyths/content";
import {
  listCompletedJobArtifacts,
  listCompletedJobArtifactsByWallet,
} from "@/lib/jobs/repository";

export const dynamic = "force-dynamic";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function buildDescription(report?: {
  summary?: string;
  narrativeSummary?: string;
  funObservations?: string[];
}): string {
  const base =
    report?.summary ||
    report?.narrativeSummary ||
    report?.funObservations?.[0] ||
    "A completed HyperMyths cut.";
  return truncate(base, 150);
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }> | { token?: string };
}) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const tokenQuery = params.token?.trim() ?? "";
  let jobs: Awaited<ReturnType<typeof listCompletedJobArtifacts>> = [];
  let archiveError: string | null = null;

  try {
    jobs = tokenQuery
      ? await listCompletedJobArtifactsByWallet(tokenQuery, 12)
      : await listCompletedJobArtifacts(12);
  } catch (error) {
    archiveError =
      error instanceof Error
        ? error.message
        : "Trending archive is temporarily unavailable.";
  }

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#f4efe8] md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl space-y-6">
          <section className="panel trend-hero trend-hero--sleek">
            <p className="eyebrow">Trending</p>
            <h1 className="font-display">What people are making now.</h1>
            <p className="route-summary">
              Browse recent HyperMyths releases, featured formats, and completed videos in one place.
            </p>
          </section>

          <section className="trend-grid trend-grid--sleek">
            {TRENDING_SPOTLIGHTS.map((item) => (
              <Link key={item.title} href={item.href} className="surface-card trend-card trend-card--glass">
                <div className="trend-card-top trend-card-top--sleek">
                  <div className="trend-card-titlewrap">
                    <span className="trend-card-icon" aria-hidden="true" />
                    <h2>{item.title}</h2>
                  </div>
                </div>
                <p className="trend-card-copy">{item.promise}</p>
              </Link>
            ))}
          </section>

          <section className="panel trend-recent-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Archive</p>
                <h2>Recent releases</h2>
              </div>
              <Link href="/trending" className="button button-secondary">
                Clear search
              </Link>
            </div>

            <form method="GET" className="form-stack">
              <div className="field">
                <span>Mint or contract</span>
                <input
                  name="token"
                  defaultValue={tokenQuery}
                  placeholder="Paste token address"
                />
              </div>
              <div className="button-row">
                <button type="submit" className="button button-primary">
                  Search videos
                </button>
                <Link href="/" className="button button-secondary">
                  Home
                </Link>
              </div>
            </form>

            {archiveError ? (
              <p className="route-summary">{archiveError}</p>
            ) : jobs.length ? (
              <section className="module-grid-3x2">
                {jobs.map(({ job, report }) => {
                  const description = buildDescription(report ?? undefined);
                  const title =
                    report?.subjectName ??
                    report?.subjectSymbol ??
                    report?.walletPersonality ??
                    "HyperMyths";
                  const subline =
                    report?.subjectSymbol ??
                    report?.subjectAddress ??
                    report?.wallet ??
                    job.wallet;

                  return (
                    <Link
                      key={job.jobId}
                      href={`/job/${job.jobId}`}
                      className="surface-card module-tile"
                    >
                      <p className="eyebrow">{job.videoSeconds}s cut</p>
                      <h2>{title}</h2>
                      <p>{description}</p>
                      <div className="module-preview">
                        <span>Address</span>
                        <strong>{truncate(subline, 24)}</strong>
                      </div>
                    </Link>
                  );
                })}
              </section>
            ) : (
              <p className="route-summary">
                {tokenQuery
                  ? `No completed videos found for ${tokenQuery}.`
                  : "No completed videos yet. The first finished release will appear here."}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
