import type { CinemaPageId } from "@/lib/cinema/config";

export type HyperMythsCategory = {
  id: CinemaPageId;
  title: string;
  summary: string;
  href: string;
};

export type TrendingSpotlight = {
  title: string;
  promise: string;
  category: string;
  tags: string[];
  startingPrice: string;
  href: string;
};

export const HYPERMYTHS_CATEGORIES: HyperMythsCategory[] = [
  {
    id: "funcinema",
    title: "FunMyths",
    summary: "Random and weird cinematic experiments with a playful edge.",
    href: "/FunCinema",
  },
  {
    id: "hashcinema",
    title: "HashMyths",
    summary: "Full-fledged options editor for polished, controlled outputs.",
    href: "/HashCinema",
  },
  {
    id: "trenchcinema",
    title: "TrenchMyths",
    summary: "Memecoin stories, wallets, and token-led cinematic drops.",
    href: "/TrenchCinema",
  },
  {
    id: "familycinema",
    title: "Family",
    summary: "Occasions, family photos, and private keepsakes with warmth.",
    href: "/FamilyCinema",
  },
  {
    id: "musicvideo",
    title: "Music",
    summary: "Music-led edits, remakes, and rhythm-first visual stories.",
    href: "/MusicVideo",
  },
];

export const TRENDING_SPOTLIGHTS: TrendingSpotlight[] = [
  {
    title: "Me & Waifu",
    promise: "Cute, chaotic, and highly shareable couple energy.",
    category: "TrenchMyths",
    tags: ["wallet", "romance", "public"],
    startingPrice: "0.004 SOL",
    href: "/TrenchCinema",
  },
  {
    title: "Birthday for Mom",
    promise: "Warm family celebration with a polished emotional finish.",
    category: "Family",
    tags: ["gift", "celebration", "private"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
  {
    title: "Old Family Photos to Video",
    promise: "Turn still memories into a moving keepsake.",
    category: "Family",
    tags: ["archive", "nostalgia", "story"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
  {
    title: "Anniversary Music Montage",
    promise: "A sentimental edit synced to the song that matters.",
    category: "Music",
    tags: ["music-led", "romantic", "montage"],
    startingPrice: "0.007 SOL",
    href: "/MusicVideo",
  },
  {
    title: "Sorry Video",
    promise: "Sincere, direct, and designed to land the apology cleanly.",
    category: "FunMyths",
    tags: ["private", "message", "short"],
    startingPrice: "1 USDC",
    href: "/FunCinema",
  },
  {
    title: "Kids Story",
    promise: "Gentle bedtime pacing with soft visuals and narration.",
    category: "Family",
    tags: ["kids", "voice", "safe"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
  {
    title: "Memorial Tribute",
    promise: "Respectful remembrance with a cinematic finish.",
    category: "Family",
    tags: ["tribute", "memory", "calm"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
];
