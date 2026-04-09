// HashMyth — Wallet or memecoin scanner to video
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HashIcon, WalletIcon, ClockIcon } from "@/components/ui/AppIcons";

type Mode = "wallet" | "memecoin";
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

const SUPPORTED_CHAINS = [
  { name: "pump.fun", chain: "Solana", icon: "◎" },
  { name: "four.meme", chain: "BNB", icon: "🔶" },
  { name: "clanker.world", chain: "Base", icon: "🔵" },
];

export default function HashMythPage() {
  const [mode, setMode] = useState<Mode>("wallet");
  const [addressInput, setAddressInput] = useState("");
  const [state, setState] = useState<GenerationState>("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Restore saved input
  useEffect(() => {
    const saved = localStorage.getItem("creator-hashmyth-address");
    if (saved) setAddressInput(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("creator-hashmyth-address", addressInput);
  }, [addressInput]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!addressInput.trim()) {
      setError(`Please enter a ${mode === "wallet" ? "wallet" : "contract"} address`);
      return;
    }

    if (mode === "memecoin" && !validateContractAddress(addressInput.trim())) {
      setError(
        "Only memecoins from pump.fun (Solana), four.meme (BNB), or clanker.world (Base) are supported.",
      );
      return;
    }

    setState("loading");
    setError(null);
    setResult(null);
    setProgress(
      mode === "wallet"
        ? "Scanning wallet activity..."
        : "Analyzing memecoin data...",
    );

    try {
      const res = await fetch("/api/video/hashmyth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          address: addressInput.trim(),
        }),
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
      setProgress("Video generation started. This takes a few minutes...");

      if (data.jobId) {
        pollJobStatus(data.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setState("error");
    }
  }, [mode, addressInput]);

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

  const specs = mode === "wallet" ? ["16:9", "720p", "24h Trading History"] : ["1:1", "720p", "Creative Cinema"];

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">HashMyth — On-Chain Cinema</p>
            <h1 className="font-display">Scan the chain. Get a story.</h1>
            <p className="route-summary">
              {mode === "wallet"
                ? "Generate a 24-hour trading history video from any wallet address."
                : "Generate a creative cinematic video from any memecoin contract."}
            </p>
          </section>

          {/* Mode Toggle */}
          <div className="surface-card panel p-2">
            <div className="flex rounded-xl overflow-hidden bg-gray-800/50">
              <button
                onClick={() => setMode("wallet")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === "wallet"
                    ? "bg-cyan-600/30 text-cyan-300"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <WalletIcon className="w-4 h-4" />
                Wallet Address
              </button>
              <button
                onClick={() => setMode("memecoin")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === "memecoin"
                    ? "bg-pink-600/30 text-pink-300"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <HashIcon className="w-4 h-4" />
                Memecoin Address
              </button>
            </div>
          </div>

          {/* Video Specs */}
          <div className="flex flex-wrap gap-2">
            {specs.map((spec) => (
              <span
                key={spec}
                className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Supported Chains (memecoin mode) */}
          {mode === "memecoin" && (
            <div className="surface-card panel p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Supported Sources</p>
              <div className="flex flex-wrap gap-3">
                {SUPPORTED_CHAINS.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5"
                  >
                    <span>{source.icon}</span>
                    <div>
                      <p className="text-sm text-gray-300">{source.name}</p>
                      <p className="text-xs text-gray-500">{source.chain}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Coins from other sources are not supported.
              </p>
            </div>
          )}

          {/* Input */}
          <div className="surface-card panel p-5">
            <div className="field">
              <span>{mode === "wallet" ? "Wallet Address" : "Contract Address"}</span>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder={
                  mode === "wallet"
                    ? "Enter wallet address..."
                    : "Enter memecoin contract address..."
                }
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm"
                disabled={state === "loading"}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={state === "loading" || !addressInput.trim()}
              className="button-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {state === "loading" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <HashIcon className="w-4 h-4" />
                  {mode === "wallet" ? "Generate Trading History Video" : "Generate Memecoin Video"}
                </>
              )}
            </button>
          </div>

          {/* Progress */}
          {state === "loading" && (
            <div className="surface-card panel p-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
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
                  <video
                    src={result.videoUrl}
                    controls
                    playsInline
                    className={
                      mode === "memecoin"
                        ? "aspect-square w-full max-w-sm mx-auto rounded-xl"
                        : "aspect-video w-full rounded-xl"
                    }
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
                className="text-sm text-cyan-400 mt-3 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Rate Limits Info */}
          <section className="surface-card panel p-5">
            <h3 className="font-semibold text-sm mb-2">Daily Limits</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>
                <span className="text-cyan-400">Wallet mode:</span> 2 videos per wallet / day
              </p>
              <p>
                <span className="text-pink-400">Memecoin mode:</span> 10 videos per contract / day
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function validateContractAddress(address: string): boolean {
  // Basic validation — Solana (base58), Ethereum-style (0x...), or any long string
  if (address.length < 32) return false;
  if (address.startsWith("0x") && address.length >= 42) return true;
  if (/^[A-HJ-NP-Za-km-z1-9]+$/.test(address) && address.length >= 32) return true;
  return false;
}
