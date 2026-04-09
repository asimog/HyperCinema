// Site footer — global
"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <span>HyperMyths</span>
          <span className="footer-divider">·</span>
          <a
            href="https://hypermyths.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            hypermyths.com
          </a>
        </div>
        <nav className="footer-nav">
          <Link href="/terms" className="footer-nav-link">Terms</Link>
          <Link href="/privacy" className="footer-nav-link">Privacy</Link>
          <a
            href="https://x.com/HyperMythX"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-nav-link"
          >
            @HyperMythsX
          </a>
        </nav>
      </div>
    </footer>
  );
}
