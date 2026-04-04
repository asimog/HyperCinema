"use client";

import React, { useState, useCallback } from "react";

interface MythXElizaScene {
  sceneNumber: number;
  visualPrompt: string;
  narration?: string;
  style: string;
  durationSeconds: number;
}

interface MythXElizaMetadata {
  profile: {
    displayName: string;
    username: string;
    profileUrl: string;
    description: string | null;
    profileImageUrl: string | null;
  };
  style: string;
  totalScenes: number;
  totalDurationSeconds: number;
}

interface MythXElizaResult {
  videoUrl: string;
  scenes: MythXElizaScene[];
  metadata: MythXElizaMetadata;
}

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

export function MythXElizaGeneratorClient() {
  const [profileInput, setProfileInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("vhs_cinema");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<MythXElizaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!profileInput.trim()) {
      setError("Please enter an X profile handle or URL");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setProgress("Initializing MythXEliza agent...");

    try {
      setProgress("Fetching tweets and analyzing profile...");
      
      const response = await fetch("/api/mythx-eliza/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileInput: profileInput.trim(),
          style: selectedStyle,
          maxTweets: 42,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Generation failed");
      }

      setProgress("Generating cinematic narrative and video scenes...");
      const data = await response.json();

      setProgress("Finalizing your autobiographical video...");
      setResult(data);
      setProgress("Complete!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  }, [profileInput, selectedStyle]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          MythXEliza
        </h1>
        <p className="text-lg text-gray-400">
          Transform X profiles into autobiographical cinematic videos powered by ElizaOS
        </p>
      </div>

      <div className="space-y-6 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            X Profile Handle or URL
          </label>
          <input
            type="text"
            value={profileInput}
            onChange={(e) => setProfileInput(e.target.value)}
            placeholder="@username or https://x.com/username"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isGenerating}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cinematic Style
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={isGenerating}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedStyle === style.id
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="text-sm font-medium text-white">{style.label}</div>
                <div className="text-xs text-gray-400">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !profileInput.trim()}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold text-lg transition-all"
        >
          {isGenerating ? "Generating..." : "Generate Autobiographical Video"}
        </button>

        {isGenerating && progress && (
          <div className="text-center space-y-3">
            <div className="animate-pulse text-purple-400">{progress}</div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <div className="text-red-400 font-medium">Error</div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold text-white">Your Autobiographical Video</h2>
          
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {result.videoUrl ? (
              <video
                src={result.videoUrl}
                controls
                className="w-full h-full"
                poster={result.metadata.profile.profileImageUrl || undefined}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Video processing in progress...
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Profile:</span>
              <span className="text-white ml-2">
                {result.metadata.profile.displayName} (@{result.metadata.profile.username})
              </span>
            </div>
            <div>
              <span className="text-gray-400">Style:</span>
              <span className="text-white ml-2">{result.metadata.style}</span>
            </div>
            <div>
              <span className="text-gray-400">Scenes:</span>
              <span className="text-white ml-2">{result.metadata.totalScenes}</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>
              <span className="text-white ml-2">
                {result.metadata.totalDurationSeconds}s
              </span>
            </div>
          </div>

          {result.scenes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Scene Breakdown</h3>
              {result.scenes.map((scene) => (
                <div key={scene.sceneNumber} className="p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-purple-400 font-medium">Scene {scene.sceneNumber}</span>
                    <span className="text-xs text-gray-400">{scene.durationSeconds}s</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{scene.visualPrompt}</p>
                  {scene.narration && (
                    <p className="text-xs text-gray-500 italic">
                      Narration: {scene.narration}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
