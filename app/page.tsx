import Link from "next/link";

import { CinemaConciergeChat } from "@/components/chat/CinemaConciergeChat";
import { HYPERMYTHS_CATEGORIES, TRENDING_SPOTLIGHTS } from "@/lib/hypermyths/content";

export default function HomePage() {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <div className="simple-home-shell home-shell-refined">
        <section className="panel simple-home-hero home-hero-refined">
          <p className="eyebrow">HyperMyths.com</p>
          <h1 className="font-display">Cinematic creation for weird ideas, family memories, and music-driven stories.</h1>
          <p className="route-summary">
            One brand. Five categories. One concierge. Clean briefs, stronger prompts, and a more intentional render flow.
          </p>
          <a href="#concierge-chat" className="button button-primary home-hero-cta">
            Open concierge
          </a>
        </section>

        <section className="home-assembly-grid">
          <aside className="home-concierge-column">
            <CinemaConciergeChat />
          </aside>

          <div className="home-studios-column">
            <div className="home-studios-header">
              <p className="eyebrow">Trending</p>
              <h2 className="font-display">What people are making now</h2>
              <p className="route-summary">
                A sharper public rail for the most clickable packaged ideas.
              </p>
            </div>

            <div className="trend-grid trend-grid--compact">
              {TRENDING_SPOTLIGHTS.slice(0, 4).map((item) => (
                <article key={item.title} className="surface-card trend-card">
                  <div className="trend-card-top">
                    <div>
                      <p className="eyebrow">{item.category}</p>
                      <h3>{item.title}</h3>
                    </div>
                    <span className="status-badge">{item.startingPrice}</span>
                  </div>
                  <p>{item.promise}</p>
                  <div className="route-badges">
                    {item.tags.map((tag) => (
                      <span key={tag} className="status-badge">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link href={item.href} className="button button-secondary home-studio-link">
                    Explore
                  </Link>
                </article>
              ))}
            </div>

            <div className="home-studios-header home-studios-header--spaced">
              <p className="eyebrow">Five categories</p>
              <h2 className="font-display">Choose the lane</h2>
              <p className="route-summary">
                Keep the surface simple. The category labels do the organizing.
              </p>
            </div>

            <div className="category-grid">
              {HYPERMYTHS_CATEGORIES.map((category) => (
                <article key={category.id} className="surface-card category-card">
                  <div className="category-card-top">
                    <div>
                      <p className="eyebrow">{category.title}</p>
                      <h3>{category.title}</h3>
                      <p className="route-summary compact">{category.summary}</p>
                    </div>
                  </div>
                  <Link href={category.href} className="button button-secondary home-studio-link">
                    Open
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
