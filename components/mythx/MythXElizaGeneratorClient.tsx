// MythX generator - tweet to video UI
"use client";

import React, { useState, useCallback, useEffect } from "react";

// Available cinematic style options
const STYLE_OPTIONS = [
  { id: "hyperflow_assembly", label: "Hyperflow Assembly", description: "Fluid, interconnected" },
  { id: "vhs_cinema", label: "VHS Cinema", description: "Retro analog warmth" },
  { id: "black_and_white_noir", label: "B&W Noir", description: "Classic film noir" },
  { id: "double_exposure", label: "Double Exposure", description: "Layered imagery" },
  { id: "glitch_digital", label: "Glitch Digital", description: "Cyberpunk aesthetics" },
  { id: "found_footage_raw", label: "Found Footage", description: "Raw documentary style" },
  { id: "split_screen_diptych", label: "Split Screen", description: "Parallel narratives" },
  { id: "film_grain_70s", label: "Film Grain 70s", description: "Vintage cinema look" },
];

// SOL prices for each duration tier
const PRICE_1D = 0.004;
const PRICE_2D = 0.007;

// Main MythX video generator component
export default function MythXElizaGeneratorClient() {
  const [profileInput, setProfileInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("vhs_cinema");
  const [duration, setDuration] = useState<"1d" | "2d">("1d");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressStage, setProgressStage] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  // Restore saved profile input from storage
  useEffect(() => {
    const saved = localStorage.getItem("mythx-profile");
    if (saved) setProfileInput(saved);
  }, []);

  // Save profile input to local storage
  useEffect(() => {
    localStorage.setItem("mythx-profile", profileInput);
  }, [profileInput]);

  // Handle video generation button click
  const handleGenerate = useCallback(async () => {
    if (!profileInput.trim()) {
      setError("Please enter an X profile handle or URL");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setJobId(null);
    setProgressStage(0);
    setProgress("Initializing MythXEliza agent...");

    try {
      // Step 1: Create job via API
      setProgress("Creating job...");
      setProgressStage(10);

      const createResponse = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKind: "mythx",
          packageType: duration,
          subjectName: profileInput.trim(),
          sourceMediaUrl: profileInput.trim().startsWith("http")
            ? profileInput.trim()
            : `https://x.com/${profileInput.trim().replace("@", "")}`,
          stylePreset: selectedStyle,
          audioEnabled: true,
          experience: "mythx",
        }),
      });

      if (!createResponse.ok) {
        const err = await createResponse.json();
        throw new Error(err.error || err.message || "Job creation failed");
      }

      const jobData = await createResponse.json();
      setJobId(jobData.jobId);
      setProgressStage(25);
      setProgress("Job created. Awaiting payment...");

      // Redirect to job page for payment and processing
      window.location.href = `/job/${jobData.jobId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsGenerating(false);
    }
  }, [profileInput, selectedStyle, duration, isAgent]);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#f4efe8] md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <section className="panel trend-hero trend-hero--sleek">
            <p className="eyebrow">MythX — Autobiographical Cinema</p>
            <h1 className="font-display">Turn an X profile into a movie.</h1>
            <p className="route-summary">
              Last 42 tweets. One cinematic story. Powered by ElizaOS AI agents.
            </p>
          </section>

          {/* Agent Mode Toggle */}
          <div className="surface-card panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">🤖 Agent Mode</p>
                <p className="text-xs text-gray-400 mt-1">
                  I am an AI agent. I will pay via x402 USDC.
                </p>
              </div>
              <button
                onClick={() => setIsAgent(!isAgent)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isAgent
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {isAgent ? "Agent Active" : "I Am an Agent"}
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="surface-card panel p-6 space-y-6">
            <div className="field">
              <span>X profile handle or URL</span>
              <input
                type="text"
                value={profileInput}
                onChange={(e) => setProfileInput(e.target.value)}
                placeholder="@username or https://x.com/username"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isGenerating}
              />
            </div>

            {/* Duration */}
            <div>
              <span className="text-sm font-medium text-gray-400">Duration</span>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setDuration("1d")}
                  disabled={isGenerating}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    duration === "1d"
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="text-lg font-bold">30 seconds</div>
                  <div className="text-sm text-gray-400">
                    {isAgent ? "$2.00 USDC" : `${PRICE_1D} SOL`}
                  </div>
                </button>
                <button
                  onClick={() => setDuration("2d")}
                  disabled={isGenerating}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    duration === "2d"
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <div className="text-lg font-bold">60 seconds</div>
                  <div className="text-sm text-gray-400">
                    {isAgent ? "$3.00 USDC" : `${PRICE_2D} SOL`}
                  </div>
                </button>
              </div>
            </div>

            {/* Style */}
            <div>
              <span className="text-sm font-medium text-gray-400">Cinematic Style</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    disabled={isGenerating}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedStyle === s.id
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-sm font-medium">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !profileInput.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-all"
            >
              {isGenerating ? "Creating Job..." : isAgent ? "Generate via x402" : `Create Video — ${duration === "1d" ? PRICE_1D : PRICE_2D} SOL`}
            </button>

            {/* Progress */}
            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-400">{progress}</span>
                  <span className="text-gray-500">{progressStage}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressStage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <div className="text-red-400 font-medium">Error</div>
                <div className="text-red-300 text-sm mt-1">{error}</div>
              </div>
            )}

            {/* Job created */}
            {jobId && (
              <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
                <p className="text-green-400 font-medium">✅ Job created!</p>
                <a href={`/job/${jobId}`} className="text-cyan-400 underline text-sm">
                  View status and pay →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
