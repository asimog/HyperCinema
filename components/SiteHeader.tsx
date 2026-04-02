import Link from "next/link";

import { HYPERMYTHS_CATEGORIES } from "@/lib/hypermyths/content";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-nav">
        <Link href="/" className="site-brand">
          <span className="site-brand-kicker">HyperMyths.com</span>
          <span className="site-brand-title">HyperMyths</span>
        </Link>

        <nav className="nav-links">
          <Link className="nav-link" href="/">
            Home
          </Link>
          <Link className="nav-link" href="/trending">
            Trending
          </Link>
          {HYPERMYTHS_CATEGORIES.map((category) => (
            <Link key={category.id} className="nav-link" href={category.href}>
              {category.title}
            </Link>
          ))}
          <Link className="nav-link" href="/gallery">
            Gallery
          </Link>
          <Link className="nav-link" href="/admin/moderation">
            Cockpit
          </Link>
        </nav>
      </div>
    </header>
  );
}
