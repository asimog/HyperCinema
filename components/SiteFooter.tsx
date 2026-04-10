// Site footer — global
"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links">
        <Link href="/terms" className="footer-nav-link">
          Terms
        </Link>
        <span className="footer-sep">·</span>
        <Link href="/privacy" className="footer-nav-link">
          Privacy
        </Link>
        <span className="footer-sep">·</span>
        <a
          href="https://x.com/HyperMythX"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-nav-link"
        >
          @HyperMythsX
        </a>
      </nav>
    </footer>
  );
}
