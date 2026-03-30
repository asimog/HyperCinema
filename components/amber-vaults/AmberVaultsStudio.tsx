"use client";

import Link from "next/link";
import { useState } from "react";

import { CINEMA_PAGE_CONFIGS, CINEMA_PACKAGE_TYPES, getCinemaPackageConfig } from "@/lib/cinema/config";
import type { PackageType, VideoStyleId, RequestedTokenChain } from "@/lib/types/domain";

type RequestKind = "generic_cinema" | "bedtime_story" | "music_video" | "scene_recreation" | "token_video";

const ALL_STYLES: { id: VideoStyleId; label: string; description: string }[] = [
  { id: "hyperflow_assembly", label: "Hyperflow Assembly", description: "Clean control-room cinema edit" },
  { id: "glass_signal", label: "Glass Signal", description: "Minimal, architectural, light-led" },
  { id: "mythic_poster", label: "Mythic Poster", description: "Epic framing, rich color, hero light" },
  { id: "trench_neon", label: "Trench Neon", description: "Neon-lit meme-trench atmosphere" },
  { id: "trading_card", label: "Trading Card", description: "Flat card graphic with bold borders" },
  { id: "crt_anime_90s", label: "90s Anime CRT", description: "Dragon Ball Z / Pokemon CRT scanline aesthetic — cel animation, phosphor glow, speed lines" },
];

const ALL_KINDS: { id: RequestKind; label: string; description: string }[] = [
  { id: "generic_cinema", label: "Generic Cinema", description: "Any topic, brand, meme, or story" },
  { id: "token_video", label: "Token Video", description: "Memecoin / on-chain token trailer" },
  { id: "music_video", label: "Music Video", description: "Lyric-led or beat-driven visual cut" },
  { id: "scene_recreation", label: "Scene Recreation", description: "Recreate a scene from transcript or memory" },
  { id: "bedtime_story", label: "Bedtime Story", description: "Soft narrated story for children" },
];

interface GenerateResponse {
  jobId?: string;
  dispatched?: boolean;
  error?: string;
  message?: string;
}

