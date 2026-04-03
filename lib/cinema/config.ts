import { HYPERMYTHX_STYLE_PRESETS } from "@/lib/memecoins/styles";
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
  hypercinema: {
    id: "hypercinema",
    route: "/HyperCinema",
    title: "HyperMythsX",
    eyebrow: "Create",
    summary:
      "Full-fledged options editor for polished concept cuts, brand stories, and tightly controlled outputs.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Project title",
    subjectPlaceholder: "HyperMythsX teaser, launch short, or concept trailer",
    subjectDescriptionLabel: "Core idea",
    subjectDescriptionPlaceholder:
      "What is this piece about in one or two sentences?",
    defaultStyle: "hyperflow_assembly",
    styleOptions: HYPERMYTHX_STYLE_PRESETS.map((preset) => preset.id),
    defaultAudioEnabled: false,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "clean control-room cinema for general stories",
    heroChips: ["public", "no sound by default", "lyrics optional"],
  },
  hyperm: {
    id: "hyperm",
    route: "/HyperM",
    title: "HyperM",
    eyebrow: "Create",
    summary:
      "Full-fledged creator for polished concept cuts, brand stories, and tightly controlled outputs.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Project title",
    subjectPlaceholder: "Launch short, concept trailer, or creator cut",
    subjectDescriptionLabel: "Core idea",
    subjectDescriptionPlaceholder:
      "What is this piece about in one or two sentences?",
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
    themeTone: "no-holds-barred creator for concept cuts, brand stories, and anything else",
    heroChips: ["full creator", "audio on by default", "no holds barred"],
  },
  mythx: {
    id: "mythx",
    route: "/MythX",
    title: "MythX",
    eyebrow: "Create",
    summary:
      "Autobiography from the last 42 tweets of an X profile. No title required, just a handle or bio link.",
    requestKind: "mythx",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "X profile link or @handle",
    subjectPlaceholder: "https://x.com/username or @username",
    subjectDescriptionLabel: "Biography angle",
    subjectDescriptionPlaceholder:
      "What should the autobiography expose: origin, contradiction, obsession, comeback, or myth?",
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
    themeTone: "public signals, private truth, and autobiography with no airbrushing",
    heroChips: ["X profile", "42 tweets", "no title required"],
  },
  trenchcinema: {
    id: "trenchcinema",
    route: "/TrenchCinema",
    title: "TrenchMyths",
    eyebrow: "Create",
    summary:
      "Wallet-led trailers, memecoin mythology, and on-chain stories for Solana, Ethereum, BNB Chain, and Base.",
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
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: true,
    themeTone: "memecoin trenches, chart glow, and token mythology with sound on by default",
    heroChips: ["public", "multichain", "metadata-first"],
  },
  funcinema: {
    id: "funcinema",
    route: "/FunCinema",
    title: "FunMyths",
    eyebrow: "Create",
    summary:
      "Random and weird cinematic experiments with playful pacing and controlled chaos.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Project title",
    subjectPlaceholder: "Private campaign, meme short, or internal concept",
    subjectDescriptionLabel: "Core idea",
    subjectDescriptionPlaceholder:
      "Describe the topic, tone, or internal joke to preserve.",
    defaultStyle: "glass_signal",
    styleOptions: ["glass_signal", "hyperflow_assembly", "mythic_poster"],
    defaultAudioEnabled: true,
    audioMode: "optional",
    supportsChain: false,
    themeTone: "private sandbox for sharper, weirder creative loops",
    heroChips: ["public", "easy to use", "shareable"],
  },
  familycinema: {
    id: "familycinema",
    route: "/FamilyCinema",
    title: "Family",
    eyebrow: "Create",
    summary:
      "Occasions, family photos, and gentle private keepsakes with a warm finish.",
    requestKind: "bedtime_story",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
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
    themeTone: "soft bedtime cinema with narration only when requested and a gentle musical lift",
    heroChips: ["public", "narration optional", "parent-paste story"],
  },
  musicvideo: {
    id: "musicvideo",
    route: "/MusicVideo",
    title: "Music",
    eyebrow: "Create",
    summary:
      "Music-led edits, remakes, and rhythm-first visual stories that sync to the track.",
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
    eyebrow: "Generate",
    summary:
      "Pull dialogue or transcript beats from a source video, turn them into story cards, and recreate the scenes as a trailer-grade reinterpretation.",
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
    themeTone: "dialogue-led recreation studio for remakes and scene tributes",
    heroChips: ["public", "source-backed", "next-step sequels"],
  },
  hashmyth: {
    id: "hashmyth",
    route: "/HashMyth",
    title: "HashMyth",
    eyebrow: "Create",
    summary:
      "Wallet and memecoin generator. Paste any token or wallet address and turn your on-chain story into cinema.",
    requestKind: "token_video",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Token or wallet address",
    subjectPlaceholder: "Paste a token mint, contract, or wallet address",
    subjectDescriptionLabel: "Trading story direction",
    subjectDescriptionPlaceholder:
      "What was the trade? The win, the loss, the hold, describe the energy.",
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
    themeTone: "wallets, memes, and trading-floor adrenaline made cinematic",
    heroChips: ["all chains", "wallet stories", "memecoin drops"],
  },
  lovex: {
    id: "lovex",
    route: "/LoveX",
    title: "LoveX",
    eyebrow: "Create",
    summary:
      "Family occasions, reunion reels, birthdays, and keepsakes cut like cinema.",
    requestKind: "generic_cinema",
    pricingMode: "public",
    visibility: "public",
    requiresAuth: false,
    subjectLabel: "Family moment",
    subjectPlaceholder: "Birthday dinner, graduation, reunion, wedding toast",
    subjectDescriptionLabel: "Moment details",
    subjectDescriptionPlaceholder:
      "Who is there, what happened, and what emotional beat should land?",
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
    themeTone: "family occasions, memory reels, and keepsakes with a warm finish",
    heroChips: ["family moments", "no narration", "memory-first"],
  },
};
