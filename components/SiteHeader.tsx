"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  FilmIcon,
  HomeIcon,
  GetPageIcon,
  TrendingIcon,
} from "@/components/ui/AppIcons";
import { HYPERMYTHS_HERO_CATEGORIES } from "@/lib/hypermyths/content";

export function SiteHeader() {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Home", icon: HomeIcon },
    ...HYPERMYTHS_HERO_CATEGORIES.map((category) => ({
      href: category.href,
      label: category.title,
      icon: GetPageIcon(category.id),
    })),
    { href: "/trending", label: "Trending", icon: TrendingIcon },
  ];

  return (
    <header className="site-header site-header--glass">
      <div className="site-nav">
        <Link href="/" className="site-brand">
          <FilmIcon className="site-brand-icon" aria-hidden="true" />
          <span className="site-brand-title">HyperMyths</span>
        </Link>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${pathname === item.href ? " nav-link-active" : ""}`}
              href={item.href}
            >
              <item.icon className="nav-link-icon" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
