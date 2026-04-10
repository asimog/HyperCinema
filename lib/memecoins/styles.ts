import { SupportedTokenChain, VideoStyleId } from "@/lib/types/domain";

export interface TokenVideoStylePreset {
  id: VideoStyleId;
  label: string;
  shortLabel: string;
  summary: string;
  directorNote: string;
  accent: string;
  promptSeed: string;
}

export const DEFAULT_TOKEN_VIDEO_STYLE_ID: VideoStyleId = "hyperflow_assembly";

const CORE_TOKEN_VIDEO_STYLE_PRESETS: TokenVideoStylePreset[] = [
  {
    id: "hyperflow_assembly",
    label: "Hyperflow Assembly",
    shortLabel: "Hyperflow",
    summary:
      "A polished command-deck short with adapter-box UI energy and high-signal overlays.",
    directorNote:
      "Treat the token like an autonomous media service moving through a modular control room.",
    accent: "#98c8bf",
    promptSeed:
      "modular command surfaces, seafoam status lights, scanner glass, precision interface choreography",
  },
  {
    id: "trading_card",
    label: "Trading Card",
    shortLabel: "Card",
    summary:
      "A punchy token spotlight with collectible-card framing and stat-led reveals.",
    directorNote:
      "Frame the memecoin like a premium moving trading card with readable hero beats.",
    accent: "#ffd36d",
    promptSeed:
      "collectible foil textures, premium card framing, animated stat callouts, hero insert shots",
  },
  {
    id: "trench_neon",
    label: "Trench Neon",
    shortLabel: "Neon",
    summary:
      "A loud late-night memecoin trailer with club lighting, velocity, and zero chill.",
    directorNote:
      "Make it feel like the chart is a nightlife district and the token is the headliner.",
    accent: "#ff7647",
    promptSeed:
      "night market haze, neon strips, hectic lens motion, underground launch energy",
  },
  {
    id: "mythic_poster",
    label: "Mythic Poster",
    shortLabel: "Mythic",
    summary:
      "A bigger-than-life legend cut that treats the token like poster art in motion.",
    directorNote:
      "Push scale, iconography, and heroic composition without losing the token identity.",
    accent: "#f3c38f",
    promptSeed:
      "hero poster composition, epic negative space, glowing sigils, elevated myth branding",
  },
  {
    id: "glass_signal",
    label: "Glass Signal",
    shortLabel: "Glass",
    summary:
      "A clean translucent signal-feed look for understated but premium token stories.",
    directorNote:
      "Keep the pacing crisp and the UI translucent, like a future signal terminal.",
    accent: "#87dbff",
    promptSeed:
      "glassmorphism panels, clean telemetry, cool signal bloom, premium future terminal",
  },
];

/* ── HyperMythsX cinematic presets (42 styles) ─────────────────────── */

