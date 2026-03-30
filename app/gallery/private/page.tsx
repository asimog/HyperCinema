import Link from "next/link";
import { redirect } from "next/navigation";

import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { getCrossmintViewerFromCookies } from "@/lib/crossmint/server";
import { listCompletedPrivateJobArtifactsByCreator } from "@/lib/jobs/repository";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

export default async function PrivateGalleryPage() {
  const viewer = await getCrossmintViewerFromCookies();
  if (!viewer) {
    redirect("/login?next=/gallery/private");
  }

  const jobs = await listCompletedPrivateJobArtifactsByCreator(viewer.userId, 12);

  const leftRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Private Gallery</p>
            <h2>Viewer-only renders</h2>
          </div>
        </div>
        <p className="route-summary">
          Completed FunCinema and FamilyCinema jobs for {viewer.email ?? viewer.userId}.
        </p>
      </section>
    </div>
  );

  const rightRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Routes</p>
            <h2>Back to private nodes</h2>
          </div>
        </div>
        <div className="button-row">
          <Link href="/FunCinema" className="button button-secondary">
            FunCinema
          </Link>
          <Link href="/FamilyCinema" className="button button-secondary">
            FamilyCinema
          </Link>
        </div>
      </section>
    </div>
  );

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <HyperflowAssemblyScaffold leftRail={leftRail} rightRail={rightRail}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Private Cinema</p>
              <h1>Your hidden gallery</h1>
            </div>
          </div>
        </section>

        {jobs.length ? (
          <section className="module-grid-3x2">
            {jobs.map(({ job, report }) => (
              <Link key={job.jobId} href={`/job/${job.jobId}`} className="surface-card module-tile">
                <p className="eyebrow">{job.experience ?? "private"} · {job.videoSeconds}s</p>
                <h2>{report?.subjectName ?? "Private render"}</h2>
                <p>{report?.summary ?? report?.narrativeSummary ?? "Private cinema render"}</p>
                <div className="module-preview">
                  <span>Visibility</span>
                  <strong>{job.visibility ?? "private"}</strong>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <section className="panel">
            <p className="route-summary">
              No completed private renders yet. Launch one from FunCinema or FamilyCinema.
            </p>
          </section>
        )}
      </HyperflowAssemblyScaffold>
    </div>
  );
}

