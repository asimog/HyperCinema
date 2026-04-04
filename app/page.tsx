import Link from "next/link";

import { CinemaConciergeChat } from "@/components/chat/CinemaConciergeChat";
import { GetPageIcon } from "@/components/ui/AppIcons";

const MAIN_PAGES = [
  {
    id: "mythx" as const,
    href: "/MythX",
    title: "MythX",
    summary: "Autobiographical cinema from 42 tweets. Powered by ElizaOS AI.",
  },
  {
    id: "hyperm" as const,
    href: "/HyperM",
    title: "HyperM",
    summary: "Premium creator cuts. Brand stories, cinematic trailers.",
  },
  {
    id: "hashmyth" as const,
    href: "/HashMyth",
    title: "HashMyth",
    summary: "Token & wallet scanner. Turn any contract into a trading story.",
  },
  {
    id: "trending" as const,
    href: "/trending",
    title: "Trending",
    summary: "Discover custom video creators. Browse the latest 8 generations.",
  },
] as const;

const TONE_CLASSES = ["tone-0", "tone-1", "tone-5", "tone-gallery"] as const;

const HOW_IT_WORKS = [
  { step: "1", title: "Choose Your Story", desc: "Pick MythX for tweets, HashMyth for tokens, or HyperM for premium cinema." },
  { step: "2", title: "Describe or Scan", desc: "Enter an X handle, paste a token address, or write your creative brief." },
  { step: "3", title: "Pick a Style", desc: "From VHS Cinema to Cyberpunk — choose the cinematic look that fits." },
  { step: "4", title: "Pay & Generate", desc: "Pay with SOL or USDC via x402. AI generates your video in minutes." },
];

function HeroIcon({ id }: { id: string }) {
  const Icon = GetPageIcon(id as any);
  return <Icon className="hero-quad-icon" aria-hidden="true" />;
}

export default function HomePage() {
  return (
    <div className="cinema-shell cinema-noise home-landing-shell min-h-[100dvh] overflow-hidden px-4 py-4 text-[#f4efe8] md:px-6 md:py-6">
      <main className="home-home-rail">
        <section className="home-stage home-stage--landing" aria-labelledby="hero-grid">
          <div className="home-stage-backdrop" aria-hidden="true" />

          <div className="home-stage-content">
            {/* Hero Cards */}
            <section className="hero-quad-grid" id="hero-grid">
              {MAIN_PAGES.map((page, index) => (
                <Link
                  key={page.id}
                  href={page.href}
                  className={`surface-card hero-quad-card ${TONE_CLASSES[index]}`}
                >
                  <div className="hero-quad-card-inner">
                    <div className="hero-quad-title-row">
                      <HeroIcon id={page.id} />
                      <h2 className="font-display">{page.title}</h2>
                    </div>
                    <p className="route-summary compact">{page.summary}</p>
                  </div>
                </Link>
              ))}
            </section>

            {/* How It Works */}
            <section className="panel mt-8" aria-labelledby="how-it-works">
              <div className="panel-header">
                <p className="eyebrow">How It Works</p>
                <h2 id="how-it-works" className="font-display">Four steps to your video.</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                {HOW_IT_WORKS.map((item) => (
                  <div key={item.step} className="surface-card panel p-4">
                    <div className="text-3xl font-bold text-purple-400 mb-2">{item.step}</div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Agent Callout */}
            <section className="surface-card panel p-6 mt-4 border border-purple-500/30">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🤖</div>
                <div>
                  <h3 className="font-semibold text-lg">Are you an AI Agent?</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Use x402 USDC payments to generate videos programmatically.{" "}
                    <Link href="/MythX" className="text-purple-400 underline">
                      Start here →
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="home-concierge-home">
          <CinemaConciergeChat />
        </section>
      </main>
    </div>
  );
}
