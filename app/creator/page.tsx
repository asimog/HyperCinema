// Creator Hub — Media creator with 3 tools
import type { Metadata } from "next";
import Link from "next/link";
import { FilmIcon, HashIcon, SparkIcon } from "@/components/ui/AppIcons";

export const metadata: Metadata = {
  title: "Creator Hub — HyperCinema",
  description: "Generate cinematic videos with AI. MythX, HashMyth, and Random video tools.",
};

const CREATOR_TOOLS = [
  {
    id: "mythx",
    href: "/creator/mythx",
    title: "MythX",
    summary: "Turn any X profile into an autobiography video",
    icon: FilmIcon,
    specs: "16:9 · 720p · With Sound",
    color: "from-purple-600/20 to-indigo-600/20",
    borderColor: "border-purple-500/30",
  },
  {
    id: "hashmyth",
    href: "/creator/hashmyth",
    title: "HashMyth",
    summary: "Scan a wallet or memecoin and generate cinematic cinema",
    icon: HashIcon,
    specs: "16:9 or 1:1 · 720p · With Sound",
    color: "from-cyan-600/20 to-teal-600/20",
    borderColor: "border-cyan-500/30",
  },
  {
    id: "random",
    href: "/creator/random",
    title: "Random",
    summary: "Generate a random TikTok-style video, no input needed",
    icon: SparkIcon,
    specs: "9:16 · 1080p · TikTok Style",
    color: "from-pink-600/20 to-rose-600/20",
    borderColor: "border-pink-500/30",
  },
];

export default function CreatorHubPage() {
  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">Creator Hub</p>
            <h1 className="font-display">What do you want to create?</h1>
            <p className="route-summary">
              Three AI-powered tools. Pick one and start generating. Free to use.
            </p>
          </section>

          {/* Tool Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREATOR_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className={`surface-card panel p-6 bg-gradient-to-br ${tool.color} ${tool.borderColor} hover:scale-[1.02] transition-transform group`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h2 className="font-display text-xl">{tool.title}</h2>
                  </div>

                  <p className="text-sm text-gray-300 mb-4">{tool.summary}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tool.specs.split(" · ").map((spec) => (
                      <span
                        key={spec}
                        className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-400"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm text-purple-400 group-hover:text-purple-300 font-medium">
                    Start creating →
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Rate Limits Info */}
          <section className="surface-card panel p-5">
            <h3 className="font-semibold text-lg mb-3">Daily Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-purple-400 font-medium">MythX:</span>
                <span className="text-gray-400 ml-2">2 videos per profile / day</span>
              </div>
              <div>
                <span className="text-cyan-400 font-medium">HashMyth:</span>
                <span className="text-gray-400 ml-2">2 per wallet, 10 per contract / day</span>
              </div>
              <div>
                <span className="text-pink-400 font-medium">Random:</span>
                <span className="text-gray-400 ml-2">5 per IP / day</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
