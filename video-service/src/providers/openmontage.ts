import { access, mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { getVideoServiceEnv } from "../env";

export interface OpenMontageInputScene {
  clipPath: string;
  sceneNumber: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
}

export interface OpenMontageRenderInput {
  jobId: string;
  outputDirectory: string;
  compositionId?: string;
  openingTitle?: string | null;
  scenes: OpenMontageInputScene[];
}

interface TimelineScene {
  id: string;
  kind: "video" | "title";
  startSeconds: number;
  durationSeconds: number;
  src?: string;
  text?: string;
  tone?: "cold" | "steel" | "void" | "neutral";
  accent?: string;
  intensity?: number;
}

function resolveExecutable(binary: string): string {
  if (process.platform === "win32" && !path.extname(binary)) {
    return `${binary}.cmd`;
  }
  return binary;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function toneForIndex(index: number): "cold" | "steel" | "void" | "neutral" {
  const tones: Array<"cold" | "steel" | "void" | "neutral"> = [
    "cold",
    "steel",
    "void",
    "neutral",
  ];
  return tones[index % tones.length] ?? "cold";
}

function toTitle(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "UNTITLED";
  }
  return compact.toUpperCase().slice(0, 96);
}

function buildTimelineScenes(input: OpenMontageRenderInput): TimelineScene[] {
  let cursor = 0;
  const scenes: TimelineScene[] = [];

  if (input.openingTitle?.trim()) {
    scenes.push({
      id: "opening-title",
      kind: "title",
      startSeconds: 0,
      durationSeconds: 2,
      text: toTitle(input.openingTitle),
      accent: "#9ddcff",
      intensity: 1,
    });
    cursor += 2;
  }

  input.scenes.forEach((scene, index) => {
    scenes.push({
      id: `scene-${scene.sceneNumber}-${index + 1}`,
      kind: "video",
      startSeconds: cursor,
      durationSeconds: scene.durationSeconds,
      src: scene.clipPath,
      tone: toneForIndex(index),
    });
    cursor += scene.durationSeconds;
  });

  return scenes;
}

function buildRenderCommand(input: {
  compositionId: string;
  outputPath: string;
  propsPath: string;
}) {
  const env = getVideoServiceEnv();
  if (env.OPENMONTAGE_RUN_COMMAND?.trim()) {
    const command = env.OPENMONTAGE_RUN_COMMAND
      .replace(/\{composition\}/g, input.compositionId)
      .replace(/\{output\}/g, input.outputPath)
      .replace(/\{props\}/g, input.propsPath);
    return { shellCommand: command };
  }

  return {
    command: resolveExecutable(env.OPENMONTAGE_NODE_BIN),
    args: [
      "remotion",
      "render",
      "src/index.tsx",
      input.compositionId,
      input.outputPath,
      "--props",
      input.propsPath,
      "--codec",
      "h264",
    ],
  };
}

function runProcess(input: {
  command?: string;
  args?: string[];
  shellCommand?: string;
  cwd: string;
  timeoutMs: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = input.shellCommand
      ? spawn(input.shellCommand, {
          cwd: input.cwd,
          shell: true,
          stdio: "pipe",
        })
      : spawn(input.command!, input.args ?? [], {
          cwd: input.cwd,
          shell: false,
          stdio: "pipe",
        });

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`OpenMontage command timed out after ${input.timeoutMs}ms.`));
    }, input.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `OpenMontage command failed with exit code ${code}.\n${stderr || stdout}`.trim(),
        ),
      );
    });
  });
}

async function ensureRepoReady(): Promise<string> {
  const env = getVideoServiceEnv();
  const repoDir = path.resolve(env.OPENMONTAGE_REPO_DIR);
  const composerDir = path.join(repoDir, "remotion-composer");

  if (!(await pathExists(path.join(composerDir, "package.json")))) {
    if (await pathExists(repoDir)) {
      await rm(repoDir, { recursive: true, force: true });
    }
    await mkdir(path.dirname(repoDir), { recursive: true });
    await runProcess({
      command: resolveExecutable("git"),
      args: ["clone", "--depth", "1", env.OPENMONTAGE_GIT_URL, repoDir],
      cwd: path.dirname(repoDir),
      timeoutMs: env.OPENMONTAGE_RENDER_TIMEOUT_MS,
    });
  }

  if (!(await pathExists(path.join(composerDir, "node_modules")))) {
    await runProcess({
      command: resolveExecutable("npm"),
      args: ["install", "--no-audit", "--no-fund"],
      cwd: composerDir,
      timeoutMs: env.OPENMONTAGE_RENDER_TIMEOUT_MS,
    });
  }

  return composerDir;
}

export class OpenMontageRenderer {
  async render(input: OpenMontageRenderInput): Promise<string> {
    const env = getVideoServiceEnv();
    const composerDir = await ensureRepoReady();
    await mkdir(input.outputDirectory, { recursive: true });

    const outputPath = path.join(input.outputDirectory, "final.mp4");
    const propsPath = path.join(input.outputDirectory, "props.json");
    const props = {
      scenes: buildTimelineScenes(input),
      titleFontSize: 78,
      titleWidth: 1320,
      signalLineCount: 18,
    };

    await writeFile(propsPath, JSON.stringify(props, null, 2), "utf8");

    const command = buildRenderCommand({
      compositionId: input.compositionId ?? env.OPENMONTAGE_COMPOSITION_ID,
      outputPath,
      propsPath,
    });

    await runProcess({
      ...command,
      cwd: composerDir,
      timeoutMs: env.OPENMONTAGE_RENDER_TIMEOUT_MS,
    });

    if (!(await pathExists(outputPath))) {
      throw new Error("OpenMontage render finished without producing final.mp4.");
    }

    return outputPath;
  }
}
