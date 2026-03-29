import { JobPackage, PackageType, VideoStyleId } from "@/lib/types/domain";

export type CinemaPageId =
  | "hashcinema"
  | "trenchcinema"
  | "funcinema"
  | "familycinema"
  | "musicvideo"
  | "recreator";

export interface CinemaPageConfig {
  id: CinemaPageId;
  route: string;
  title: string;
  eyebrow: string;
  summary: string;
  requestKind:
    | "generic_cinema"
    | "token_video"
    | "bedtime_story"
    | "music_video"
    | "scene_recreation";
  pricingMode: "public" | "private";
  visibility: "public" | "private";
  requiresAuth: boolean;
  subjectLabel: string;
  subjectPlaceholder: string;
  subjectDescriptionLabel: string;
  subjectDescriptionPlaceholder: string;
  defaultStyle: VideoStyleId;
  styleOptions: VideoStyleId[];
  defaultAudioEnabled: boolean;
  audioMode: "optional" | "required";
  supportsChain: boolean;
  themeTone: string;
  heroChips: string[];
}

const BASE_PACKAGE_META: Record<
  PackageType,
  Pick<JobPackage, "packageType" | "rangeDays" | "videoSeconds" | "enabled" | "label" | "subtitle">
> = {
  "1d": {
    packageType: "1d",
    rangeDays: 1,
    videoSeconds: 30,
    enabled: true,
    label: "30 sec",
    subtitle: "Fast assembly cut",
  },
  "2d": {
    packageType: "2d",
    rangeDays: 2,
    videoSeconds: 60,
    enabled: true,
    label: "60 sec",
    subtitle: "Full short-form sequence",
  },
  "3d": {
    packageType: "3d",
    rangeDays: 3,
    videoSeconds: 90,
    enabled: false,
    label: "90 sec",
    subtitle: "Legacy package",
  },
};

const PUBLIC_SOL_PRICES: Record<PackageType, number> = {
  "1d": 0.004,
  "2d": 0.007,
  "3d": 0.04,
};

const PRIVATE_SOL_PRICES: Record<PackageType, number> = {
  "1d": 0.04,
  "2d": 0.07,
  "3d": 0.4,
};

const PUBLIC_USDC_PRICES: Record<PackageType, number> = {
  "1d": 1,
  "2d": 2,
  "3d": 5,
};

const PRIVATE_USDC_PRICES: Record<PackageType, number> = {
  "1d": 10,
  "2d": 17,
  "3d": 40,
};

export function getCinemaPackageConfig(input: {
  packageType: PackageType;
  pricingMode: "public" | "private";
}): JobPackage {
  const base = BASE_PACKAGE_META[input.packageType];
  const solPrices =
    input.pricingMode === "private" ? PRIVATE_SOL_PRICES : PUBLIC_SOL_PRICES;
  const usdcPrices =
    input.pricingMode === "private" ? PRIVATE_USDC_PRICES : PUBLIC_USDC_PRICES;

  return {
    ...base,
    priceSol: solPrices[input.packageType],
    priceUsdc: usdcPrices[input.packageType],
  };
}

export const CINEMA_PACKAGE_TYPES = ["1d", "2d"] as const satisfies readonly PackageType[];