export function AmberVaultsStudio() {
  const [requestKind, setRequestKind] = useState<RequestKind>("generic_cinema");
  const [packageType, setPackageType] = useState<PackageType>("1d");
  const [stylePreset, setStylePreset] = useState<VideoStyleId>("hyperflow_assembly");
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Subject fields
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [chain, setChain] = useState<RequestedTokenChain>("auto");

  // Advanced fields
  const [requestedPrompt, setRequestedPrompt] = useState("");
  const [sourceMediaUrl, setSourceMediaUrl] = useState("");
  const [sourceTranscript, setSourceTranscript] = useState("");

  // Episode fields
  const [actBreakdown, setActBreakdown] = useState("");
  const [sceneMemories, setSceneMemories] = useState("");
  const [speechNotes, setSpeechNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pkg = getCinemaPackageConfig({ packageType, pricingMode: "private" });

  function buildPrompt(): string {
    const parts = [
      requestedPrompt.trim(),
      actBreakdown.trim() ? `Act breakdown:\n${actBreakdown.trim()}` : "",
      sceneMemories.trim() ? `Scene memories:\n${sceneMemories.trim()}` : "",
      speechNotes.trim() ? `Speeches and dialogue:\n${speechNotes.trim()}` : "",
    ].filter(Boolean);
    return parts.join("\n\n");
  }

  async function generate() {
    setError(null);
    setResult(null);

    if (requestKind === "token_video" && !tokenAddress.trim()) {
      setError("Token address is required.");
      return;
    }
    if (requestKind !== "token_video" && !subjectName.trim()) {
      setError("Subject / title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedPrompt = buildPrompt();
      const body =
        requestKind === "token_video"
          ? {
              requestKind,
              tokenAddress: tokenAddress.trim(),
              chain,
              packageType,
              stylePreset,
              subjectDescription: subjectDescription.trim() || undefined,
              requestedPrompt: combinedPrompt || undefined,
              audioEnabled,
              experience: "funcinema",
            }
          : {
              requestKind,
              subjectName: subjectName.trim(),
              subjectDescription: subjectDescription.trim() || undefined,
              sourceMediaUrl: sourceMediaUrl.trim() || undefined,
              sourceTranscript:
                [sourceTranscript.trim(), sceneMemories.trim(), speechNotes.trim()]
                  .filter(Boolean)
                  .join("\n\n") || undefined,
              packageType,
              stylePreset,
              requestedPrompt: combinedPrompt || undefined,
              audioEnabled: requestKind === "bedtime_story" || requestKind === "music_video" ? true : audioEnabled,
              experience:
                requestKind === "bedtime_story" ? "familycinema" :
                requestKind === "music_video" ? "musicvideo" :
                requestKind === "scene_recreation" ? "recreator" : "funcinema",
            };

      const response = await fetch("/api/admin/free-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as GenerateResponse;
      if (!response.ok || !payload.jobId) {
        throw new Error(payload.message ?? payload.error ?? "Generation failed.");
      }
      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="form-stack">
      {/* Request kind */}
      <div className="field">
        <span>Cinema node</span>
        <select value={requestKind} onChange={(e) => setRequestKind(e.target.value as RequestKind)} disabled={isSubmitting}>
          {ALL_KINDS.map((k) => (
            <option key={k.id} value={k.id}>{k.label} — {k.description}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      {requestKind === "token_video" ? (
        <>
          <div className="field">
            <span>Token address</span>
            <input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="Mint or contract address" disabled={isSubmitting} />
          </div>
          <div className="field">
            <span>Chain</span>
            <select value={chain} onChange={(e) => setChain(e.target.value as RequestedTokenChain)} disabled={isSubmitting}>
              {(["auto", "solana", "ethereum", "bsc", "base"] as const).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div className="field">
          <span>Title / subject</span>
          <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Episode title, scene name, or concept" disabled={isSubmitting} />
        </div>
      )}

      <div className="field">
        <span>Core description</span>
        <textarea rows={3} value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} placeholder="What is this piece about? Characters, world, tone." disabled={isSubmitting} />
      </div>

      {/* Package + Style */}
      <div className="form-row-grid">
        <div className="field">
          <span>Runtime</span>
          <select value={packageType} onChange={(e) => setPackageType(e.target.value as PackageType)} disabled={isSubmitting}>
            {CINEMA_PACKAGE_TYPES.map((pt) => {
              const opt = getCinemaPackageConfig({ packageType: pt, pricingMode: "private" });
              return <option key={pt} value={pt}>{opt.label} · {opt.videoSeconds}s</option>;
            })}
          </select>
        </div>
        <div className="field">
          <span>Style</span>
          <select value={stylePreset} onChange={(e) => setStylePreset(e.target.value as VideoStyleId)} disabled={isSubmitting}>
            {ALL_STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {stylePreset === "crt_anime_90s" && (
        <div className="inline-note">
          90s Anime CRT — scanlines, cel animation, Dragon Ball Z / Pokemon phosphor glow, limited palette, speed lines.
        </div>
      )}

      {/* Audio */}
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={requestKind === "bedtime_story" || requestKind === "music_video" ? true : audioEnabled}
          onChange={(e) => setAudioEnabled(e.target.checked)}
          disabled={isSubmitting || requestKind === "bedtime_story" || requestKind === "music_video"}
        />
        <span>
          {requestKind === "bedtime_story" || requestKind === "music_video"
            ? "Audio is required on this node."
            : "Enable audio / narration"}
        </span>
      </label>

      {/* Source */}
      <details className="optional-panel" open={requestKind === "music_video" || requestKind === "scene_recreation"}>
        <summary>Source box</summary>
        <div className="optional-panel-body">
          <div className="field">
            <span>Source URL</span>
            <input value={sourceMediaUrl} onChange={(e) => setSourceMediaUrl(e.target.value)} placeholder="YouTube, Vimeo, or reference page URL" disabled={isSubmitting} />
          </div>
          <div className="field">
            <span>Transcript / lyrics / beat sheet</span>
            <textarea rows={4} value={sourceTranscript} onChange={(e) => setSourceTranscript(e.target.value)} placeholder="Paste transcript, lyrics, or dialogue lines" disabled={isSubmitting} />
          </div>
        </div>
      </details>

      {/* Long-form episode fields */}
      <details className="optional-panel">
        <summary>Episode structure (act breakdown, scene memories, speeches)</summary>
        <div className="optional-panel-body">
          <div className="inline-note">
            For 40-minute episodes or multi-act sequences, describe each act as a numbered block.
            Each job renders one 30–60s segment; use the same episode title + increasing act numbers
            to queue multiple segments.
          </div>
          <div className="field">
            <span>Act / scene breakdown</span>
            <textarea
              rows={5}
              value={actBreakdown}
              onChange={(e) => setActBreakdown(e.target.value)}
              placeholder={"Act 1: Opening — cold street, rain, protagonist walking alone.\nAct 2: Discovery — finds the cassette tape in the gutter.\nAct 3: Flashback montage — 90s memories."}
              disabled={isSubmitting}
            />
          </div>
          <div className="field">
            <span>Scene memories</span>
            <textarea
              rows={4}
              value={sceneMemories}
              onChange={(e) => setSceneMemories(e.target.value)}
              placeholder="Specific scenes you remember: colors, camera angles, emotional beats, characters on screen."
              disabled={isSubmitting}
            />
          </div>
          <div className="field">
            <span>Speeches and dialogue</span>
            <textarea
              rows={4}
              value={speechNotes}
              onChange={(e) => setSpeechNotes(e.target.value)}
              placeholder="Key speeches, quoted lines, voiceover beats, or monologue fragments to preserve."
              disabled={isSubmitting}
            />
          </div>
        </div>
      </details>

      {/* Creative direction */}
      <details className="optional-panel">
        <summary>Director notes</summary>
        <div className="optional-panel-body">
          <div className="field">
            <span>Creative direction</span>
            <textarea rows={4} value={requestedPrompt} onChange={(e) => setRequestedPrompt(e.target.value)} placeholder="Camera style, pacing notes, visual references, mood targets." disabled={isSubmitting} />
          </div>
        </div>
      </details>

      <div className="inline-note">
        Package: {pkg.videoSeconds}s · {pkg.priceSol} SOL list price ·{" "}
        <strong>Free for admin — payment bypassed.</strong>
      </div>

      <div className="button-row">
        <button type="button" onClick={generate} disabled={isSubmitting} className="button button-primary">
          {isSubmitting ? "Dispatching..." : "Generate (no payment)"}
        </button>
      </div>

      {error && <p className="inline-error">{error}</p>}

      {result?.jobId && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Dispatched</p>
              <h2>Job queued</h2>
            </div>
          </div>
          <p className="route-summary">
            Job {result.jobId} is processing.{" "}
            {result.dispatched ? "Worker picked it up." : "Waiting for worker dispatch."}
          </p>
          <div className="button-row">
            <Link href={`/job/${result.jobId}`} className="button button-primary">
              Open job page
            </Link>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => { setResult(null); setError(null); }}
            >
              New job
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
