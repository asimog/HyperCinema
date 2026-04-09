import { gatherContext, type AnalystReport } from "@/lib/agents/analyst";
import {
  writeScript,
  type ScriptOutput,
  adaptForFormat,
} from "@/lib/agents/writer";
import {
  directVisuals,
  chooseStyle,
  type VisualDirection,
} from "@/lib/agents/director";
import { generateVideo, type RenderResult } from "@/lib/agents/producer";
import { logger } from "@/lib/logging/logger";

// ── Types ──────────────────────────────────────────────────

export type PipelineInputType = "mythx" | "wallet" | "coin" | "random";

export interface PipelineResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

export interface PipelineArtifacts {
  report: AnalystReport;
  script: ScriptOutput;
  direction: VisualDirection;
  render: RenderResult;
}

// ── Orchestrator ───────────────────────────────────────────

/**
 * Coordinates all 4 agents in sequence:
 * 1. Analyst scrapes data
 * 2. Writer creates script
 * 3. Director plans visuals
 * 4. Producer generates video
 *
 * Returns result with video URL or error.
 */
export async function runPipeline(
  input: string,
  type: PipelineInputType,
  jobId: string,
): Promise<PipelineResult> {
  const startTime = Date.now();

  logger.info("orchestrator_pipeline_started", {
    component: "agents_orchestrator",
    stage: "runPipeline",
    jobId,
    type,
    inputPreview: input.slice(0, 100),
  });

  let artifacts: PipelineArtifacts | undefined;

  try {
    // Stage 1: Analyst — scrape and analyze data
    logger.info("orchestrator_stage_analyst", {
      component: "agents_orchestrator",
      stage: "analyst",
      jobId,
      type,
    });

    const report = await gatherContext(input, type);

    logger.info("orchestrator_stage_analyst_complete", {
      component: "agents_orchestrator",
      stage: "analyst",
      jobId,
      mood: report.mood,
      themeCount: report.keyThemes.length,
    });

    // Stage 2: Writer — create narrative/script
    logger.info("orchestrator_stage_writer", {
      component: "agents_orchestrator",
      stage: "writer",
      jobId,
    });

    const script = await writeScript(report);

    logger.info("orchestrator_stage_writer_complete", {
      component: "agents_orchestrator",
      stage: "writer",
      jobId,
      sceneCount: script.scenes.length,
    });

    // Stage 3: Director — plan visual style and composition
    logger.info("orchestrator_stage_director", {
      component: "agents_orchestrator",
      stage: "director",
      jobId,
    });

    const aspectRatio = "1:1"; // Default square
    const direction = await directVisuals(script, aspectRatio);

    logger.info("orchestrator_stage_director_complete", {
      component: "agents_orchestrator",
      stage: "director",
      jobId,
      style: direction.style,
      pacing: direction.pacing,
    });

    // Stage 4: Producer — generate video
    logger.info("orchestrator_stage_producer", {
      component: "agents_orchestrator",
      stage: "producer",
      jobId,
    });

    const render = await generateVideo(script, direction, jobId);

    artifacts = { report, script, direction, render };

    if (!render.success) {
      logger.warn("orchestrator_pipeline_render_failed", {
        component: "agents_orchestrator",
        stage: "producer",
        jobId,
        errorCode: "render_failed",
        errorMessage: render.error,
      });

      return {
        success: false,
        error: render.error ?? "Video render failed without an error message.",
      };
    }

    const elapsedMs = Date.now() - startTime;

    logger.info("orchestrator_pipeline_complete", {
      component: "agents_orchestrator",
      stage: "runPipeline",
      jobId,
      elapsedMs,
      videoUrl: render.videoUrl?.slice(0, 100),
    });

    return {
      success: true,
      videoUrl: render.videoUrl,
    };
  } catch (error) {
    const elapsedMs = Date.now() - startTime;

    logger.error("orchestrator_pipeline_failed", {
      component: "agents_orchestrator",
      stage: "runPipeline",
      jobId,
      elapsedMs,
      errorCode: "pipeline_error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Pipeline failed with an unknown error.",
    };
  }
}

/**
 * Runs only the analysis and script stages (no video generation).
 * Useful for previewing content before committing to a render.
 */
export async function runPreviewPipeline(
  input: string,
  type: PipelineInputType,
  jobId: string,
): Promise<{
  success: boolean;
  report?: AnalystReport;
  script?: ScriptOutput;
  error?: string;
}> {
  logger.info("orchestrator_preview_pipeline_started", {
    component: "agents_orchestrator",
    stage: "runPreviewPipeline",
    jobId,
    type,
  });

  try {
    // Stage 1: Analyst
    const report = await gatherContext(input, type);

    // Stage 2: Writer
    const script = await writeScript(report);

    logger.info("orchestrator_preview_pipeline_complete", {
      component: "agents_orchestrator",
      stage: "runPreviewPipeline",
      jobId,
      sceneCount: script.scenes.length,
    });

    return {
      success: true,
      report,
      script,
    };
  } catch (error) {
    logger.error("orchestrator_preview_pipeline_failed", {
      component: "agents_orchestrator",
      stage: "runPreviewPipeline",
      jobId,
      errorCode: "preview_pipeline_error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Preview pipeline failed.",
    };
  }
}
