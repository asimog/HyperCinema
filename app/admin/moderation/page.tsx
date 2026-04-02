import Link from "next/link";

import { hasCockpitAccess } from "@/lib/admin/cockpit-auth";
import { CredentialLoginCard } from "@/components/auth/CredentialLoginCard";
import { ModerationTable } from "@/components/admin/ModerationTable";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { listModerationJobArtifacts } from "@/lib/jobs/repository";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const error = searchParams.error as string;
  const isAuthed = await hasCockpitAccess();

  if (!isAuthed) {
    const errorMessage = error === "invalid" ? "Invalid username or password. Please try again." : undefined;

    return (
      <CredentialLoginCard
        title="Open the cockpit"
        summary="Enter the cockpit credentials to manage the gallery."
        error={errorMessage}
      />
    );
  }

  const items = await listModerationJobArtifacts(18);

  const leftRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HyperMyths Cockpit</p>
            <h2>Gallery moderation</h2>
          </div>
        </div>
        <p className="route-summary">
          Review finished jobs, flag anything questionable, and hide anything that should not remain public.
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
            <h2>Quick links</h2>
          </div>
        </div>
        <div className="button-row">
          <Link href="/" className="button button-secondary">
            Home
          </Link>
          <Link href="/gallery" className="button button-secondary">
            Gallery
          </Link>
        </div>
        <form action="/api/cockpit/logout" method="POST" style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="button button-secondary">
            Log out
          </button>
        </form>
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

