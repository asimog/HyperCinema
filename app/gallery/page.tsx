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
  sourceTranscript?: string;
}

async function getAllJobs(limit: number = 100): Promise<JobCard[]> {
  try {
    const db = getDb();
    const snapshot = await db
      .collection("jobs")
      .where("status", "==", "complete")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      jobId: doc.id,
      ...doc.data(),
    })) as JobCard[];
  } catch {
    return [];
  }
}

const STYLE_LABELS: Record<string, string> = {
  trench_neon: "Trench Neon",
  hyperflow_assembly: "Hyperflow",
  vhs_cinema: "VHS Cinema",
  glass_signal: "Glass Signal",
  mythic_poster: "Mythic Poster",
  black_and_white_noir: "B&W Noir",
  trading_card: "Trading Card",
  crt_anime_90s: "CRT Anime",
  cyberpunk_neon: "Cyberpunk",
  neon_tokyo_night: "Tokyo Night",
  double_exposure: "Double Exposure",
  glitch_digital: "Glitch Digital",
  found_footage_raw: "Found Footage",
  split_screen_diptych: "Split Screen",
  film_grain_70s: "70s Grain",
};

const KIND_LABELS: Record<string, string> = {
  mythx: "MythX",
  token_video: "HashMyth",
  generic_cinema: "HyperM",
  bedtime_story: "Family",
  music_video: "Music",
  scene_recreation: "Recreator",
};

const KIND_ICONS: Record<string, string> = {
  mythx: "🎬",
  token_video: "📊",
  generic_cinema: "🎥",
  bedtime_story: "🌙",
  music_video: "🎵",
  scene_recreation: "🎭",
};

function shortWallet(wallet: string | null): string {
  if (!wallet) return "anonymous";
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function timeAgo(timestamp: any): string {
  if (!timestamp) return "";
  try {
    const ms = timestamp.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export default async function GalleryPage() {
  const jobs = await getAllJobs(100);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl space-y-8">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">Gallery</p>
            <h1 className="font-display">All Generated Videos.</h1>
            <p className="route-summary">
              {jobs.length} videos generated across all creators. Browse the complete collection.
            </p>
          </section>

          {/* Job Cards Grid */}
          {jobs.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="text-6xl">🎬</div>
              <h2 className="text-2xl font-semibold text-gray-300">No videos yet</h2>
              <p className="text-gray-500">Generate your first video and it will appear here!</p>
              <Link
                href="/MythX"
                className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold"
              >
                Create Your First Video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {jobs.map(job => (
                <Link
                  key={job.jobId}
                  href={`/job/${job.jobId}`}
                  className="surface-card panel p-4 hover:border-purple-500/50 transition-all group"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-800 rounded mb-3 flex items-center justify-center relative overflow-hidden">
                    <span className="text-4xl group-hover:scale-125 transition-transform">
                      {KIND_ICONS[job.requestKind || ""] || "🎥"}
                    </span>
                    {/* Duration badge */}
                    {job.videoSeconds && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono">
                        {job.videoSeconds}s
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <h4 className="font-medium truncate group-hover:text-purple-400 transition-colors">
                      {job.subjectName || shortWallet(job.wallet)}
                    </h4>

                    <div className="flex flex-wrap gap-1">
                      {/* Kind badge */}
                      {job.requestKind && (
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                          {KIND_LABELS[job.requestKind] || job.requestKind}
                        </span>
                      )}
                      {/* Style badge */}
                      {job.videoStyle && (
                        <span className="px-2 py-0.5 bg-purple-900/50 rounded text-xs text-purple-300">
                          {STYLE_LABELS[job.videoStyle] || job.videoStyle}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    {job.completedAt && (
                      <p className="text-xs text-gray-500">
                        {timeAgo(job.completedAt)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
