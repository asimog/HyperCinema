import { HYPERMYTHX_STYLE_PRESETS } from "@/lib/memecoins/styles";
import {
  DEFAULT_HYPERM_STYLE_ID,
  HYPERM_STYLE_IDS,
} from "@/lib/hyperm/styles";
import { JobPackage, PackageType, VideoStyleId } from "@/lib/types/domain";

export type CinemaPageId =
  | "hypercinema"
  | "hyperm"
  | "mythx"
  | "trenchcinema"
  | "funcinema"
  | "familycinema"
  | "musicvideo"
  | "recreator"
  | "hashmyth"
  | "lovex";

export interface CinemaPageConfig {
  id: CinemaPageId;
  route: string;
  title: string;
  eyebrow: string;
  summary: string;
  requestKind:
    | "generic_cinema"
    | "mythx"
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
  "1d": 0.004,
  "2d": 0.007,
  "3d": 0.04,
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
  hypercinema: {
    id: "hypercinema",
    route: "/HyperCinema",
    title: "HyperMyths",
    eyebrow: "Create",
    summary:
      "A cinematic studio for launches, concepts, and polished short-form films.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Title",
    subjectPlaceholder: "Launch short, concept, or trailer",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "What should this video do?",
    defaultStyle: "hyperflow_assembly",
    styleOptions: HYPERMYTHX_STYLE_PRESETS.map((preset) => preset.id),
    defaultAudioEnabled: false,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "clean, precise filmmaking for ideas that need a strong reveal",
    heroChips: ["public", "30 or 60 sec", "audio optional"],
  },
  hyperm: {
    id: "hyperm",
    route: "/HyperM",
    title: "HyperM",
    eyebrow: "Create",
    summary:
      "Premium concept films, creator trailers, and campaign-ready short cuts.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Title",
    subjectPlaceholder: "Launch short, concept trailer, or creator cut",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "What should this video do?",
    defaultStyle: DEFAULT_HYPERM_STYLE_ID,
    styleOptions: HYPERM_STYLE_IDS,
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "a premium creator studio for bold launches, trailers, and brand storytelling",
    heroChips: ["premium cuts", "audio on", "public"],
  },
  mythx: {
    id: "mythx",
    route: "/MythX",
    title: "MythX",
    eyebrow: "Create",
    summary:
      "Turn the last 42 tweets from an X profile into a sharp cinematic autobiography.",
    requestKind: "mythx",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "X profile",
    subjectPlaceholder: "https://x.com/username or @username",
    subjectDescriptionLabel: "Angle",
    subjectDescriptionPlaceholder:
      "What should the story reveal?",
    defaultStyle: "hyperflow_assembly",
    styleOptions: [
      "hyperflow_assembly",
      "vhs_cinema",
      "black_and_white_noir",
      "double_exposure",
      "glitch_digital",
      "found_footage_raw",
      "split_screen_diptych",
      "film_grain_70s",
    ],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "public signals shaped into a cinematic life story",
    heroChips: ["X profile", "42 tweets", "no title required"],
  },
  trenchcinema: {
    id: "trenchcinema",
    route: "/TrenchCinema",
    title: "TrenchMyths",
    eyebrow: "Create",
    summary:
      "Fast token stories and wallet-led trailers across major chains.",
    requestKind: "token_video",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Address",
    subjectPlaceholder: "Paste a mint or contract",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "Mood, angle, or final image.",
    defaultStyle: "trench_neon",
    styleOptions: [
      "trench_neon",
      "hyperflow_assembly",
      "trading_card",
      "glass_signal",
      "mythic_poster",
    ],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: true,
    themeTone: "internet-speed token storytelling with chart energy and strong momentum",
    heroChips: ["multichain", "audio on", "public"],
  },
  funcinema: {
    id: "funcinema",
    route: "/FunCinema",
    title: "FunMyths",
    eyebrow: "Create",
    summary:
      "Playful short-form films built for internet energy and quick sharing.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Title",
    subjectPlaceholder: "Campaign, meme short, or concept",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "Topic, tone, or joke to preserve.",
    defaultStyle: "glass_signal",
    styleOptions: ["glass_signal", "hyperflow_assembly", "mythic_poster"],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "fast, weird, and entertaining creative experiments",
    heroChips: ["shareable", "audio on", "public"],
  },
  familycinema: {
    id: "familycinema",
    route: "/FamilyCinema",
    title: "Family",
    eyebrow: "Create",
    summary:
      "Warm cinematic keepsakes for family moments, milestones, and celebrations.",
    requestKind: "bedtime_story",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Title",
    subjectPlaceholder: "Moon rabbit, lighthouse train, or sleepy parade",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "Story, characters, or outline.",
    defaultStyle: "mythic_poster",
    styleOptions: ["mythic_poster", "glass_signal", "hyperflow_assembly"],
    defaultAudioEnabled: true,
    audioMode: "required",
    supportsChain: false,
    themeTone: "gentle family storytelling with warmth, clarity, and emotional lift",
    heroChips: ["family-safe", "guided story", "audio included"],
  },
  musicvideo: {
    id: "musicvideo",
    route: "/MusicVideo",
    title: "Music",
    eyebrow: "Create",
    summary:
      "Rhythm-led visuals built around the track, artist, or campaign.",
    requestKind: "music_video",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Title",
    subjectPlaceholder: "Song, artist, or campaign",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "Song mood, visual idea, or pacing notes.",
    defaultStyle: "glass_signal",
    styleOptions: ["glass_signal", "hyperflow_assembly", "mythic_poster"],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "music-led editing built for pace, feeling, and replay value",
    heroChips: ["music-led", "audio on", "public"],
  },
  recreator: {
    id: "recreator",
    route: "/Recreator",
    title: "Recreator",
    eyebrow: "Create",
    summary:
      "Rebuild a source scene or trailer as a fresh cinematic reinterpretation.",
    requestKind: "scene_recreation",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Title",
    subjectPlaceholder: "Scene, trailer, or sequence",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "What stays, what changes, and how it should feel.",
    defaultStyle: "hyperflow_assembly",
    styleOptions: ["hyperflow_assembly", "trench_neon", "mythic_poster"],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "scene remakes and reinterpretations with a clear visual point of view",
    heroChips: ["source-based", "audio on", "public"],
  },
  hashmyth: {
    id: "hashmyth",
    route: "/HashMyth",
    title: "HashMyth",
    eyebrow: "Create",
    summary:
      "Turn any token or wallet into a cinematic trading story with real momentum.",
    requestKind: "token_video",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Address",
    subjectPlaceholder: "Paste a token, contract, or wallet",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "Win, loss, hold, and energy.",
    defaultStyle: "trench_neon",
    styleOptions: [
      "trench_neon",
      "hyperflow_assembly",
      "trading_card",
      "glass_signal",
      "mythic_poster",
      "crt_anime_90s",
      "glitch_digital",
      "cyberpunk_neon",
      "neon_tokyo_night",
      "infrared_thermal",
    ],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: true,
    themeTone: "wallets, memes, and trading-floor adrenaline shaped into a film",
    heroChips: ["all chains", "wallet stories", "memecoin drops"],
  },
  lovex: {
    id: "lovex",
    route: "/LoveX",
    title: "LoveX",
    eyebrow: "Create",
    summary:
      "Family moments, milestones, and keepsakes with a polished cinematic finish.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Moment",
    subjectPlaceholder: "Birthday, graduation, reunion, wedding toast",
    subjectDescriptionLabel: "Brief",
    subjectDescriptionPlaceholder:
      "Who is there, what happened, and what should land?",
    defaultStyle: "mythic_poster",
    styleOptions: [
      "mythic_poster",
      "glass_signal",
      "hyperflow_assembly",
      "film_grain_70s",
    ],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "memory-first films for family moments that deserve a polished finish",
    heroChips: ["family moments", "no narration", "memory-first"],
  },
};