export const CINEMA_PAGE_CONFIGS: Record<CinemaPageId, CinemaPageConfig> = {
  hashcinema: {
    id: "hashcinema",
    route: "/HashCinema",
    title: "HashCinema",
    eyebrow: "Public Generate",
    summary:
      "Generic visual cinema generation for any topic, brand, meme, or story. Silent by default, with optional lyrics-driven audio planning.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Project title",
    subjectPlaceholder: "HashArt teaser, launch short, or concept trailer",
    subjectDescriptionLabel: "Core idea",
    subjectDescriptionPlaceholder:
      "What is this piece about in one or two sentences?",
    defaultStyle: "hyperflow_assembly",
    styleOptions: ["hyperflow_assembly", "glass_signal", "mythic_poster"],
    defaultAudioEnabled: false,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "clean control-room cinema for general stories",
    heroChips: ["public", "no sound by default", "lyrics optional"],
  },
  trenchcinema: {
    id: "trenchcinema",
    route: "/TrenchCinema",
    title: "TrenchCinema",
    eyebrow: "Public Generate",
    summary:
      "Memecoin-focused video generation for Solana, Ethereum, BNB Chain, and Base. Token metadata stays the source of truth and sound remains optional.",
    requestKind: "token_video",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Token address",
    subjectPlaceholder: "Paste a mint or contract address",
    subjectDescriptionLabel: "Extra memecoin direction",
    subjectDescriptionPlaceholder:
      "Optional note about the token mood, community angle, or final scene.",
    defaultStyle: "trench_neon",
    styleOptions: [
      "trench_neon",
      "hyperflow_assembly",
      "trading_card",
      "glass_signal",
      "mythic_poster",
    ],
    defaultAudioEnabled: false,
    audioMode: "optional",
    supportsChain: true,
    themeTone: "memecoin trenches, chart glow, and token mythology",
    heroChips: ["public", "multichain", "metadata-first"],
  },
  funcinema: {
    id: "funcinema",
    route: "/FunCinema",
    title: "FunCinema",
    eyebrow: "Private Login",
    summary:
      "Private generation studio for playful topics, scripts, and reference-driven experiments. Login gates the private gallery and private pricing applies.",
    requestKind: "generic_cinema",
    pricingMode: "private",
    visibility: "private",
    requiresAuth: true,
    subjectLabel: "Project title",
    subjectPlaceholder: "Private campaign, meme short, or internal concept",
    subjectDescriptionLabel: "Core idea",
    subjectDescriptionPlaceholder:
      "Describe the topic, tone, or internal joke to preserve.",
    defaultStyle: "glass_signal",
    styleOptions: ["glass_signal", "hyperflow_assembly", "mythic_poster"],
    defaultAudioEnabled: false,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "private sandbox for sharper, weirder creative loops",
    heroChips: ["private", "login required", "private gallery"],
  },
  familycinema: {
    id: "familycinema",
    route: "/FamilyCinema",
    title: "FamilyCinema",
    eyebrow: "Private Login",
    summary:
      "Bedtime story generation for families. Parents can paste the story seed, narration stays on, and the soundtrack stays very light and classical.",
    requestKind: "bedtime_story",
    pricingMode: "private",
    visibility: "private",
    requiresAuth: true,
    subjectLabel: "Story title",
    subjectPlaceholder: "Moon rabbit, lighthouse train, or sleepy forest parade",
    subjectDescriptionLabel: "Parent story seed",
    subjectDescriptionPlaceholder:
      "Paste the bedtime story, characters, or scene outline you want adapted.",
    defaultStyle: "mythic_poster",
    styleOptions: ["mythic_poster", "glass_signal", "hyperflow_assembly"],
    defaultAudioEnabled: true,
    audioMode: "required",
    supportsChain: false,
    themeTone: "soft bedtime cinema with narration and gentle musical lift",
    heroChips: ["private", "voice always on", "parent-paste story"],
  },
  musicvideo: {
    id: "musicvideo",
    route: "/MusicVideo",
    title: "MusicVideo",
    eyebrow: "Public Generate",
    summary:
      "Build a trailer-first music video from an embedded source, pasted lyrics, or pulled subtitles. Playback stays inside the embed while the render queue builds the visual cut.",
    requestKind: "music_video",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Track or concept title",
    subjectPlaceholder: "Song title, artist, or campaign name",
    subjectDescriptionLabel: "Music video brief",
    subjectDescriptionPlaceholder:
      "Paste the song mood, visual concept, chorus moments, or pacing notes.",
    defaultStyle: "glass_signal",
    styleOptions: ["glass_signal", "hyperflow_assembly", "mythic_poster"],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "embed-first music trailer studio with lyric-driven cuts",
    heroChips: ["public", "embed-first", "story cards"],
  },
  recreator: {
    id: "recreator",
    route: "/Recreator",
    title: "Recreator",
    eyebrow: "Public Generate",
    summary:
      "Pull dialogue or subtitles from a source video, turn them into story cards, and recreate the scenes as a trailer-grade reinterpretation.",
    requestKind: "scene_recreation",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Scene or trailer title",
    subjectPlaceholder: "Original scene, trailer, or sequence title",
    subjectDescriptionLabel: "Recreation brief",
    subjectDescriptionPlaceholder:
      "Describe what must stay, what should change, and how intense the remake should feel.",
    defaultStyle: "hyperflow_assembly",
    styleOptions: ["hyperflow_assembly", "trench_neon", "mythic_poster"],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "dialogue-led recreation studio with screenshot adapter hooks",
    heroChips: ["public", "subtitle-driven", "next-step sequels"],
  },
};
