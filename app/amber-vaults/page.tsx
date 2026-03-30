import Link from "next/link";
import { redirect } from "next/navigation";

import { ModerationTable } from "@/components/admin/ModerationTable";
import { AmberVaultsStudio } from "@/components/amber-vaults/AmberVaultsStudio";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { getCrossmintViewerFromCookies, isCrossmintAdmin } from "@/lib/crossmint/server";
import { listModerationJobArtifacts } from "@/lib/jobs/repository";

export default async function AmberVaultsPage() {
  const viewer = await getCrossmintViewerFromCookies();

  if (!viewer) {
    redirect("/login?next=/amber-vaults");
  }

  if (!isCrossmintAdmin({ email: viewer.email, userId: viewer.userId })) {
    return (
      <div className="cinema-shell cinema-noise min-h-dvh overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
        <section className="panel gate-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Amber Vaults</p>
              <h2>Admin access required</h2>
            </div>
          </div>
          <p className="route-summary">
            Your session is live but this vault is limited to the configured admin allowlist.
          </p>
        </section>
      </div>
    );
  }

  const items = await listModerationJobArtifacts(24);

  const leftRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Admin Studio</p>
            <h2>Amber Vaults</h2>
          </div>
        </div>
        <p className="route-summary">
          Personal studio — all cinema nodes, all styles, no payment required.
          Renders land in your private gallery.
        </p>
        <div className="route-badges">
          <span className="status-badge">admin only</span>
          <span className="status-badge">no payment</span>
          <span className="status-badge">private renders</span>
        </div>
      </section>

      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Session</p>
            <h2>Viewer</h2>
          </div>
        </div>
        <p className="route-summary compact">{viewer.email ?? viewer.userId}</p>
      </section>

      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quick links</p>
            <h2>Jump routes</h2>
          </div>
        </div>
        <div className="button-row">
          <Link href="/gallery/private" className="button button-secondary">Private gallery</Link>
          <Link href="/gallery" className="button button-secondary">Public gallery</Link>
        </div>
        <div className="button-row" style={{ marginTop: "0.5rem" }}>
          <Link href="/" className="button button-secondary">Home</Link>
          <Link href="/admin/moderation" className="button button-secondary">Moderation</Link>
        </div>
      </section>
    </div>
  );

  const rightRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Styles available</p>
            <h2>All presets</h2>
          </div>
        </div>
        <div className="mini-list">
          {[
            { id: "hyperflow_assembly", label: "Hyperflow Assembly", note: "Control-room edit" },
            { id: "glass_signal", label: "Glass Signal", note: "Minimal, architectural" },
            { id: "mythic_poster", label: "Mythic Poster", note: "Epic hero framing" },
            { id: "trench_neon", label: "Trench Neon", note: "Neon meme-trench" },
            { id: "trading_card", label: "Trading Card", note: "Flat card graphic" },
            { id: "crt_anime_90s", label: "90s Anime CRT", note: "DBZ / Pokemon scanlines" },
          ].map((s) => (
            <article key={s.id} className="mini-item-card">
              <div>
                <span>{s.label}</span>
                <strong>{s.note}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Episode tip</p>
            <h2>40-min episodes</h2>
          </div>
        </div>
        <p className="route-summary compact">
          Each job renders one 30–60s segment. For a 40-minute episode, queue 40–80 jobs
          with the same episode title and incrementing act numbers in the act breakdown field.
          Use Scene Recreation for transcript-driven acts and Music Video for score-led acts.
        </p>
      </section>
    </div>
  );

  return (
    <div className="cinema-shell cinema-noise min-h-dvh overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <HyperflowAssemblyScaffold leftRail={leftRail} rightRail={rightRail}>
        <section className="panel home-hero-panel">
          <div className="home-hero-copy">
            <p className="eyebrow">Personal studio</p>
            <h1>Amber Vaults</h1>
            <p className="route-summary">
              Full access to every cinema node. No payment step. All renders land in your private
              gallery. Use the episode fields for long-form work.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Studio</p>
              <h2>Generate</h2>
            </div>
          </div>
          <AmberVaultsStudio />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Moderation</p>
              <h2>Recent jobs</h2>
            </div>
          </div>
          <ModerationTable
            items={items.map(({ job, report }) => ({
              jobId: job.jobId,
              title: report?.subjectName ?? report?.subjectSymbol ?? job.jobId,
              summary: report?.summary ?? report?.narrativeSummary ?? "No summary yet.",
              experience: job.experience ?? "legacy",
              visibility: job.visibility ?? "public",
              moderationStatus: job.moderationStatus ?? "visible",
            }))}
          />
        </section>
      </HyperflowAssemblyScaffold>
    </div>
  );
}
