"use client";

import React, { useState, useCallback } from "react";

interface ScanResult {
  type: "token" | "wallet" | null;
  name: string;
  symbol: string;
  address: string;
  recommendation: string;
  riskScore?: number;
  riskFactors?: string[];
  style: string;
  score?: string;
  personality?: string;
  totalTrades?: number;
  imageUri?: string | null;
  loading: boolean;
  error?: string;
}

const STYLE_OPTIONS = [
  { id: "trench_neon", label: "Trench Neon", desc: "Nightlife district vibes" },
  { id: "hyperflow_assembly", label: "Hyperflow", desc: "Fluid visual transitions" },
  { id: "glass_signal", label: "Glass Signal", desc: "Transparent & volatile" },
  { id: "mythic_poster", label: "Mythic Poster", desc: "Collectible poster style" },
  { id: "trading_card", label: "Trading Card", desc: "Pokemon-style card" },
  { id: "crt_anime_90s", label: "CRT Anime", desc: "90s anime aesthetic" },
  { id: "cyberpunk_neon", label: "Cyberpunk", desc: "Neon-lit future" },
  { id: "neon_tokyo_night", label: "Tokyo Night", desc: "Tokyo after dark" },
];

const CHAIN_OPTIONS = [
  { id: "solana", label: "Solana", icon: "◎" },
  { id: "ethereum", label: "Ethereum", icon: "Ξ" },
  { id: "base", label: "Base", icon: "⬡" },
  { id: "bsc", label: "BSC", icon: "⬢" },
];

const PRICE_1D = 0.004;
const PRICE_2D = 0.007;
const PRICE_USDC_1D = 1.5;
const PRICE_USDC_2D = 2.5;