export const HYPERMYTHX_STYLE_PRESETS: TokenVideoStylePreset[] = [
  {
    id: "vhs_cinema",
    label: "VHS Cinema",
    shortLabel: "VHS",
    summary:
      "Warm analog tape wobble with tracking lines and soft oversaturation.",
    directorNote:
      "Let the imperfection tell the story, tape hiss, color bleed, nostalgia.",
    accent: "#e8a84c",
    promptSeed:
      "VHS tape artifacts, warm analog grain, tracking distortion, faded color saturation",
  },
  {
    id: "music_video_80s",
    label: "80s Music Video",
    shortLabel: "80s MTV",
    summary: "Synth-driven neon excess with fog machines and laser grids.",
    directorNote:
      "Think Top of the Pops meets Tron, big hair energy, bigger backlight.",
    accent: "#ff47ab",
    promptSeed:
      "neon fog, laser grid floor, synth lighting, hair metal backlighting, MTV energy",
  },
  {
    id: "60s_nouvelle_vague",
    label: "60s Nouvelle Vague",
    shortLabel: "60s Wave",
    summary:
      "French new wave jump cuts, café philosophy, and handheld intimacy.",
    directorNote:
      "Godard energy, break the fourth wall, let the camera breathe.",
    accent: "#c4c4c4",
    promptSeed:
      "handheld 16mm, jump cuts, Parisian streets, cigarette smoke, existential gaze",
  },
  {
    id: "black_and_white_noir",
    label: "Black & White Noir",
    shortLabel: "B&W Noir",
    summary:
      "Hard shadows, venetian blinds, and moral ambiguity in monochrome.",
    directorNote: "Every frame is a confession. Light only what matters.",
    accent: "#f0f0f0",
    promptSeed:
      "high contrast monochrome, venetian blind shadows, rain-slick streets, femme fatale silhouette",
  },
  {
    id: "anime_cel",
    label: "Anime Cel",
    shortLabel: "Anime",
    summary:
      "Hand-painted cel animation with dramatic speed lines and emotion beats.",
    directorNote: "Big eyes, bigger feelings, let the wind do the acting.",
    accent: "#ff6b9d",
    promptSeed:
      "cel shading, speed lines, cherry blossoms, dramatic wind, expressive eyes",
  },
  {
    id: "crt_anime_90s",
    label: "90s Anime CRT",
    shortLabel: "90s CRT",
    summary:
      "Hand-drawn cel animation on CRT monitors with scanlines, phosphor glow, and analog warmth. Evangelion meets Cowboy Bebop aesthetics.",
    directorNote:
      "Scanlines are mandatory. Slight chromatic aberration, dark shadows with crushed blacks, that heavy CRT phosphor bloom. Let it feel like a bootleg VHS tape of a midnight anime broadcast.",
    accent: "#44ddff",
    promptSeed:
      "CRT scanlines, phosphor glow, hand-drawn 90s anime cel, chromatic aberration, crushed blacks, analog color bleed, neon highlights, dark atmospheric cityscape, heavy film grain, broadcast signal warmth",
  },
  {
    id: "cyberpunk_neon",
    label: "Cyberpunk Neon",
    shortLabel: "Cyber",
    summary:
      "Rain-soaked megacity with holographic ads and chrome reflections.",
    directorNote: "Blade Runner meets Akira, the city is the character.",
    accent: "#00ffcc",
    promptSeed:
      "neon rain, holographic billboards, chrome reflections, megacity night, synth haze",
  },
  {
    id: "film_grain_70s",
    label: "70s Film Grain",
    shortLabel: "70s Grain",
    summary:
      "Warm Kodachrome tones with heavy grain and naturalistic lighting.",
    directorNote: "Scorsese's New York, sweat on the lens, truth in the grain.",
    accent: "#d4915e",
    promptSeed:
      "heavy film grain, Kodachrome warmth, naturalistic light, 70s urban grit",
  },
  {
    id: "lo_fi_dreampop",
    label: "Lo-Fi Dreampop",
    shortLabel: "Dreampop",
    summary:
      "Hazy bloom, soft focus, and pastel washes that dissolve into feeling.",
    directorNote: "Let everything blur except the emotion.",
    accent: "#c4a3ff",
    promptSeed:
      "soft bloom, pastel haze, dreamy dissolves, ambient light leak, gentle motion",
  },
  {
    id: "soviet_montage",
    label: "Soviet Montage",
    shortLabel: "Soviet",
    summary:
      "Eisenstein-style rhythmic cuts with propagandist scale and industrial power.",
    directorNote: "Collision editing, meaning lives between the shots.",
    accent: "#cc3333",
    promptSeed:
      "rhythmic montage, industrial machinery, heroic angles, constructivist geometry",
  },
  {
    id: "wes_anderson_pastel",
    label: "Wes Anderson Pastel",
    shortLabel: "Anderson",
    summary: "Symmetrical frames, candy palettes, and deadpan whimsy.",
    directorNote: "Center everything. Make it precious. Then break one thing.",
    accent: "#ffb5c5",
    promptSeed:
      "perfect symmetry, pastel palette, centered framing, miniature scale, whimsical detail",
  },
  {
    id: "wong_kar_wai_neon",
    label: "Wong Kar-Wai Neon",
    shortLabel: "WKW",
    summary:
      "Smeared neon, step-printed motion, and aching romantic loneliness.",
    directorNote: "Slow everything down except the heartbeat.",
    accent: "#ff3366",
    promptSeed:
      "smeared neon, step-printed motion blur, rain on glass, lonely figures, saturated red-green",
  },
  {
    id: "tarantino_grindhouse",
    label: "Tarantino Grindhouse",
    shortLabel: "Grindhouse",
    summary:
      "Exploitation cinema grit with reel burns, scratches, and pulp energy.",
    directorNote: "Missing reels, damaged prints, maximum attitude.",
    accent: "#ff6600",
    promptSeed:
      "film scratches, reel burn, exploitation typography, split-screen, revenge energy",
  },
  {
    id: "lynch_surreal",
    label: "Lynch Surreal",
    shortLabel: "Lynchian",
    summary:
      "Red curtains, industrial drone, and the uncanny hiding in the mundane.",
    directorNote: "Make the ordinary terrifying. Slow dissolve into dread.",
    accent: "#8b0000",
    promptSeed:
      "red velvet curtains, industrial drone, uncanny lighting, surreal juxtaposition, slow dread",
  },
  {
    id: "giallo_horror",
    label: "Giallo Horror",
    shortLabel: "Giallo",
    summary:
      "Italian horror excess, saturated gels, leather gloves, baroque kills.",
    directorNote: "Argento's palette, blue, red, green gels on everything.",
    accent: "#ff0044",
    promptSeed:
      "colored gel lighting, baroque architecture, leather gloves, saturated blood red, ornate death",
  },
  {
    id: "french_new_wave",
    label: "French New Wave",
    shortLabel: "Nouvelle",
    summary: "Handheld spontaneity, intellectual montage, and café rebellion.",
    directorNote: "Break every rule, but make it look effortless.",
    accent: "#a0a0a0",
    promptSeed:
      "handheld spontaneity, iris wipes, intertitles, café scenes, intellectual rebellion",
  },
  {
    id: "korean_thriller",
    label: "Korean Thriller",
    shortLabel: "K-Thriller",
    summary: "Methodical tension, rain-soaked revenge, and immaculate framing.",
    directorNote: "Park Chan-wook precision, every frame is a trap.",
    accent: "#2d5a27",
    promptSeed:
      "methodical pacing, rain-soaked vengeance, precise framing, moral ambiguity, cold interiors",
  },
  {
    id: "bollywood_spectacle",
    label: "Bollywood Spectacle",
    shortLabel: "Bollywood",
    summary: "Saturated color, synchronized choreography, and maximal emotion.",
    directorNote: "More is more. Let the color sing and the crowd dance.",
    accent: "#ff9933",
    promptSeed:
      "vivid saturation, choreographed crowds, ornate sets, emotional maximalism, golden light",
  },
  {
    id: "studio_ghibli_watercolor",
    label: "Studio Ghibli Watercolor",
    shortLabel: "Ghibli",
    summary: "Hand-painted skies, gentle wind, and the magic hidden in nature.",
    directorNote:
      "Miyazaki's patience, let the clouds move and the grass sway.",
    accent: "#7ec8a0",
    promptSeed:
      "watercolor skies, gentle breeze animation, pastoral landscapes, magical realism, hand-painted detail",
  },
  {
    id: "vaporwave_mall",
    label: "Vaporwave Mall",
    shortLabel: "Vaporwave",
    summary:
      "Dead malls, Roman busts, and pink-purple nostalgia for futures that never came.",
    directorNote: "A E S T H E T I C, slow zoom through consumer paradise.",
    accent: "#ff71ce",
    promptSeed:
      "empty mall corridors, Roman statuary, pink-purple gradient, slow zoom, consumer nostalgia",
  },
  {
    id: "retrowave_sunset",
    label: "Retrowave Sunset",
    shortLabel: "Retrowave",
    summary:
      "Chrome sunsets, grid horizons, and outrun speed across digital landscapes.",
    directorNote: "The sun never fully sets, it just gets more chrome.",
    accent: "#ff6ec7",
    promptSeed:
      "chrome sunset gradient, wireframe grid horizon, outrun speed, digital palm trees, synth glow",
  },
  {
    id: "polaroid_memory",
    label: "Polaroid Memory",
    shortLabel: "Polaroid",
    summary:
      "Instant film warmth with white borders and the patina of held moments.",
    directorNote: "Every shot is a memory someone kept in their wallet.",
    accent: "#f5e6d3",
    promptSeed:
      "polaroid borders, instant film color shift, warm faded tones, intimate scale, held memory",
  },
  {
    id: "super8_home_movie",
    label: "Super 8 Home Movie",
    shortLabel: "Super8",
    summary:
      "Flickering family footage with light leaks and the weight of time passing.",
    directorNote:
      "Make it feel found, like someone discovered this in an attic.",
    accent: "#d4a574",
    promptSeed:
      "super 8 flicker, light leaks, overexposed highlights, home movie pacing, time-worn warmth",
  },
  {
    id: "35mm_golden_hour",
    label: "35mm Golden Hour",
    shortLabel: "Golden",
    summary:
      "Lush 35mm film stock bathed in magic-hour warmth and shallow depth.",
    directorNote:
      "Chase the light. Every frame should feel like the last hour of summer.",
    accent: "#ffc857",
    promptSeed:
      "35mm film stock, golden hour glow, shallow depth of field, lens flare, warm amber tones",
  },
  {
    id: "anamorphic_widescreen",
    label: "Anamorphic Widescreen",
    shortLabel: "Scope",
    summary:
      "Ultra-wide 2.39:1 framing with signature oval bokeh and horizontal flares.",
    directorNote:
      "CinemaScope grandeur, use the width to isolate or overwhelm.",
    accent: "#4a9eff",
    promptSeed:
      "anamorphic lens flare, 2.39:1 widescreen, oval bokeh, horizontal light streaks, epic scale",
  },
  {
    id: "drone_epic",
    label: "Drone Epic",
    shortLabel: "Drone",
    summary:
      "Soaring aerial reveals over vast terrain with god's-eye perspective.",
    directorNote: "Start high, pull the world into view, then find the human.",
    accent: "#87ceeb",
    promptSeed:
      "aerial drone sweep, vast landscape reveal, god's eye perspective, epic terrain, altitude shift",
  },
  {
    id: "imax_nature",
    label: "IMAX Nature",
    shortLabel: "IMAX",
    summary:
      "Ultra-sharp nature macro and panoramic scale at overwhelming resolution.",
    directorNote:
      "Planet Earth energy, make the viewer feel small in the best way.",
    accent: "#228b22",
    promptSeed:
      "IMAX sharpness, nature macro detail, panoramic landscape, overwhelming scale, pristine clarity",
  },
  {
    id: "stop_motion_clay",
    label: "Stop Motion Clay",
    shortLabel: "Claymation",
    summary:
      "Handcrafted clay animation with visible thumbprints and tactile charm.",
    directorNote: "Laika meets Aardman, imperfection is the texture.",
    accent: "#d2691e",
    promptSeed:
      "clay animation, visible thumbprints, miniature sets, frame-by-frame motion, handcrafted charm",
  },
  {
    id: "rotoscope_sketch",
    label: "Rotoscope Sketch",
    shortLabel: "Rotoscope",
    summary:
      "Traced-over live action with pencil-line shimmer and reality-bending edges.",
    directorNote: "Waking Life energy, let the lines breathe and wander.",
    accent: "#6b8e23",
    promptSeed:
      "rotoscope line shimmer, pencil trace overlay, reality-bending edges, animated sketch, fluid contours",
  },
  {
    id: "silhouette_shadow",
    label: "Silhouette Shadow",
    shortLabel: "Silhouette",
    summary:
      "Bold black silhouettes against vivid color fields, shape tells the story.",
    directorNote: "Remove detail, keep only form. The shadow knows.",
    accent: "#1a1a2e",
    promptSeed:
      "bold silhouettes, vivid color fields, shadow puppetry, minimal form, backlit drama",
  },
  {
    id: "neon_tokyo_night",
    label: "Neon Tokyo Night",
    shortLabel: "Tokyo",
    summary:
      "Rain-soaked Shibuya crossing with kanji glow and convenience store light.",
    directorNote: "Lost in Translation midnight, the city hums in neon.",
    accent: "#e040fb",
    promptSeed:
      "Shibuya rain, kanji neon signs, convenience store glow, wet reflections, midnight Tokyo",
  },
  {
    id: "desert_western",
    label: "Desert Western",
    shortLabel: "Western",
    summary:
      "Sun-bleached horizons, dust devils, and Morricone-scale landscape drama.",
    directorNote: "Leone's patience, let the desert do the talking.",
    accent: "#c19a6b",
    promptSeed:
      "sun-bleached desert, dust clouds, wide horizon, spaghetti western framing, harsh sunlight",
  },
  {
    id: "underwater_deep",
    label: "Underwater Deep",
    shortLabel: "Deep Sea",
    summary:
      "Bioluminescent abyss with particle drift and pressure-grade silence.",
    directorNote: "The deep ocean is outer space with more teeth.",
    accent: "#006994",
    promptSeed:
      "bioluminescent glow, deep ocean particles, pressure silence, aquatic drift, abyssal darkness",
  },
  {
    id: "space_odyssey",
    label: "Space Odyssey",
    shortLabel: "Space",
    summary:
      "Kubrickian orbital elegance with starfield infinity and cold mechanical beauty.",
    directorNote: "2001 stillness, let the void breathe between the stars.",
    accent: "#e6e6fa",
    promptSeed:
      "orbital elegance, starfield infinity, mechanical precision, zero gravity, Kubrickian stillness",
  },
  {
    id: "gothic_cathedral",
    label: "Gothic Cathedral",
    shortLabel: "Gothic",
    summary:
      "Stained glass light, stone vaults, and the weight of sacred architecture.",
    directorNote:
      "Let light enter only through colored glass. Everything else stays dark.",
    accent: "#4b0082",
    promptSeed:
      "stained glass light shafts, stone vault ceilings, gothic arches, sacred geometry, candlelit shadow",
  },
  {
    id: "steampunk_brass",
    label: "Steampunk Brass",
    shortLabel: "Steampunk",
    summary:
      "Clockwork gears, brass pipes, and Victorian-industrial mechanical wonder.",
    directorNote:
      "Every machine should look like it was built by a mad watchmaker.",
    accent: "#b8860b",
    promptSeed:
      "clockwork gears, brass machinery, steam vents, Victorian engineering, warm copper light",
  },
  {
    id: "art_deco_gatsby",
    label: "Art Deco Gatsby",
    shortLabel: "Deco",
    summary: "Gilded geometry, champagne light, and roaring twenties opulence.",
    directorNote:
      "Gatsby's party, gold on black, angles everywhere, nothing is enough.",
    accent: "#ffd700",
    promptSeed:
      "art deco geometry, gilded patterns, champagne gold, roaring twenties luxury, geometric opulence",
  },
  {
    id: "brutalist_concrete",
    label: "Brutalist Concrete",
    shortLabel: "Brutalist",
    summary:
      "Raw concrete monoliths, overcast skies, and the beauty of ugly architecture.",
    directorNote: "Find poetry in poured concrete, mass, shadow, repetition.",
    accent: "#808080",
    promptSeed:
      "raw concrete surfaces, brutalist architecture, overcast sky, geometric mass, shadow repetition",
  },
  {
    id: "glitch_digital",
    label: "Glitch Digital",
    shortLabel: "Glitch",
    summary:
      "Corrupt data streams, pixel-sorted landscapes, and broken-signal beauty.",
    directorNote: "The error IS the aesthetic. Corrupt everything beautifully.",
    accent: "#00ff41",
    promptSeed:
      "data corruption, pixel sorting, broken signal, RGB channel split, digital decay",
  },
  {
    id: "double_exposure",
    label: "Double Exposure",
    shortLabel: "Double Exp",
    summary:
      "Overlaid imagery merging faces with landscapes, dreams with reality.",
    directorNote: "Two images, one frame, let meaning emerge from the overlay.",
    accent: "#daa520",
    promptSeed:
      "double exposure overlay, face-landscape merge, translucent layers, dreamlike fusion, ghost imagery",
  },
  {
    id: "infrared_thermal",
    label: "Infrared Thermal",
    shortLabel: "Infrared",
    summary:
      "Heat-mapped vision with false-color palettes revealing invisible energies.",
    directorNote: "Show what eyes can't see, the heat signature of emotion.",
    accent: "#ff4500",
    promptSeed:
      "infrared false color, thermal vision, heat signature, invisible spectrum, scientific palette",
  },
  {
    id: "tilt_shift_miniature",
    label: "Tilt-Shift Miniature",
    shortLabel: "Tilt-Shift",
    summary: "Selective focus making real scenes look like tiny model worlds.",
    directorNote: "God's toybox, make the world look miniature and precious.",
    accent: "#98fb98",
    promptSeed:
      "tilt-shift blur, miniature effect, selective focus band, toytown scale, overhead perspective",
  },
  {
    id: "one_take_steadicam",
    label: "One-Take Steadicam",
    shortLabel: "One Take",
    summary:
      "Unbroken single-shot choreography weaving through continuous action.",
    directorNote: "Lubezki-Iñárritu energy, never cut, let the world unfold.",
    accent: "#cd853f",
    promptSeed:
      "continuous steadicam shot, unbroken choreography, spatial flow, real-time pacing, no cuts",
  },
  {
    id: "split_screen_diptych",
    label: "Split Screen Diptych",
    shortLabel: "Split",
    summary: "Dual narratives in parallel frames creating visual dialogue.",
    directorNote: "De Palma split, two stories, one screen, constant tension.",
    accent: "#9370db",
    promptSeed:
      "split screen composition, parallel narratives, dual framing, visual dialogue, simultaneous action",
  },
  {
    id: "found_footage_raw",
    label: "Found Footage Raw",
    shortLabel: "Found",
    summary: "Handheld chaos, night-vision green, and the terror of the real.",
    directorNote: "Make the audience believe someone found this tape.",
    accent: "#556b2f",
    promptSeed:
      "handheld camera shake, night-vision green, found tape artifacts, raw urgency, documentary grain",
  },
  {
    id: "technicolor_musical",
    label: "Technicolor Musical",
    shortLabel: "Musical",
    summary:
      "Saturated studio Technicolor with painted sets and choreographed splendor.",
    directorNote:
      "Singin' in the Rain energy, make the color impossible and the joy real.",
    accent: "#ff69b4",
    promptSeed:
      "Technicolor saturation, painted studio sets, choreographed movement, vivid primary colors, golden age glamour",
  },
  {
    id: "scandinavian_minimal",
    label: "Scandinavian Minimal",
    shortLabel: "Nordic",
    summary:
      "Sparse composition, cold light, and existential emptiness with quiet power.",
    directorNote: "Bergman silence, say everything by showing almost nothing.",
    accent: "#b0c4de",
    promptSeed:
      "sparse composition, cold northern light, minimal interiors, existential quiet, muted palette",
  },
  {
    id: "latin_telenovela",
    label: "Latin Telenovela",
    shortLabel: "Telenovela",
    summary:
      "Dramatic zooms, passionate close-ups, and emotional maximalism at full volume.",
    directorNote: "Every emotion at 11. The camera zooms because it CARES.",
    accent: "#ff1493",
    promptSeed:
      "dramatic zoom, passionate close-up, saturated color, emotional maximalism, telenovela intensity",
  },
];

