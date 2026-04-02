import Link from "next/link";

import { HYPERMYTHS_CATEGORIES, TRENDING_SPOTLIGHTS } from "@/lib/hypermyths/content";

export default function TrendingPage() {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="panel trend-hero">
          <p className="eyebrow">Trending</p>
          <h1 className="font-display">The most clickable cinematic ideas right now.</h1>
          <p className="route-summary">
            Faster, cheaper packaged concepts with a cleaner promise and a stronger opening hook.
          </p>
        </section>

        <section className="trend-grid">
          {TRENDING_SPOTLIGHTS.map((item) => (
            <article key={item.title} className="surface-card trend-card trend-card--featured">
              <div className="trend-card-top">
                <div>
                  <p className="eyebrow">{item.category}</p>
                  <h2>{item.title}</h2>
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
              <Link href={item.href} className="button button-primary">
                Open category
              </Link>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Categories</p>
              <h2>Five lanes, one brand</h2>
            </div>
          </div>
          <div className="category-grid">
            {HYPERMYTHS_CATEGORIES.map((category) => (
              <article key={category.id} className="surface-card category-card">
                <div>
                  <p className="eyebrow">{category.title}</p>
                  <p className="route-summary compact">{category.summary}</p>
                </div>
                <Link href={category.href} className="button button-secondary home-studio-link">
                  Open
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
