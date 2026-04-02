import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-nav">
        <Link href="/" className="site-brand">
          <span className="site-brand-kicker">HashArt.fun</span>
          <span className="site-brand-title">HyperCinema</span>
        </Link>

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
          <Link className="nav-link" href="/admin/moderation">
            Cockpit
          </Link>
        </nav>
      </div>
    </header>
  );
}
