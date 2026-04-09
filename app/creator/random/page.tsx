// Random Video — one-click TikTok-style video generation
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SparkIcon, ClockIcon } from "@/components/ui/AppIcons";

type GenerationState = "idle" | "loading" | "complete" | "error";

interface JobResult {
  jobId: string;
  videoUrl?: string | null;
  status: string;
  message?: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetsAt: string;
  };
}

export default function RandomVideoPage() {
  const [state, setState] = useState<GenerationState>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    setState("loading");
    setError(null);
    setResult(null);
    setProgress("Generating something random for you...");

    try {
      const res = await fetch("/api/video/random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.rateLimit) {
          setResult({
            jobId: "",
            status: "rate_limited",
            rateLimit: data.rateLimit,
            message: data.message || "Daily limit reached",
          });
          setState("complete");
          return;
        }
        throw new Error(data.error || data.message || "Failed to start generation");
      }

      setResult(data);
      setProgress("Video generation started. This takes a minute...");

      if (data.jobId) {
        pollJobStatus(data.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setState("error");
    }
  }, []);

  const pollJobStatus = useCallback((jobId: string) => {
    let attempts = 0;
    const maxAttempts = 120;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setProgress("Generation is taking longer than expected. Check back later.");
        return;
      }
      attempts++;

      try {
        const res = await fetch(`/api/video/${jobId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to check status");

        setProgress(data.status === "complete" ? "Video is ready!" : data.progress || "Processing...");

        if (data.status === "complete") {
          setResult((prev) => ({
            ...(prev ?? data),
            videoUrl: data.videoUrl ?? prev?.videoUrl,
            status: "complete",
          }));
          setState("complete");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }

        if (data.status === "failed") {
          setError(data.error || "Video generation failed");
          setState("error");
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
      } catch {
        // Silently retry
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 5000);
  }, []);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">Random Video Generator</p>
            <h1 className="font-display">No input. Just vibes.</h1>
            <p className="route-summary">
              One click and you get a random TikTok-style video. No prompt needed — the AI picks everything.
            </p>
          </section>

          {/* Video Specs */}
          <div className="flex flex-wrap gap-2">
            {["9:16", "1080p", "TikTok Style", "With Sound"].map((spec) => (
              <span
                key={spec}
                className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Generate Button */}
          <div className="surface-card panel p-8 text-center">
            <div className="text-5xl mb-4">
              {state === "loading" ? (
                <div className="w-12 h-12 border-4 border-pink-400/30 border-t-pink-400 rounded-full animate-spin mx-auto" />
              ) : (
                "🎲"
              )}
            </div>

            <h2 className="font-display text-2xl mb-2">
              {state === "loading" ? "Generating..." : "Ready?"}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {state === "loading"
                ? progress
                : "Click the button and see what happens."}
            </p>

            <button
              onClick={handleGenerate}
              disabled={state === "loading"}
              className="button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 text-lg py-4"
            >
              <SparkIcon className="w-5 h-5" />
              {state === "loading" ? "Generating..." : "Generate Random Video"}
            </button>
          </div>

          {/* Progress */}
          {state === "loading" && (
            <div className="surface-card panel p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
              <p className="text-sm text-gray-300">{progress}</p>
            </div>
          )}

          {/* Result */}
          {state === "complete" && result && (
            <div className="space-y-4">
              {result.rateLimit ? (
                <div className="surface-card panel p-5 border border-yellow-500/30">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="font-medium text-yellow-300">Rate Limited</p>
                      <p className="text-sm text-gray-400 mt-1">{result.message}</p>
                      {result.rateLimit.resetsAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Resets at {new Date(result.rateLimit.resetsAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : result.videoUrl ? (
                <div className="surface-card panel p-4">
                  <div className="max-w-sm mx-auto">
                    <video
                      src={result.videoUrl}
                      controls
                      playsInline
                      className="aspect-[9/16] w-full rounded-xl"
                    />
                  </div>
                  <p className="text-sm text-green-400 mt-3 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Video ready!
                  </p>
                </div>
              ) : (
                <div className="surface-card panel p-4">
                  <p className="text-sm text-gray-300 text-center">{progress}</p>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Job ID: {result.jobId}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {state === "error" && error && (
            <div className="surface-card panel p-5 border border-red-500/30">
              <p className="text-red-400 font-medium">Something went wrong</p>
              <p className="text-sm text-gray-400 mt-2">{error}</p>
              <button
                onClick={() => setState("idle")}
                className="text-sm text-pink-400 mt-3 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Rate Limits Info */}
          <section className="surface-card panel p-5">
            <h3 className="font-semibold text-sm mb-2">Daily Limit</h3>
            <p className="text-xs text-gray-400">
              <span className="text-pink-400">Random:</span> 5 videos per IP / day
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
