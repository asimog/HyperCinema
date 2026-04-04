// Gallery page client - search, filter, display job cards
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// Job card data from Firestore
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

// Style ID to human readable labels
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

// Job type to label mapping
const KIND_LABELS: Record<string, string> = {
  mythx: "MythX",
  token_video: "HashMyth",
  generic_cinema: "HyperM",
  bedtime_story: "Family",
  music_video: "Music",
  scene_recreation: "Recreator",
};

// Job type emoji icons
const KIND_ICONS: Record<string, string> = {
  mythx: "🎬",
  token_video: "📊",
  generic_cinema: "🎥",
  bedtime_story: "🌙",
  music_video: "🎵",
  scene_recreation: "🎭",
};

// Truncate wallet address for display
function shortWallet(wallet: string | null): string {
  if (!wallet) return "anonymous";
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Format timestamp to relative time
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

export default function GalleryPage({ jobs }: { jobs: JobCard[] }) {
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState("");

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const name = (job.subjectName || job.wallet || "").toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesKind = !filterKind || job.requestKind === filterKind;
      return matchesSearch && matchesKind;
    });
  }, [jobs, search, filterKind]);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">Gallery</p>
            <h1 className="font-display">All Generated Videos.</h1>
            <p className="route-summary">
              {jobs.length} videos generated. Browse the complete collection.
            </p>
          </section>

          {/* Search & Filter */}
          <div className="surface-card panel p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or wallet..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <select
                  value={filterKind}
                  onChange={(e) => setFilterKind(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Types</option>
                  {Object.entries(KIND_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-400 flex items-center">
                {filtered.length} of {jobs.length}
              </div>
            </div>
          </div>

          {/* Job Cards */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="text-6xl">🎬</div>
              <h2 className="text-2xl font-semibold text-gray-300">
                {jobs.length === 0 ? "No videos yet" : "No matches"}
              </h2>
              {jobs.length === 0 && (
                <>
                  <p className="text-gray-500">Generate your first video!</p>
                  <Link href="/MythX" className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold">
                    Create Video
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(job => (
                <Link
                  key={job.jobId}
                  href={`/job/${job.jobId}`}
                  className="surface-card panel p-4 hover:border-purple-500/50 transition-all group"
                >
                  <div className="aspect-video bg-gray-800 rounded mb-3 flex items-center justify-center relative overflow-hidden">
                    <span className="text-4xl group-hover:scale-125 transition-transform">
                      {KIND_ICONS[job.requestKind || ""] || "🎥"}
                    </span>
                    {job.videoSeconds && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono">
                        {job.videoSeconds}s
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-medium truncate group-hover:text-purple-400 transition-colors">
                      {job.subjectName || shortWallet(job.wallet)}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {job.requestKind && (
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                          {KIND_LABELS[job.requestKind] || job.requestKind}
                        </span>
                      )}
                      {job.videoStyle && (
                        <span className="px-2 py-0.5 bg-purple-900/50 rounded text-xs text-purple-300">
                          {STYLE_LABELS[job.videoStyle] || job.videoStyle}
                        </span>
                      )}
                    </div>
                    {job.completedAt && (
                      <p className="text-xs text-gray-500">{timeAgo(job.completedAt)}</p>
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
