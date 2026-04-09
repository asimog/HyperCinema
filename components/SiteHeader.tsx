// Site header - main navigation bar
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { FilmIcon, HomeIcon, TrendingIcon } from "@/components/ui/AppIcons";

// 3-page navigation
const NAV_ITEMS = [
  { href: "/", label: "HyperM", Icon: HomeIcon },
  { href: "/creator", label: "MythOS", Icon: FilmIcon },
  { href: "/autonomous", label: "Autonomous", Icon: TrendingIcon },
];

// Header component
export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop header - floating */}
      <header className="site-header site-header--glass hidden md:block">
        <div className="site-nav">
          {/* Brand logo and name */}
          <Link href="/" className="site-brand">
            <FilmIcon className="site-brand-icon" aria-hidden="true" />
            <span className="site-brand-title">HyperCinema</span>
          </Link>

          {/* Desktop navigation links */}
          <nav className="nav-links">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  className={`nav-link${isActive ? " nav-link-active" : ""}`}
                  href={item.href}
                >
                  <item.Icon className="nav-link-icon" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile header - integrated, no floating nav */}
      <header className="site-header-mobile md:hidden">
        <div className="site-header-mobile-inner">
          <Link href="/" className="site-brand-mobile">
            <FilmIcon className="site-brand-icon-mobile" aria-hidden="true" />
            <span className="site-brand-title-mobile">HyperCinema</span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span
              className={`mobile-menu-toggle-line ${mobileMenuOpen ? "open" : ""}`}
            />
            <span
              className={`mobile-menu-toggle-line ${mobileMenuOpen ? "open" : ""}`}
            />
            <span
              className={`mobile-menu-toggle-line ${mobileMenuOpen ? "open" : ""}`}
            />
          </button>
        </div>

        {/* Mobile menu - integrated into page flow */}
        {mobileMenuOpen && (
          <nav className="mobile-menu">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  className={`mobile-menu-link${isActive ? " mobile-menu-link-active" : ""}`}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.Icon
                    className="mobile-menu-link-icon"
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>
    </>
  );
}
