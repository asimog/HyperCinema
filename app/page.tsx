import Link from "next/link";

import { CinemaConciergeChat } from "@/components/chat/CinemaConciergeChat";
import { GetPageIcon } from "@/components/ui/AppIcons";
import { HYPERMYTHS_HERO_CATEGORIES } from "@/lib/hypermyths/content";

const HERO_TONES = ["tone-0", "tone-1", "tone-5", "tone-gallery"] as const;

export default function HomePage() {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-4 text-[#f4efe8] md:px-6 md:py-6">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <section className="hero-quad-grid" id="hero-grid">
          {HYPERMYTHS_HERO_CATEGORIES.map((category, index) => {
            const HeroIcon = GetPageIcon(category.id);
            return (
            <Link
              key={category.id}
              href={category.href}
              className={`surface-card hero-quad-card ${HERO_TONES[index]}`}
            >
              <div className="hero-quad-card-inner">
                <div className="hero-quad-icon-row">
                  <HeroIcon className="hero-quad-icon" aria-hidden="true" />
                </div>
                <h2 className="font-display">{category.title}</h2>
                <p className="route-summary compact">{category.summary}</p>
              </div>
              <span className="hero-quad-cta" aria-hidden="true">
                Enter
              </span>
            </Link>
            );
          })}
        </section>
      </div>

      <section className="home-concierge-home home-concierge-home--full">
        <CinemaConciergeChat />
      </section>
    </div>
  );
}
