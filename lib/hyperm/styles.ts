import type { VideoStyleId } from "@/lib/types/domain";

export interface HyperMStyleOption {
  id: VideoStyleId;
  label: string;
}

export interface HyperMStyleGroup {
  label: string;
  styles: HyperMStyleOption[];
}

export const HYPERM_STYLE_GROUPS: HyperMStyleGroup[] = [
  {
    label: "Film Era",
    styles: [
      { id: "vhs_cinema", label: "VHS Camcorder" },
      { id: "music_video_80s", label: "Super 8mm" },
      { id: "60s_nouvelle_vague", label: "16mm Documentary" },
      { id: "black_and_white_noir", label: "35mm Anamorphic" },
      { id: "anime_cel", label: "60s Technicolor" },
      { id: "cyberpunk_neon", label: "70s Grindhouse" },
      { id: "film_grain_70s", label: "80s Synthwave" },
      { id: "lo_fi_dreampop", label: "90s Indie Film" },
    ],
  },
  {
    label: "Black & White",
    styles: [
      { id: "soviet_montage", label: "Film Noir" },
      { id: "wes_anderson_pastel", label: "German Expressionism" },
      { id: "wong_kar_wai_neon", label: "French New Wave" },
      { id: "tarantino_grindhouse", label: "Silent Cinema" },
      { id: "lynch_surreal", label: "Monochrome Portraiture" },
    ],
  },
  {
    label: "Animation",
    styles: [
      { id: "giallo_horror", label: "Anime Shonen" },
      { id: "french_new_wave", label: "Anime Cyberpunk" },
      { id: "korean_thriller", label: "Studio Ghibli Pastoral" },
      { id: "bollywood_spectacle", label: "Rotoscope" },
      { id: "studio_ghibli_watercolor", label: "Stop Motion" },
      { id: "vaporwave_mall", label: "Cel Animation" },
      { id: "retrowave_sunset", label: "Pixel Art Cinematic" },
    ],
  },
  {
    label: "Music Video",
    styles: [
      { id: "polaroid_memory", label: "Hip-Hop Visual" },
      { id: "super8_home_movie", label: "Dream Pop" },
      { id: "35mm_golden_hour", label: "Metal Lyric Video" },
      { id: "anamorphic_widescreen", label: "EDM Stage" },
      { id: "drone_epic", label: "Lo-fi Bedroom" },
      { id: "imax_nature", label: "Jazz Club" },
    ],
  },
  {
    label: "Modern Cinema",
    styles: [
      { id: "stop_motion_clay", label: "Wes Anderson Symmetry" },
      { id: "rotoscope_sketch", label: "Terrence Malick Light" },
      { id: "silhouette_shadow", label: "Wong Kar-Wai Neon" },
      { id: "neon_tokyo_night", label: "Kubrick Geometric" },
      { id: "desert_western", label: "Nolan IMAX" },
      { id: "underwater_deep", label: "Villeneuve Desolation" },
    ],
  },
  {
    label: "Experimental",
    styles: [
      { id: "space_odyssey", label: "Glitch Art" },
      { id: "gothic_cathedral", label: "Datamosh" },
      { id: "steampunk_brass", label: "Double Exposure" },
      { id: "art_deco_gatsby", label: "Liquid Chrome" },
      { id: "brutalist_concrete", label: "Infrared" },
      { id: "glitch_digital", label: "Thermal Vision" },
    ],
  },
  {
    label: "Genre",
    styles: [
      { id: "double_exposure", label: "Sci-Fi Retro-Future" },
      { id: "infrared_thermal", label: "Gothic Horror" },
      { id: "tilt_shift_miniature", label: "Solarpunk" },
      { id: "one_take_steadicam", label: "Vaporwave" },
    ],
  },
];

export const HYPERM_STYLE_IDS = HYPERM_STYLE_GROUPS.flatMap((group) =>
  group.styles.map((style) => style.id),
);

export const DEFAULT_HYPERM_STYLE_ID: VideoStyleId =
  HYPERM_STYLE_GROUPS[0].styles[0].id;