/* ── LoveX cinematic presets (4 styles) ───────────────────────────── */

export const LOVEX_STYLE_PRESETS: TokenVideoStylePreset[] = [
  {
    id: "love_slow_waltz",
    label: "Slow Waltz",
    shortLabel: "Waltz",
    summary:
      "Gentle 3/4 time pacing with candlelit warmth and intimate two-shot framing.",
    directorNote:
      "Every cut is a breath. Classical strings carry the weight of the unsaid.",
    accent: "#e8c4a0",
    promptSeed:
      "candlelit warmth, slow waltz pacing, intimate two-shot, soft focus, classical strings energy",
  },
  {
    id: "love_golden_cinema",
    label: "Golden Cinema",
    shortLabel: "Golden",
    summary:
      "Old Hollywood glamour with soft key lighting and timeless romantic framing.",
    directorNote:
      "Casablanca glow, backlight the silhouette, let the score do the rest.",
    accent: "#ffd700",
    promptSeed:
      "old Hollywood soft light, romantic key lighting, golden warmth, classic framing, timeless glamour",
  },
  {
    id: "love_moonlit_garden",
    label: "Moonlit Garden",
    shortLabel: "Moonlit",
    summary:
      "Silver-blue moonlight through garden foliage with dew and quiet magic.",
    directorNote: "Midsummer Night's Dream, nature as the cathedral of love.",
    accent: "#b0c4de",
    promptSeed:
      "moonlit garden, silver-blue light, dew on petals, gentle fog, nocturnal romance, quiet magic",
  },
  {
    id: "love_timeless_portrait",
    label: "Timeless Portrait",
    shortLabel: "Portrait",
    summary:
      "Renaissance painting light with still-life composition and eternal softness.",
    directorNote:
      "Vermeer's window light, paint with photons, hold every face like a masterwork.",
    accent: "#deb887",
    promptSeed:
      "Renaissance window light, portrait composition, oil painting warmth, eternal softness, still-life detail",
  },
];

