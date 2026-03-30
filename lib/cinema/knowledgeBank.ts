import { JobRequestKind, SourceReferenceSummary } from "@/lib/types/domain";

export interface CreativeAgentRole {
  id: "tianshi" | "script_writer" | "editor";
  name: string;
  mandate: string;
  deliverable: string;
}

export const CREATIVE_AGENT_ROLES: CreativeAgentRole[] = [
  {
    id: "tianshi",
    name: "Tianshi",
    mandate:
      "Lead world-builder, cinematographer, and final approver. Owns mise en scene, framing, lens logic, lighting, movement, and the overall cinematic language.",
    deliverable:
      "A coherent final shot package that stays source-grounded, avoids repetition, and protects the intended emotional arc.",
  },
  {
    id: "script_writer",
    name: "Script Writer",
    mandate:
      "Extract the smallest meaningful story from the brief or source. Start on page one, show instead of tell, and write late-in/early-out scene goals.",
    deliverable:
      "A tight scene spine with clear character want, image logic, and dialogue or lyric rhythm only when it materially helps the cut.",
  },
  {
    id: "editor",
    name: "Editor",
    mandate:
      "Control shot order, escalation, transitions, and rhythm. Cut repetition, vary shot size and movement, and reject unnecessary on-screen text.",
    deliverable:
      "A replayable edit plan with purposeful transitions, strong coverage variety, and zero accidental subtitle/debug overlays.",
  },
];

const CINEMATOGRAPHY_TECHNIQUES = [
  "Visual storytelling first: show the emotion, power shift, or relationship in the frame before explaining it in words.",
  "Start scenes as late as possible and leave as early as possible once the turn has landed.",
  "Protect screen direction and eyelines so spatial geography stays readable.",
  "Compose with intent: use rule-of-thirds framing for dynamic balance or centered/one-point-perspective framing when you want ritual, control, or mythic focus.",
  "Vary shot scale on purpose: establish the world, move to mediums for action, then close-ups or extreme close-ups for emotional locks and key details.",
  "Use low angle for power, high angle for vulnerability, and dutch angle only for genuine instability or dread.",
  "Choose camera movement because it changes feeling: tracking for immersion, push-ins for pressure, whip pans for urgency, dolly zoom for psychological distortion.",
  "Motivate lighting. Keep the wide-shot lighting logic consistent in the coverage so the scene still feels like one world.",
  "Use long takes or tracking shots when immersion matters more than speed; use montage and close-up clusters when compression or ritual matters more than geography.",
  "Use transitions intentionally: match cuts for conceptual continuity, dissolves for memory/time drift, hard cuts for impact, bridge shots for time passage.",
  "No wall-to-wall music feeling in the image. Build visual breathing room and let moments of stillness reset the audience.",
  "No default subtitles or captions. If the scene needs language, stage it as performance, diegetic signage, or an explicit design choice.",
];

function storyKindSpecificLine(kind: JobRequestKind | undefined): string {
  switch (kind) {
    case "bedtime_story":
      return "For bedtime stories, favor gentle camera movement, soft motivated light, calm composition, and reassuring visual continuity.";
    case "music_video":
      return "For music videos, let rhythm, chorus lift, performance energy, and montage logic drive the cut without falling back to karaoke text.";
    case "scene_recreation":
      return "For scene recreations, preserve blocking intent, scene geography, and emotional timing while changing visual skin and production scale.";
    case "token_video":
      return "For token videos, build character-centric trailer shots instead of dashboards; token identity belongs in-world as props, shrines, holograms, or posters.";
    default:
      return "For general cinema briefs, build a clear world, a visible subject, and an emotional turn rather than a sequence of generic pretty images.";
  }
}

export function buildCreativeAssemblyLines(input: {
  storyKind?: JobRequestKind;
  source?: SourceReferenceSummary | null;
}): string[] {
  return [
    "HyperFlow Interface Assembly boxes:",
    ...CREATIVE_AGENT_ROLES.map(
      (role) =>
        `${role.name}: ${role.mandate} Final output: ${role.deliverable}`,
    ),
    "Tianshi has final cut authority. If the source disappears, the shot language repeats, or accidental text appears on screen, Tianshi rejects the package and rebuilds it.",
    input.source
      ? "Source Intake box: extract title, iconography, rhythm, and emotional promise from the supplied source before any scene writing begins."
      : "Source Intake box: if no external source exists, derive world rules strictly from the brief and keep them consistent across the entire cut.",
  ];
}

export function buildCinematographyKnowledgeLines(
  kind: JobRequestKind | undefined,
): string[] {
  return [
    "Cinematography knowledge bank:",
    ...CINEMATOGRAPHY_TECHNIQUES,
    storyKindSpecificLine(kind),
    "Editor rule: do not repeat the same portrait setup, background, or movement pattern in consecutive beats unless repetition itself is the meaning.",
  ];
}
