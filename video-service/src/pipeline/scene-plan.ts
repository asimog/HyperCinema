// ── Scene Planning — Split Scenes into Fixed-Length Clips ──────────
// 1. buildSceneChunks() — flattens scenes into clip chunks ≤maxClipSeconds
// 2. splitDuration() — composes clip durations from [8, 6, 4] to match target
// 3. chunkPrompt() — builds xAI prompt with continuity hints (stateRef, anchors)
// 4. normalizeScenes() — fills missing numbers, sorts, floors durations

import { NormalizedRenderRequest, RenderScene } from "../types";

// One clip chunk derived from a scene
export interface SceneChunk {
  chunkId: string;
  sceneNumber: number;
  chunkIndex: number;
  chunkCount: number;
  durationSeconds: number;
  visualPrompt: string;
  narration: string;
  imageUrl: string | null;
  stateRef?: string;
  continuityAnchors?: string[];
  continuityPrompt?: string;
}

// Split total seconds into valid clip durations (max 8, 6, or 4s each)
function splitDuration(totalSeconds: number, maxSeconds: number): number[] {
  const safeTotal = Math.max(1, Math.floor(totalSeconds));
  // Allowed clip sizes — filter by max
  const allowedDurations = [8, 6, 4].filter((v) => v <= maxSeconds);
  if (!allowedDurations.length) {
    throw new Error(`No valid clip durations at max=${maxSeconds}s.`);
  }

  const minAllowed = allowedDurations[allowedDurations.length - 1]!;
  const target = Math.max(minAllowed, safeTotal);
  const memo = new Map<number, number[] | null>();

  // Recursively compose durations that sum to `remaining`
  const compose = (remaining: number): number[] | null => {
    if (remaining === 0) return [];
    if (remaining < 0) return null;

    const hit = memo.get(remaining);
    if (hit !== undefined) return hit;

    for (const duration of allowedDurations) {
      const next = compose(remaining - duration);
      if (next) {
        const candidate = [duration, ...next];
        memo.set(remaining, candidate);
        return candidate;
      }
    }

    memo.set(remaining, null);
    return null;
  };

  type CandidatePlan = {
    plan: number[];
    deltaAbs: number;
    prefersLonger: number;
    chunkCount: number;
  };

  // Pick the plan closest to target, prefer fewer longer clips
  const chooseBetter = (
    a: CandidatePlan | null,
    b: CandidatePlan,
  ): CandidatePlan => {
    if (!a) return b;
    if (b.deltaAbs !== a.deltaAbs) return b.deltaAbs < a.deltaAbs ? b : a;
    if (b.prefersLonger !== a.prefersLonger)
      return b.prefersLonger > a.prefersLonger ? b : a;
    if (b.chunkCount !== a.chunkCount)
      return b.chunkCount < a.chunkCount ? b : a;
    return a;
  };

  let best: CandidatePlan | null = null;
  for (let delta = 0; delta <= 10; delta += 1) {
    const upPlan = compose(target + delta);
    if (upPlan) {
      best = chooseBetter(best, {
        plan: upPlan,
        deltaAbs: delta,
        prefersLonger: 1,
        chunkCount: upPlan.length,
      });
    }

    if (delta > 0) {
      const downTotal = target - delta;
      if (downTotal >= minAllowed) {
        const downPlan = compose(downTotal);
        if (downPlan) {
          best = chooseBetter(best, {
            plan: downPlan,
            deltaAbs: delta,
            prefersLonger: 0,
            chunkCount: downPlan.length,
          });
        }
      }
    }

    if (best && best.deltaAbs === 0) break;
  }

  if (!best) {
    throw new Error(`Unable to build clip plan for ${safeTotal}s.`);
  }

  return best.plan;
}

// Build prompt string for a chunk, including continuity hints
function chunkPrompt(basePrompt: string, chunk: SceneChunk): string {
  const lines = [
    basePrompt,
    `Scene ${chunk.sceneNumber}, chunk ${chunk.chunkIndex + 1}/${chunk.chunkCount}.`,
    `Visual direction: ${chunk.visualPrompt}`,
    `Narration timing anchor: ${chunk.narration}`,
    `Target duration: ${chunk.durationSeconds}s`,
  ];

  if (chunk.chunkIndex === 0) {
    // First chunk — establish continuity
    if (chunk.stateRef) lines.push(`Continuity stateRef: ${chunk.stateRef}`);
    if (chunk.continuityAnchors?.length)
      lines.push(`Continuity anchors: ${chunk.continuityAnchors.join(", ")}`);
    lines.push(
      chunk.continuityPrompt ??
        "Maintain continuity with previous chunks. No fabricated facts.",
    );
  } else {
    // Later chunks — carry forward continuity
    if (chunk.stateRef) lines.push(`Reuse stateRef: ${chunk.stateRef}`);
    if (chunk.continuityAnchors?.length)
      lines.push(`Keep anchors visible: ${chunk.continuityAnchors.join(", ")}`);
    lines.push(
      chunk.continuityPrompt
        ? `Continue with: ${chunk.continuityPrompt}`
        : "Maintain continuity with previous chunks.",
    );
  }

  return lines.join("\n");
}

// Build flat list of chunks from all scenes in the request
export function buildSceneChunks(input: {
  request: NormalizedRenderRequest;
  maxClipSeconds: number;
}): Array<SceneChunk & { prompt: string }> {
  // Base prompt comes from xAI metadata or hookLine
  const basePrompt =
    input.request.xai?.prompt ??
    input.request.prompt ??
    input.request.hookLine ??
    "Create a cinematic scene.";

  // Scene metadata from xAI payload
  const sceneMetadataList = input.request.xai?.sceneMetadata ?? [];

  const chunks: Array<SceneChunk & { prompt: string }> = [];

  for (const scene of input.request.scenes) {
    // Match metadata by scene number
    const sceneMetadata = sceneMetadataList.find(
      (item) => item.sceneNumber === scene.sceneNumber,
    );
    const durations = splitDuration(
      scene.durationSeconds,
      input.maxClipSeconds,
    );
    const chunkCount = durations.length;

    durations.forEach((durationSeconds, chunkIndex) => {
      const chunk: SceneChunk = {
        chunkId: `${scene.sceneNumber}-${chunkIndex + 1}`,
        sceneNumber: scene.sceneNumber,
        chunkIndex,
        chunkCount,
        durationSeconds,
        visualPrompt: scene.visualPrompt,
        narration: scene.narration,
        imageUrl: scene.imageUrl ?? null,
        stateRef: sceneMetadata?.stateRef,
        continuityAnchors: sceneMetadata?.continuityAnchors,
        continuityPrompt: sceneMetadata?.continuityPrompt,
      };

      chunks.push({ ...chunk, prompt: chunkPrompt(basePrompt, chunk) });
    });
  }

  return chunks;
}

// Normalize scene list — fill missing numbers, sort, floor durations
export function normalizeScenes(scenes: RenderScene[]): RenderScene[] {
  return scenes
    .map((scene, index) => ({
      ...scene,
      sceneNumber: scene.sceneNumber || index + 1,
      durationSeconds: Math.max(1, Math.floor(scene.durationSeconds)),
      imageUrl: scene.imageUrl ?? null,
    }))
    .sort((a, b) => a.sceneNumber - b.sceneNumber);
}
