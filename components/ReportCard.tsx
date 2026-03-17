"use client";

import { ReportDocument } from "@/lib/types/domain";

interface ReportCardProps {
  report: ReportDocument;
  reportUrl: string;
}

export function ReportCard({ report, reportUrl }: ReportCardProps) {
  const summary = report.summary || report.narrativeSummary || "No summary yet.";
  const personality =
    report.walletPersonality || report.styleClassification || "Unclassified";
  const modifiers = report.walletModifiers?.length
    ? report.walletModifiers.join(", ")
    : "None detected";

  return (
    <section className="cinema-panel rounded-[2rem] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="cinema-kicker text-[0.68rem] font-semibold">Combined Report</p>
          <h2 className="font-display mt-2 text-3xl text-[#fff0da]">The Dossier</h2>
        </div>
        <a
          href={reportUrl}
          target="_blank"
          rel="noreferrer"
          className="cinema-secondary-button rounded-2xl px-4 py-3 text-xs font-medium transition"
        >
          Download PDF
        </a>
      </div>

      <div className="rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
        <p className="cinema-kicker text-[0.62rem] font-semibold">Wallet Address</p>
        <p className="mt-2 break-all text-sm text-[#f4e1c5]">{report.wallet}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="cinema-panel-soft rounded-[1.3rem] p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">Persona</p>
          <p className="mt-2 text-lg font-semibold text-[#fff1dc]">{personality}</p>
          {report.walletSecondaryPersonality ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Secondary: {report.walletSecondaryPersonality}
            </p>
          ) : null}
        </div>
        <div className="cinema-panel-soft rounded-[1.3rem] p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">Modifiers</p>
          <p className="mt-2 text-sm text-[#f4e1c5]">{modifiers}</p>
        </div>
        <div className="cinema-panel-soft rounded-[1.3rem] p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">Window</p>
          <p className="mt-2 text-sm text-[#f4e1c5]">
            Last {report.rangeDays} day(s)
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Style: {report.styleClassification}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
        <p className="cinema-kicker text-[0.62rem] font-semibold">Summary</p>
        <p className="mt-2 text-sm leading-relaxed text-[#f3e0c5]">{summary}</p>
      </div>

      {report.narrativeSummary ? (
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">
            Narrative Thread
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#f3e0c5]">
            {report.narrativeSummary}
          </p>
        </div>
      ) : null}

      {report.funObservations?.length ? (
        <div className="mt-4">
          <p className="mb-2 cinema-kicker text-[0.62rem] font-semibold">
            Fun Observations
          </p>
          <ul className="space-y-1 text-sm text-[#f4e1c5]">
            {report.funObservations.map((observation) => (
              <li key={observation}>- {observation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.memorableMoments?.length ? (
        <div className="mt-4">
          <p className="mb-2 cinema-kicker text-[0.62rem] font-semibold">
            Memorable Moments
          </p>
          <ul className="space-y-1 text-sm text-[#f4e1c5]">
            {report.memorableMoments.map((moment) => (
              <li key={moment}>- {moment}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.behaviorPatterns?.length ? (
        <div className="mt-4">
          <p className="mb-2 cinema-kicker text-[0.62rem] font-semibold">
            Behavior Notes
          </p>
          <ul className="space-y-1 text-sm text-[#f4e1c5]">
            {report.behaviorPatterns.map((pattern) => (
              <li key={pattern}>- {pattern}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.keyEvents?.length ? (
        <div className="mt-4">
          <p className="mb-2 cinema-kicker text-[0.62rem] font-semibold">
            Key Events
          </p>
          <ul className="space-y-2 text-sm text-[#f4e1c5]">
            {report.keyEvents.map((event, index) => (
              <li
                key={`${event.type}-${event.signature}-${index}`}
                className="rounded-[1rem] border border-white/10 bg-[#0d0a0c]/78 p-3"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-[#b7a899]">
                  {event.type.replace(/_/g, " ")}
                </p>
                <p className="mt-2 text-[#f4e1c5]">{event.tradeContext}</p>
                <p className="mt-1 text-[var(--muted)]">{event.interpretation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.storyBeats?.length ? (
        <div className="mt-4">
          <p className="mb-2 cinema-kicker text-[0.62rem] font-semibold">
            Video Story Beats
          </p>
          <ul className="space-y-1 text-sm text-[#f4e1c5]">
            {report.storyBeats.map((beat) => (
              <li key={beat}>- {beat}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