export const TOKEN_VIDEO_STYLE_PRESETS: TokenVideoStylePreset[] = [
  ...CORE_TOKEN_VIDEO_STYLE_PRESETS,
  ...HYPERMYTHX_STYLE_PRESETS,
  ...LOVEX_STYLE_PRESETS,
];

const STYLE_BY_ID = new Map(
  TOKEN_VIDEO_STYLE_PRESETS.map((preset) => [preset.id, preset]),
);

export function getTokenVideoStylePreset(
  styleId?: VideoStyleId | null,
): TokenVideoStylePreset {
  return (
    STYLE_BY_ID.get(styleId ?? DEFAULT_TOKEN_VIDEO_STYLE_ID) ??
    STYLE_BY_ID.get(DEFAULT_TOKEN_VIDEO_STYLE_ID)!
  );
}

export function listSuggestedStyleIds(input: {
  chain?: SupportedTokenChain | null;
  isPump?: boolean;
  description?: string | null;
}): VideoStyleId[] {
  const haystack = (input.description ?? "").toLowerCase();
  const suggestions = new Set<VideoStyleId>([DEFAULT_TOKEN_VIDEO_STYLE_ID]);

  if (input.isPump || input.chain === "solana") {
    suggestions.add("trench_neon");
  }

  if (input.chain === "ethereum" || haystack.includes("cult")) {
    suggestions.add("mythic_poster");
  }

  if (input.chain === "bsc" || haystack.includes("speed")) {
    suggestions.add("trading_card");
  }

  if (haystack.includes("ai") || haystack.includes("signal")) {
    suggestions.add("glass_signal");
  }

  for (const preset of TOKEN_VIDEO_STYLE_PRESETS) {
    suggestions.add(preset.id);
    if (suggestions.size >= 3) {
      break;
    }
  }

  return [...suggestions];
}
