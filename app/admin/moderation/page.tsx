import Link from "next/link";

import { CrossmintLoginCard } from "@/components/auth/CrossmintLoginCard";
import { ModerationTable } from "@/components/admin/ModerationTable";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { getCrossmintViewerFromCookies, isCrossmintAdmin } from "@/lib/crossmint/server";
import { listModerationJobArtifacts } from "@/lib/jobs/repository";

export default async function ModerationPage() {
  const viewer = await getCrossmintViewerFromCookies();

  if (!viewer) {
    return (
      <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
        <CrossmintLoginCard
          title="Login to open the moderation cockpit"
          summary="The public gallery cockpit is admin-only and uses the same Crossmint auth layer as the private cinema routes."
        />
      </div>
    );
  }

  if (!isCrossmintAdmin({ email: viewer.email, userId: viewer.userId })) {
    return (
      <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
        <section className="panel gate-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Cockpit</p>
              <h2>Admin access required</h2>
            </div>
          </div>
          <p className="route-summary">
            Your Crossmint session is live, but this panel is limited to the configured admin
            allowlist.
          </p>
        </section>
      </div>
    );
  }

  const items = await listModerationJobArtifacts(18);

  const leftRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Pilot Cockpit</p>
            <h2>Public gallery moderation</h2>
          </div>
        </div>
        <p className="route-summary">
          Review completed jobs, flag questionable items, and hide anything that should not
          remain public.
        </p>
      </section>
    </div>
  );

  const rightRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Shortcuts</p>
            <h2>Jump routes</h2>
          </div>
        </div>
        <div className="button-row">
          <Link href="/" className="button button-secondary">
            Home
          </Link>
          <Link href="/gallery" className="button button-secondary">
            Public gallery
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
              <p className="eyebrow">Admin</p>
              <h1>Moderation cockpit</h1>
            </div>
          </div>
        </section>
        <ModerationTable
          items={items.map(({ job, report }) => ({
            jobId: job.jobId,
            title: report?.subjectName ?? report?.subjectSymbol ?? job.jobId,
            summary:
              report?.summary ??
              report?.narrativeSummary ??
              "No report summary generated yet.",
            experience: job.experience ?? "legacy",
            visibility: job.visibility ?? "public",
            moderationStatus: job.moderationStatus ?? "visible",
          }))}
        />
      </HyperflowAssemblyScaffold>
    </div>
  );
}

