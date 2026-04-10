// Creator Hub — 3 tools, all output 720p 1:1
import type { Metadata } from "next";
import Link from "next/link";
import { FilmIcon, HashIcon, SparkIcon } from "@/components/ui/AppIcons";

export const metadata: Metadata = {
  title: "Create — HyperMyths",
  description:
    "Generate AI videos from X profiles, wallets, or random prompts.",
};

const CREATOR_TOOLS = [
  {
    id: "mythx",
    href: "/creator/mythx",
    title: "MythX",
    summary: "Turn any X profile into a video",
    icon: FilmIcon,
    color: "from-purple-600/20 to-indigo-600/20",
    borderColor: "border-purple-500/30",
  },
  {
    id: "hashmyth",
    href: "/creator/hashmyth",
    title: "HashMyth",
    summary: "Turn a wallet or token into a video",
    icon: HashIcon,
    color: "from-cyan-600/20 to-teal-600/20",
    borderColor: "border-cyan-500/30",
  },
  {
    id: "random",
    href: "/creator/random",
    title: "Random",
    summary: "Generate a video from a random prompt",
    icon: SparkIcon,
    color: "from-pink-600/20 to-rose-600/20",
    borderColor: "border-pink-500/30",
  },
];

export default function CreatorHubPage() {
  return (
    <div className="cinema-shell min-h-[100dvh] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="panel trend-hero">
          <p className="eyebrow">Create</p>
          <h1 className="font-display">Pick a tool</h1>
          <p className="route-summary">
            All output is 720p · 1:1 · 30s · with sound.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CREATOR_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`surface-card panel p-6 bg-gradient-to-br ${tool.color} ${tool.borderColor} hover:scale-[1.02] transition-transform group`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="font-display text-lg">{tool.title}</h2>
                </div>

                <p className="text-sm text-gray-300 mb-5">{tool.summary}</p>

                <div className="text-sm text-purple-400 group-hover:text-purple-300 font-medium">
                  Create →
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
