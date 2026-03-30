import Link from "next/link";

import { CrossmintAuthButton } from "@/components/auth/CrossmintAuthButton";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-nav">
        <div className="site-nav-copy">
          <p className="eyebrow">HashArt.fun</p>
          <div className="site-nav-taglines">
            <p className="site-nav-tagline">HyperFlow interface assembly</p>
            <p className="site-nav-summary">
              Public cinema nodes, private cinema nodes, one shared compute and payment
              backbone.
            </p>
          </div>
        </div>

        <nav className="nav-links">
          <Link className="nav-link" href="/">
            Home
          </Link>
          <Link className="nav-link" href="/HashCinema">
            HashCinema
          </Link>
          <Link className="nav-link" href="/TrenchCinema">
            TrenchCinema
          </Link>
          <Link className="nav-link" href="/FunCinema">
            FunCinema
          </Link>
          <Link className="nav-link" href="/FamilyCinema">
            FamilyCinema
          </Link>
          <Link className="nav-link" href="/MusicVideo">
            MusicVideo
          </Link>
          <Link className="nav-link" href="/Recreator">
            Recreator
          </Link>
          <Link className="nav-link" href="/gallery">
            Gallery
          </Link>
          <Link className="nav-link" href="/login">
            Login
          </Link>
          <CrossmintAuthButton />
        </nav>
      </div>
    </header>
  );
}
