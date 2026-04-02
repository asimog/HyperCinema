import Link from "next/link";

import { HYPERMYTHS_HERO_CATEGORIES } from "@/lib/hypermyths/content";

export function SiteHeader() {
  const navItems = [
    { href: "/", label: "Home" },
    ...HYPERMYTHS_HERO_CATEGORIES.map((category) => ({
      href: category.href,
      label: category.title,
    })),
    { href: "/gallery", label: "Gallery" },
  ];

  return (
    <header className="site-header site-header--glass">
      <div className="site-nav">
        <Link href="/" className="site-brand">
          <span className="site-brand-title">HyperMythsX</span>
        </Link>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link key={item.href} className="nav-link" href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
