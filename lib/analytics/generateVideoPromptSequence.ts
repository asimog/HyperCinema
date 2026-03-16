import { CompileVideoSceneInput, compileVideoPromptSequence } from "./videoCoherence";
import { SceneState, VideoIdentitySheet, VideoPromptScene } from "./types";

export function generateVideoPromptSequence(input: {
  identity: VideoIdentitySheet;
  sceneStates: SceneState[];
  sceneInputs: CompileVideoSceneInput[];
}): VideoPromptScene[] {
  return compileVideoPromptSequence({
    identity: input.identity,
    sceneStates: input.sceneStates,
    sceneInputs: input.sceneInputs,
  });
}
