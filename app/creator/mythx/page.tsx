// MythX — Autobiography video from X profile
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilmIcon, SendIcon, ClockIcon } from "@/components/ui/AppIcons";

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

export default function MythXPage() {
  const [profileInput, setProfileInput] = useState("");
  const [state, setState] = useState<GenerationState>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore saved input
  useEffect(() => {
    const saved = localStorage.getItem("creator-mythx-profile");
    if (saved) setProfileInput(saved);
  }, []);

  // Save input
  useEffect(() => {
    localStorage.setItem("creator-mythx-profile", profileInput);
  }, [profileInput]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!profileInput.trim()) {
      setError("Please enter an X profile handle or URL");
      return;
    }

    setState("loading");
    setError(null);
    setResult(null);
    setProgress("Analyzing X profile...");

    try {
      const res = await fetch("/api/video/mythx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: profileInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check for rate limit
        if (res.status === 429 && data.rateLimit) {
          setResult({
            jobId: "",
            status: "rate_limited",
            rateLimit: data.rateLimit,
            message: `This profile has reached today's limit (${data.rateLimit.limit} videos/day)`,
          });
          setState("complete");
          return;
        }
        throw new Error(data.error || data.message || "Failed to start generation");
      }

      setResult(data);
      setProgress("Video generation started. This takes a few minutes...");

      // Poll for completion
      if (data.jobId) {
        pollJobStatus(data.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setState("error");
    }
  }, [profileInput]);

  const pollJobStatus = useCallback((jobId: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

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
            <p className="eyebrow">MythX — Autobiographical Cinema</p>
            <h1 className="font-display">Turn an X profile into a movie.</h1>
            <p className="route-summary">
              Scrapes the last 16 tweets and creates a cinematic autobiography. Never about money — about personality, ideas, and story.
            </p>
          </section>

          {/* Video Specs */}
          <div className="flex flex-wrap gap-2">
            {["16:9", "720p", "With Sound"].map((spec) => (
              <span
                key={spec}
                className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Input */}
          <div className="surface-card panel p-5">
            <div className="field">
              <span>X Profile</span>
              <input
                type="text"
                value={profileInput}
                onChange={(e) => setProfileInput(e.target.value)}
                placeholder="@username or https://x.com/username"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                disabled={state === "loading"}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={state === "loading" || !profileInput.trim()}
              className="button-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {state === "loading" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FilmIcon className="w-4 h-4" />
                  Generate Autobiography
                </>
              )}
            </button>
          </div>

          {/* Progress */}
          {state === "loading" && (
            <div className="surface-card panel p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
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
                      <p className="text-xs text-gray-500 mt-2">
                        Resets at {new Date(result.rateLimit.resetsAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : result.videoUrl ? (
                <div className="surface-card panel p-4">
                  <video
                    src={result.videoUrl}
                    controls
                    playsInline
                    className="aspect-video w-full rounded-xl"
                  />
                  <p className="text-sm text-green-400 mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Video ready!
                  </p>
                </div>
              ) : (
                <div className="surface-card panel p-4">
                  <p className="text-sm text-gray-300">{progress}</p>
                  <p className="text-xs text-gray-500 mt-2">
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
                className="text-sm text-purple-400 mt-3 hover:underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
