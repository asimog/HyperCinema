import { NormalizedRenderRequest, RenderScene } from "../types";

export interface SceneChunk {
  chunkId: string;
  sceneNumber: number;
  chunkIndex: number;
  chunkCount: number;
  durationSeconds: number;
  visualPrompt: string;
  narration: string;
  imageUrl: string | null;
}

function splitDuration(totalSeconds: number, maxSeconds: number): number[] {
  const safeTotal = Math.max(1, Math.floor(totalSeconds));
  const allowedDurations = [8, 6, 4].filter((value) => value <= maxSeconds);
  if (!allowedDurations.length) {
    throw new Error(`No valid Veo clip durations available at max=${maxSeconds}s.`);
  }

  const minAllowed = allowedDurations[allowedDurations.length - 1]!;
  const target = Math.max(minAllowed, safeTotal);
  const memo = new Map<number, number[] | null>();

  const compose = (remaining: number): number[] | null => {
    if (remaining === 0) {
      return [];
    }
    if (remaining < 0) {
      return null;
    }

    const cached = memo.get(remaining);
    if (cached !== undefined) {
      return cached;
    }

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

  const chooseBetter = (a: CandidatePlan | null, b: CandidatePlan): CandidatePlan => {
    if (!a) {
      return b;
    }
    if (b.deltaAbs !== a.deltaAbs) {
      return b.deltaAbs < a.deltaAbs ? b : a;
    }
    if (b.prefersLonger !== a.prefersLonger) {
      return b.prefersLonger > a.prefersLonger ? b : a;
    }
    if (b.chunkCount !== a.chunkCount) {
      return b.chunkCount < a.chunkCount ? b : a;
    }
    return a;
  };

  let best: CandidatePlan | null = null;
  for (let delta = 0; delta <= 10; delta += 1) {
    const upTotal = target + delta;
    const upPlan = compose(upTotal);
    if (upPlan) {
      best = chooseBetter(best, {
        plan: upPlan,
        deltaAbs: Math.abs(upTotal - target),
        prefersLonger: upTotal >= target ? 1 : 0,
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
            deltaAbs: Math.abs(downTotal - target),
            prefersLonger: downTotal >= target ? 1 : 0,
            chunkCount: downPlan.length,
          });
        }
      }
    }

    if (best && best.deltaAbs === 0) {
      break;
    }
  }

  if (!best) {
    throw new Error(`Unable to build valid Veo durations for ${safeTotal}s.`);
  }

  return best.plan;
}

function chunkPrompt(basePrompt: string, chunk: SceneChunk): string {
  return [
    basePrompt,
    `Scene ${chunk.sceneNumber}, chunk ${chunk.chunkIndex + 1}/${chunk.chunkCount}.`,
    `Visual direction: ${chunk.visualPrompt}`,
    `Narration timing anchor: ${chunk.narration}`,
    `Target duration: ${chunk.durationSeconds}s`,
    "Maintain continuity with previous chunks and avoid introducing fabricated trade facts.",
  ].join("\n");
}

export function buildSceneChunks(input: {
  request: NormalizedRenderRequest;
  maxClipSeconds: number;
}): Array<SceneChunk & { prompt: string }> {
  const basePrompt =
    input.request.metadata?.prompt ??
    input.request.prompt ??
    input.request.hookLine ??
    "Create a cinematic scene.";

  const chunks: Array<SceneChunk & { prompt: string }> = [];

  for (const scene of input.request.scenes) {
    const durations = splitDuration(scene.durationSeconds, input.maxClipSeconds);
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
      };

      chunks.push({
        ...chunk,
        prompt: chunkPrompt(basePrompt, chunk),
      });
    });
  }

  return chunks;
}

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
