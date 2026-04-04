import Link from "next/link";
import { getDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

interface JobCard {
  jobId: string;
  subjectName: string | null;
  sourceMediaUrl: string | null;
  videoSeconds: number | null;
  requestKind: string | null;
  videoStyle: string | null;
  wallet: string | null;
  completedAt: any;
  status: string;
}

async function getLast8Jobs(): Promise<JobCard[]> {
  try {
    const db = getDb();
    const snapshot = await db
      .collection("jobs")
      .where("status", "==", "complete")
      .orderBy("completedAt", "desc")
      .limit(8)
      .get();

    return snapshot.docs.map(doc => ({
      jobId: doc.id,
      ...doc.data(),
    })) as JobCard[];
  } catch {
    return [];
  }
}

const CUSTOM_CREATORS = [
  {
    id: "mythx-eliza",
    title: "MythX Eliza",
    description: "Turn any X profile into an autobiographical video. AI scrapes 42 tweets and generates cinema.",
    href: "/MythX",
    icon: "🎬",
    gradient: "from-purple-600 to-pink-600",
    tag: "AI Agent",
  },
  {
    id: "hyperm",
    title: "HyperM Premium",
    description: "Premium creator cuts with 42 cinematic styles. Brand stories, trailers, and high-end productions.",
    href: "/HyperM",
    icon: "🎥",
    gradient: "from-cyan-600 to-blue-600",
    tag: "Premium",
  },
  {
    id: "hashmyth-scanner",
    title: "HashMyth Scanner",
    description: "Scan any token or wallet address. AI analyzes risk and generates a cinematic trading story.",
    href: "/HashMyth",
    icon: "🔍",
    gradient: "from-green-600 to-cyan-600",
    tag: "Scanner",
  },
  {
    id: "lovex",
    title: "LoveX Moments",
    description: "Family milestones, anniversaries, and keepsakes. Turn memories into cinematic videos.",
    href: "/LoveX",
    icon: "❤️",
    gradient: "from-red-600 to-pink-600",
    tag: "Family",
  },
  {
    id: "bedtime-stories",
    title: "Bedtime Stories",
    description: "AI-generated children's stories with audio. Perfect for family movie nights.",
    href: "/FamilyCinema",
    icon: "🌙",
    gradient: "from-indigo-600 to-purple-600",
    tag: "Kids",
  },
  {
    id: "music-video",
    title: "Music Videos",
    description: "Rhythm-led music visuals. Upload beats and let AI generate the video.",
    href: "/MusicVideo",
    icon: "🎵",
    gradient: "from-orange-600 to-red-600",
    tag: "Music",
  },
] as const;

const STYLE_LABELS: Record<string, string> = {
  trench_neon: "Trench Neon",
  hyperflow_assembly: "Hyperflow",
  vhs_cinema: "VHS Cinema",
  glass_signal: "Glass Signal",
  mythic_poster: "Mythic Poster",
  black_and_white_noir: "B&W Noir",
  trading_card: "Trading Card",
};

function shortWallet(wallet: string | null): string {
  if (!wallet) return "anonymous";
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export default async function TrendingPage() {
  const jobs = await getLast8Jobs();

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl space-y-10">
          {/* Hero */}
          <section className="panel trend-hero">
            <p className="eyebrow">Trending</p>
            <h1 className="font-display">Custom Video Creators.</h1>
            <p className="route-summary">
              Choose from AI agents, premium creators, and specialized tools. Each generates unique cinematic videos.
            </p>
          </section>

          {/* Custom Video Creators Grid */}
          <section>
            {/* Agent Callout */}
            <div className="surface-card panel p-4 mb-6 border border-purple-500/30">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🤖</div>
                <div className="flex-1">
                  <h3 className="font-semibold">Are you an AI Agent?</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Use x402 USDC to generate videos programmatically.{" "}
                    <Link href="/MythX" className="text-purple-400 underline">Start here →</Link>
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">🎨 Video Creators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CUSTOM_CREATORS.map(creator => (
                <Link
                  key={creator.id}
                  href={creator.href}
                  className="group surface-card panel p-6 hover:border-purple-500/50 transition-all"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${creator.gradient} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                    {creator.icon}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold group-hover:text-purple-400 transition-colors">
                      {creator.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                      {creator.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{creator.description}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Last 8 Videos */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">🎬 Latest 8 Videos</h2>
              <Link href="/gallery" className="text-purple-400 hover:text-purple-300 text-sm">
                View all →
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No videos yet. Be the first to create one!</p>
                <Link
                  href="/MythX"
                  className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold"
                >
                  Generate Video
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {jobs.map(job => (
                  <Link
                    key={job.jobId}
                    href={`/job/${job.jobId}`}
                    className="surface-card panel p-4 hover:border-purple-500/50 transition-all"
                  >
                    <div className="aspect-video bg-gray-800 rounded mb-3 flex items-center justify-center relative">
                      <span className="text-3xl">
                        {job.requestKind === "mythx" ? "🎬" :
                         job.requestKind === "token_video" ? "📊" :
                         job.requestKind === "bedtime_story" ? "🌙" :
                         job.requestKind === "music_video" ? "🎵" : "🎥"}
                      </span>
                      {job.videoSeconds && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono">
                          {job.videoSeconds}s
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium truncate">
                      {job.subjectName || shortWallet(job.wallet)}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{job.videoSeconds}s</span>
                      {job.videoStyle && (
                        <span className="px-2 py-0.5 bg-gray-700 rounded">
                          {STYLE_LABELS[job.videoStyle] || job.videoStyle}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