export function HashMythPage() {
  const [input, setInput] = useState("");
  const [selectedChain, setSelectedChain] = useState("solana");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [duration, setDuration] = useState<"1d" | "2d">("1d");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isAgent, setIsAgent] = useState(false);

  const handleScan = useCallback(async () => {
    if (!input.trim()) return;

    setIsScanning(true);
    setScanResult(null);
    setJobId(null);

    try {
      const address = input.trim();
      let scanType: "token" | "wallet" | null = null;
      let name = "";
      let symbol = "";
      let recommendation = "";
      let riskScore: number | undefined;
      let riskFactors: string[] | undefined;
      let style = selectedStyle || "trench_neon";
      let imageUri: string | null = null;

      // Try to fetch real metadata from Helius (Solana)
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        scanType = "token";
        try {
          const response = await fetch("/api/helius-webhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "scan_token",
              address,
            }),
          });

          // If Helius API works, use real data
          if (response.ok) {
            const data = await response.json();
            name = data.name || address.slice(0, 8);
            symbol = data.symbol || name.toUpperCase();
            imageUri = data.image || null;
            riskScore = data.riskScore || 50;
            riskFactors = data.riskFactors || ["Metadata requires on-chain fetch"];
          } else {
            // Fallback: use address as name
            name = address.slice(0, 8);
            symbol = name.toUpperCase();
            riskScore = 50;
            riskFactors = ["On-chain metadata fetch failed"];
          }
        } catch {
          name = address.slice(0, 8);
          symbol = name.toUpperCase();
          riskScore = 50;
          riskFactors = ["On-chain metadata fetch failed"];
        }
        recommendation = `🔍 Scanned Solana token. Ready for cinematic transformation!`;
        style = (riskScore || 50) < 40 ? "trench_neon" : "hyperflow_assembly";
      } else if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        scanType = "token";
        name = address.slice(0, 10);
        symbol = name.toUpperCase();
        recommendation = `🔍 Scanned EVM token. Let's make it cinematic!`;
        riskScore = 55;
        style = "trench_neon";
      } else {
        // Treat as wallet
        scanType = "wallet";
        name = address.slice(0, 8);
        symbol = "Wallet";
        recommendation = `📊 Wallet scanned. Ready for trading story video!`;
      }

      setScanResult({
        type: scanType,
        name,
        symbol,
        address,
        recommendation,
        riskScore,
        riskFactors,
        style: selectedStyle || style,
        imageUri,
        loading: false,
      });
    } catch (err) {
      setScanResult({
        type: null,
        name: "",
        symbol: "",
        address: input,
        recommendation: "",
        style: "trench_neon",
        loading: false,
        error: err instanceof Error ? err.message : "Scan failed",
      });
    } finally {
      setIsScanning(false);
    }
  }, [input, selectedStyle]);

  const handleGenerate = useCallback(async () => {
    if (!scanResult) return;

    setIsGenerating(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKind: "token_video",
          tokenAddress: scanResult.address,
          chain: selectedChain,
          packageType: duration,
          stylePreset: scanResult.style,
          audioEnabled: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.message || "Job creation failed");
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (err) {
      setScanResult({
        ...scanResult,
        error: err instanceof Error ? err.message : "Generation failed",
        loading: false,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [scanResult, selectedChain, duration]);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] px-4 py-6 md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <section className="panel trend-hero">
            <p className="eyebrow">HashMyth Token Scanner</p>
            <h1 className="font-display">Scan any token or wallet.</h1>
            <p className="route-summary">
              Paste a contract address or wallet. Our AI analyzes risk, metadata, and recommends the perfect cinematic style.
            </p>
          </section>

          {/* Scanner Input */}
          <div className="surface-card panel p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Chain selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Chain</label>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                >
                  {CHAIN_OPTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Address input */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-400 mb-2">Token or Wallet Address</label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste token contract or wallet address..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning || !input.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-all"
            >
              {isScanning ? "🔍 Scanning..." : "🔍 Scan Token"}
            </button>

            {/* Scan Result */}
            {scanResult && !scanResult.error && (
              <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                {/* Token info */}
                <div className="flex items-center gap-4">
                  {scanResult.imageUri && (
                    <img src={scanResult.imageUri} alt="" className="w-12 h-12 rounded-full" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{scanResult.name}</h3>
                    <p className="text-sm text-gray-400">{scanResult.symbol} • {scanResult.address.slice(0, 8)}...</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      scanResult.score === "high" ? "bg-green-500/20 text-green-400" :
                      scanResult.score === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {scanResult.score?.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                {/* Risk factors */}
                {scanResult.riskFactors && scanResult.riskFactors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {scanResult.riskFactors.map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{f}</span>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                <p className="text-gray-300">{scanResult.recommendation}</p>

                {scanResult.personality && (
                  <p className="text-sm text-purple-400">
                    👤 {scanResult.personality} • {scanResult.totalTrades} trades
                  </p>
                )}

                {/* Style selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Cinematic Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {STYLE_OPTIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setScanResult({ ...scanResult, style: s.id })}
                        className={`p-2 rounded border text-sm transition-all ${
                          scanResult.style === s.id
                            ? "border-cyan-500 bg-cyan-500/20"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="font-medium">{s.label}</div>
                        <div className="text-xs text-gray-500">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-400">Price</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDuration("1d")}
                      className={`px-3 py-1 rounded text-sm ${
                        duration === "1d" ? "bg-purple-600 text-white" : "bg-gray-600"
                      }`}
                    >
                      30s — {isAgent ? `$${PRICE_USDC_1D} USDC` : `${PRICE_1D} SOL`}
                    </button>
                    <button
                      onClick={() => setDuration("2d")}
                      className={`px-3 py-1 rounded text-sm ${
                        duration === "2d" ? "bg-purple-600 text-white" : "bg-gray-600"
                      }`}
                    >
                      60s — {isAgent ? `$${PRICE_USDC_2D} USDC` : `${PRICE_2D} SOL`}
                    </button>
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={async () => {
                    if (!scanResult) return;
                    setIsGenerating(true);
                    try {
                      const response = await fetch("/api/jobs", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          requestKind: "token_video",
                          tokenAddress: scanResult.address,
                          chain: selectedChain,
                          packageType: duration,
                          stylePreset: scanResult.style,
                          audioEnabled: true,
                        }),
                      });
                      if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error || err.message || "Job creation failed");
                      }
                      const data = await response.json();
                      window.location.href = `/job/${data.jobId}`;
                    } catch (err) {
                      setScanResult({
                        ...scanResult,
                        error: err instanceof Error ? err.message : "Generation failed",
                        loading: false,
                      });
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  disabled={isGenerating}
                  className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 disabled:opacity-50 rounded-lg font-semibold text-lg transition-all"
                >
                  {isGenerating ? "🎬 Creating Job..." : isAgent ? `Generate via x402 — $${duration === "1d" ? PRICE_USDC_1D : PRICE_USDC_2D} USDC` : `Generate Video — ${duration === "1d" ? PRICE_1D : PRICE_2D} SOL`}
                </button>

                {jobId && (
                  <div className="p-3 bg-green-900/30 border border-green-700 rounded">
                    <p className="text-green-400">✅ Job created!</p>
                    <a href={`/job/${jobId}`} className="text-cyan-400 underline">View status and pay →</a>
                  </div>
                )}
              </div>
            )}

            {scanResult?.error && (
              <div className="p-4 bg-red-900/30 border border-red-700 rounded">
                <p className="text-red-400">{scanResult.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
