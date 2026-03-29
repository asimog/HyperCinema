import Link from "next/link";

import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

const launchPages = [
  CINEMA_PAGE_CONFIGS.hashcinema,
  CINEMA_PAGE_CONFIGS.trenchcinema,
  CINEMA_PAGE_CONFIGS.funcinema,
  CINEMA_PAGE_CONFIGS.familycinema,
  CINEMA_PAGE_CONFIGS.musicvideo,
  CINEMA_PAGE_CONFIGS.recreator,
];

export default function HomePage() {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <div className="simple-home-shell">
        <section className="panel simple-home-hero">
          <p className="eyebrow">HashArt.fun</p>
          <h1 className="font-display">The simplest cinema launcher.</h1>
          <p className="route-summary">
            Six route nodes, one compute spine, and backwards-compatible adapters for legacy
            hashmedia and x402 users. Public routes stay almost free. Private routes stay gated.
            The goal is a trailer generator about anything.
          </p>
          <div className="route-badges">
            <span className="status-badge">6 launch nodes</span>
            <span className="status-badge">16 interfaces</span>
            <span className="status-badge">hashart.fun</span>
          </div>
        </section>

        <section className="module-grid-3x2">
          {launchPages.map((page) => (
            <Link key={page.id} href={page.route} className="surface-card module-tile">
              <p className="eyebrow">{page.eyebrow}</p>
              <h2>{page.title}</h2>
              <p>{page.summary}</p>
              <div className="module-preview">
                <span>Route</span>
                <strong>{page.route}</strong>
              </div>
            </Link>
          ))}
          <Link href="/gallery" className="surface-card module-tile">
            <p className="eyebrow">Public Gallery</p>
            <h2>Gallery</h2>
            <p>Browse moderated public generations across the open routes.</p>
            <div className="module-preview">
              <span>Route</span>
              <strong>/gallery</strong>
            </div>
          </Link>
          <Link href="/admin/moderation" className="surface-card module-tile">
            <p className="eyebrow">Cockpit</p>
            <h2>Moderation Panel</h2>
            <p>Review public gallery items, flag them, or hide them from the shared feed.</p>
            <div className="module-preview">
              <span>Route</span>
              <strong>/admin/moderation</strong>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
