// Gallery page client - TikTok-style vertical feed with search and filter
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

// Job card data from server
interface JobCard {
  jobId: string;
  subjectName: string | null;
  sourceMediaUrl: string | null;
  videoSeconds: number | null;
  requestKind: string | null;
  videoStyle: string | null;
  wallet: string | null;
  createdAt: Date | string | null;
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

// Filter types matching the new creator tools
const FILTER_TYPES = [
  { key: "", label: "All", emoji: "" },
  { key: "mythx", label: "MythX", emoji: "🎬" },
  { key: "token_video", label: "HashMyth", emoji: "📊" },
  { key: "random", label: "Random", emoji: "🎲" },
] as const;

// Job type to label mapping
const KIND_LABELS: Record<string, string> = {
  mythx: "MythX",
  token_video: "HashMyth",
  generic_cinema: "HyperM",
  bedtime_story: "Family",
  music_video: "Music",
  scene_recreation: "Recreator",
  random: "Random",
};

// Job type emoji icons
const KIND_ICONS: Record<string, string> = {
  mythx: "🎬",
  token_video: "📊",
  generic_cinema: "🎥",
  bedtime_story: "🌙",
  music_video: "🎵",
  scene_recreation: "🎭",
  random: "🎲",
};

// Truncate wallet address for display
function shortWallet(wallet: string | null): string {
  if (!wallet) return "anonymous";
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Format timestamp to relative time
function timeAgo(timestamp: Date | string | null | undefined): string {
  if (!timestamp) return "";
  try {
    const ms =
      typeof timestamp === "object" && timestamp !== null
        ? timestamp instanceof Date
          ? timestamp.getTime()
          : (timestamp as { toMillis: () => number }).toMillis()
        : new Date(timestamp).getTime();
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
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const name = (job.subjectName || job.wallet || "").toLowerCase();
      const matchesSearch = !search || name.includes(search.toLowerCase());
      const matchesKind = !filterKind || job.requestKind === filterKind;
      return matchesSearch && matchesKind;
    });
  }, [jobs, search, filterKind]);

  // Scroll to active video
  useEffect(() => {
    if (feedRef.current) {
      const activeEl = feedRef.current.querySelector(
        `[data-index="${activeIndex}"]`,
      );
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && activeIndex < filtered.length - 1) {
        e.preventDefault();
        setActiveIndex((i) => i + 1);
      } else if (e.key === "ArrowUp" && activeIndex > 0) {
        e.preventDefault();
        setActiveIndex((i) => i - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, filtered.length]);

  // Intersection observer for auto-scroll detection
  useEffect(() => {
    if (!feedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: feedRef.current, threshold: 0.6 },
    );

    const cards = feedRef.current.querySelectorAll("[data-index]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [filtered]);

  const handleScrollToIndex = useCallback((index: number) => {
    setActiveIndex(index);
    if (feedRef.current) {
      const el = feedRef.current.querySelector(`[data-index="${index}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8]">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">Gallery</p>
            <h1 className="font-display">All Generated Videos.</h1>
            <p className="route-summary">
              {jobs.length} videos generated. Browse the complete collection.
            </p>
          </section>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TYPES.map((ft) => (
              <button
                key={ft.key}
                onClick={() => setFilterKind(ft.key)}
                className={`surface-card inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                  filterKind === ft.key
                    ? "border-purple-500/50 text-purple-300 bg-purple-500/10"
                    : "text-gray-400 hover:text-white hover:border-gray-600"
                }`}
              >
                {ft.emoji && <span>{ft.emoji}</span>}
                {ft.label}
              </button>
            ))}
            <div className="ml-auto text-sm text-gray-500 flex items-center">
              {filtered.length} of {jobs.length}
            </div>
          </div>

          {/* Search */}
          <div className="surface-card panel p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or wallet..."
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
            />
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="text-6xl">🎬</div>
              <h2 className="text-2xl font-semibold text-gray-300">
                {jobs.length === 0 ? "No videos yet" : "No matches"}
              </h2>
              {jobs.length === 0 && (
                <>
                  <p className="text-gray-500">Generate your first video!</p>
                  <Link
                    href="/creator"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    Go to Creator
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* TikTok-style vertical feed (left 2 cols) */}
              <div className="lg:col-span-2">
                <div
                  ref={feedRef}
                  className="space-y-4 max-h-[70vh] overflow-y-auto scroll-smooth snap-y snap-mandatory"
                >
                  {filtered.map((job, index) => (
                    <div
                      key={job.jobId}
                      data-index={index}
                      className="surface-card panel p-4 snap-start scroll-mt-4 transition-all"
                    >
                      <Link href={`/job/${job.jobId}`} className="block">
                        {/* Video / Placeholder */}
                        <div className="aspect-video bg-gray-800/50 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden group">
                          <span className="text-5xl group-hover:scale-110 transition-transform">
                            {KIND_ICONS[job.requestKind || ""] || "🎥"}
                          </span>
                          {job.videoSeconds && (
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono">
                              {job.videoSeconds}s
                            </div>
                          )}
                          {/* Type badge */}
                          {job.requestKind && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded-lg text-xs text-gray-300">
                              {KIND_LABELS[job.requestKind] || job.requestKind}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium truncate text-sm">
                            {job.subjectName || shortWallet(job.wallet)}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {job.requestKind && (
                              <span className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-400">
                                {KIND_LABELS[job.requestKind] ||
                                  job.requestKind}
                              </span>
                            )}
                            {job.videoStyle && (
                              <span className="px-2 py-0.5 bg-purple-900/40 rounded text-xs text-purple-400">
                                {STYLE_LABELS[job.videoStyle] || job.videoStyle}
                              </span>
                            )}
                          </div>
                        </div>
                        {job.createdAt && (
                          <span className="text-xs text-gray-500 shrink-0">
                            {timeAgo(job.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar — quick nav (right col) */}
              <div className="hidden lg:block">
                <div className="surface-card panel p-4 sticky top-24">
                  <h3 className="font-semibold text-sm mb-3">
                    Quick Navigation
                  </h3>
                  <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                    {filtered.map((job, index) => (
                      <button
                        key={job.jobId}
                        onClick={() => handleScrollToIndex(index)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all truncate ${
                          index === activeIndex
                            ? "bg-purple-500/20 text-purple-300"
                            : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="mr-2">
                          {KIND_ICONS[job.requestKind || ""] || "🎥"}
                        </span>
                        {job.subjectName || shortWallet(job.wallet)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Use ↑↓ keys or scroll to navigate
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
