"use client";

import { ReportDocument } from "@/lib/types/domain";

interface ReportCardProps {
  report: ReportDocument;
  reportUrl: string;
}

export function ReportCard({ report, reportUrl }: ReportCardProps) {
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

      <div className="grid gap-3 text-sm text-[#f4e1c5] md:grid-cols-2">
        <p>Pump Tokens Traded: {report.pumpTokensTraded}</p>
        <p>Style: {report.styleClassification}</p>
        <p>Buys: {report.buyCount}</p>
        <p>Sells: {report.sellCount}</p>
        <p>SOL Spent: {report.solSpent}</p>
        <p>SOL Received: {report.solReceived}</p>
        <p>Estimated PnL: {report.estimatedPnlSol} SOL</p>
        <p>Best Trade: {report.bestTrade}</p>
      </div>

      <p className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4 text-sm leading-relaxed text-[#f3e0c5]">
        {report.summary}
      </p>

      {report.walletPersonality ? (
        <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">
            Wallet Personality
          </p>
          <p className="mt-2 text-base font-semibold text-[var(--accent-cool)]">
            {report.walletPersonality}
          </p>
          {report.walletSecondaryPersonality ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Secondary influence: {report.walletSecondaryPersonality}
            </p>
          ) : null}
          {report.walletModifiers?.length ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Modifiers: {report.walletModifiers.join(", ")}
            </p>
          ) : null}
          {report.narrativeSummary ? (
            <p className="mt-3 text-sm leading-relaxed text-[#f3e0c5]">
              {report.narrativeSummary}
            </p>
          ) : null}
        </div>
      ) : null}

      {report.behaviorPatterns?.length ? (
        <div className="mt-4">
          <p className="mb-2 cinema-kicker text-[0.62rem] font-semibold">
            Behavior Patterns
          </p>
          <ul className="space-y-1 text-sm text-[#f4e1c5]">
            {report.behaviorPatterns.map((pattern) => (
              <li key={pattern}>- {pattern}</li>
            ))}
          </ul>
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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs text-[#d9c7ad]">
          <thead>
            <tr className="border-b border-white/10 text-[#a9998d]">
              <th className="py-2">Time (UTC)</th>
              <th className="py-2">Symbol</th>
              <th className="py-2">Side</th>
              <th className="py-2">Token</th>
              <th className="py-2">SOL</th>
            </tr>
          </thead>
          <tbody>
            {report.timeline.slice(-15).map((item) => (
              <tr
                key={`${item.signature}-${item.timestamp}`}
                className="border-b border-white/5"
              >
                <td className="py-2">
                  {new Date(item.timestamp * 1000).toISOString().slice(0, 19)}
                </td>
                <td className="py-2">{item.symbol}</td>
                <td className="py-2 uppercase">{item.side}</td>
                <td className="py-2">{item.tokenAmount.toFixed(4)}</td>
                <td className="py-2">{item.solAmount.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
