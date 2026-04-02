import Link from "next/link";

import { CinemaConciergeChat } from "@/components/chat/CinemaConciergeChat";
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
      <div className="simple-home-shell home-shell-refined">
        <section className="panel simple-home-hero home-hero-refined">
          <p className="eyebrow">HashArt.fun</p>
          <h1 className="font-display">Generate cinematic videos fast.</h1>
          <p className="route-summary">
            One focused flow: use the concierge chat, provide details, complete payment, and your
            job moves straight into the render pipeline.
          </p>
          <a href="#concierge-chat" className="button button-primary home-hero-cta">
            Start with concierge chat
          </a>
        </section>

        <section className="home-assembly-grid">
          <aside className="home-concierge-column">
            <CinemaConciergeChat />
          </aside>

          <div className="home-studios-column">
            <div className="home-studios-header">
              <p className="eyebrow">Studios</p>
              <h2 className="font-display">Pick a route and scroll</h2>
              <p className="route-summary">
                Cleaner cards, less noise. Each studio opens a focused generation page.
              </p>
            </div>

            <div className="home-studio-stack">
              {launchPages.map((page, index) => (
                <article key={page.id} className={`surface-card home-studio-card tone-${index % 6}`}>
                  <div className="home-studio-copy">
                    <h3>{page.title}</h3>
                    <p>{page.summary}</p>
                  </div>
                  <Link href={page.route} className="button button-secondary home-studio-link">
                    Open {page.title}
                  </Link>
                </article>
              ))}

              <article className="surface-card home-studio-card tone-gallery">
                <div className="home-studio-copy">
                  <h3>Gallery</h3>
                  <p>See public generations, references, and recent outputs.</p>
                </div>
                <Link href="/gallery" className="button button-secondary home-studio-link">
                  Open gallery
                </Link>
              </article>

              <div className="home-admin-link">
                <Link href="/admin/moderation">Open cockpit moderation</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
