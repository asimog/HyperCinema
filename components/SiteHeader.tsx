// Site header - main navigation bar
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  FilmIcon,
  HomeIcon,
  TrendingIcon,
  GetPageIcon,
} from "@/components/ui/AppIcons";

// Navigation items shown in header
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/MythX", label: "MythX", iconId: "mythx" },
  { href: "/HyperM", label: "HyperM", iconId: "hyperm" },
  { href: "/HashMyth", label: "HashMyth", iconId: "hashmyth" },
  { href: "/trending", label: "Trending" },
  { href: "/gallery", label: "Gallery" },
];

// Header component with desktop and mobile nav
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header site-header--glass">
      <div className="site-nav">
        {/* Brand logo and name */}
        <Link href="/" className="site-brand">
          <FilmIcon className="site-brand-icon" aria-hidden="true" />
          <span className="site-brand-title">HyperMyths</span>
        </Link>

        {/* Desktop navigation links */}
        <nav className="nav-links hidden md:flex">
          {NAV_ITEMS.map((item) => {
            const Icon = item.iconId ? GetPageIcon(item.iconId as any) : TrendingIcon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`nav-link${isActive ? " nav-link-active" : ""}`}
                href={item.href}
              >
                <Icon className="nav-link-icon" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile navigation - horizontal scroll */}
        <nav className="nav-links md:hidden flex overflow-x-auto gap-1 pb-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.iconId ? GetPageIcon(item.iconId as any) : TrendingIcon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`nav-link whitespace-nowrap${isActive ? " nav-link-active" : ""}`}
                href={item.href}
              >
                <Icon className="nav-link-icon" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
