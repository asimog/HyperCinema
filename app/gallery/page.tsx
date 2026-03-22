import Image from "next/image";
import Link from "next/link";

import {
  listCompletedJobArtifacts,
  listCompletedJobArtifactsByWallet,
} from "@/lib/jobs/repository";

export const dynamic = "force-dynamic";

function shortWallet(wallet: string): string {
  if (!wallet) return "Unknown";
  if (wallet.length <= 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

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
    "A completed trench cinema dossier and trailer.";
  return truncate(base, 150);
}

function dossierLines(report?: { funObservations?: string[]; memorableMoments?: string[] }): string[] {
  const source = [
    ...(report?.funObservations ?? []),
    ...(report?.memorableMoments ?? []),
  ];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const line of source) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    lines.push(trimmed);
    if (lines.length >= 2) break;
  }
  return lines;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams?: { wallet?: string };
}) {
  const walletQuery = searchParams?.wallet?.trim() ?? "";
  const jobs = walletQuery
    ? await listCompletedJobArtifactsByWallet(walletQuery, 12)
    : await listCompletedJobArtifacts(12);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="cinema-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="cinema-kicker text-[0.68rem] font-semibold">Completed Jobs</p>
              <h1 className="font-display mt-3 text-4xl leading-none text-[#fff0da] md:text-5xl">
                The Gallery
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                A wall of finished dossiers and trailers. Tap a card to open the full
                production file.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="cinema-secondary-button inline-flex rounded-2xl px-4 py-3 text-sm font-medium transition"
              >
                Back to homepage
              </Link>
            </div>
          </div>

          <form method="GET" className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="cinema-kicker text-[0.62rem] font-semibold">
                Search by wallet address
              </label>
              <input
                name="wallet"
                defaultValue={walletQuery}
                placeholder="Paste wallet address"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-[#fff1dc] placeholder:text-[var(--muted)] focus:border-white/20 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="cinema-primary-button inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition"
              >
                Search
              </button>
              {walletQuery ? (
                <Link
                  href="/gallery"
                  className="cinema-secondary-button inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </section>

        {jobs.length ? (
          <section className="grid gap-4 md:grid-cols-3">
            {jobs.map(({ job, report, video }) => {
              const description = buildDescription(report ?? undefined);
              const dossier = dossierLines(report ?? undefined);
              const personality =
                report?.walletPersonality ||
                report?.styleClassification ||
                "Trench Cinema";
              const walletLabel = shortWallet(report?.wallet ?? job.wallet);
              const thumbnailUrl = video?.thumbnailUrl ?? null;

              return (
                <Link
                  key={job.jobId}
                  href={`/job/${job.jobId}`}
                  className="group overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/30 transition hover:border-white/20"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0c0b0e]">
                    {thumbnailUrl ? (
                      <Image
                        src={thumbnailUrl}
                        alt={`Thumbnail for ${walletLabel}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">
                        Thumbnail pending
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="cinema-kicker text-[0.62rem] font-semibold">
                      Wallet {walletLabel}
                    </p>
                    <h3 className="font-display mt-2 text-xl text-[#fff0da]">
                      {personality}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                      {description}
                    </p>
                    {dossier.length ? (
                      <div className="mt-3 space-y-1 text-xs text-[#f4e1c5]">
                        <p className="cinema-kicker text-[0.58rem] font-semibold">
                          Dossier
                        </p>
                        {dossier.map((line) => (
                          <p key={line}>- {truncate(line, 90)}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <section className="cinema-panel-soft rounded-[1.8rem] p-6 text-sm text-[var(--muted)]">
            {walletQuery
              ? `No completed jobs found for ${walletQuery}.`
              : "No completed jobs yet. Generate the first one and it will show up here."}
          </section>
        )}
      </main>
    </div>
  );
}
