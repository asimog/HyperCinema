"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PaymentInstructionsCard } from "@/components/PaymentInstructionsCard";
import { CinemaConciergeChat } from "@/components/chat/CinemaConciergeChat";
import { MoonPayHostedPaymentButton } from "@/components/payments/MoonPayHostedPaymentButton";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { ArrowRightIcon, SparkIcon } from "@/components/ui/AppIcons";
import { buildDirectorPrompt } from "@/lib/cinema/directorPrompt";
import { getTokenVideoStylePreset } from "@/lib/memecoins/styles";
import {
  CINEMA_PACKAGE_TYPES,
  type CinemaPageConfig,
  getCinemaPackageConfig,
} from "@/lib/cinema/config";
import type {
  JobDocument,
  PackageType,
  RequestedTokenChain,
  VideoStyleId,
} from "@/lib/types/domain";

type Viewer = {
  userId: string;
  email: string | null;
} | null;

interface CreateJobResponse {
  jobId: string;
  priceSol: number;
  paymentAddress: string;
  amountSol: number;
  paymentRequired: boolean;
  tokenAddress?: string | null;
  chain?: RequestedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  stylePreset?: VideoStyleId | null;
}

interface JobStatusResponse {
  job?: JobDocument;
  status?: string;
  progress?: string;
  payment?: {
    amountSol: number;
    paymentAddress: string;
    receivedSol?: number;
    remainingSol?: number;
  };
  error?: string;
  message?: string;
}

function chainLabel(chain: RequestedTokenChain): string {
  switch (chain) {
    case "solana":
      return "Solana";
    case "ethereum":
      return "Ethereum";
    case "bsc":
      return "BNB Chain";
    case "base":
      return "Base";
    default:
      return "Auto";
  }
}

function statusLabel(status?: string, progress?: string): string {
  if (status === "awaiting_payment") return "Awaiting payment";
  if (status === "payment_detected") return "Payment detected";
  if (status === "payment_confirmed") return "Payment confirmed";
  if (progress === "generating_report") return "Building story pack";
  if (progress === "generating_video") return "Rendering video";
  if (status === "processing") return "In render pipeline";
  if (status === "complete") return "Ready";
  if (status === "failed") return "Failed";
  return "Staging";
}

export function CinemaGeneratorClient(input: {
  config: CinemaPageConfig;
  viewer: Viewer;
}) {
  const { config } = input;

  const effectivePricingMode = config.pricingMode;
  const effectiveVisibility = config.visibility;

  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [chain, setChain] = useState<RequestedTokenChain>("auto");
  const [packageType, setPackageType] = useState<PackageType>("1d");
  const [stylePreset, setStylePreset] = useState<VideoStyleId>(config.defaultStyle);
  const [audioEnabled, setAudioEnabled] = useState(config.defaultAudioEnabled);
  const [storyNotes, setStoryNotes] = useState("");
  const [characterReferences, setCharacterReferences] = useState("");
  const [visualReferences, setVisualReferences] = useState("");
  const [sourceMediaUrl, setSourceMediaUrl] = useState("");
  const [sourceTranscript, setSourceTranscript] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [imageReferences, setImageReferences] = useState(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobPayment, setJobPayment] = useState<CreateJobResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);

  useEffect(() => {
    setAudioEnabled(config.defaultAudioEnabled);
  }, [config.defaultAudioEnabled]);

  const packageConfig = useMemo(
    () =>
      getCinemaPackageConfig({
        packageType,
        pricingMode: effectivePricingMode,
      }),
    [effectivePricingMode, packageType],
  );

  async function createJob() {
    setError(null);
    setJobPayment(null);
    const creativeDirection = buildDirectorPrompt({
      categoryTitle: config.title,
      subjectName: config.requestKind === "token_video" ? tokenAddress.trim() : subjectName.trim(),
      subjectDescription: subjectDescription.trim() || undefined,
      sourceMediaUrl: sourceMediaUrl.trim() || undefined,
      sourceTranscript: sourceTranscript.trim() || undefined,
      storyNotes: storyNotes.trim() || undefined,
      characterReferences: characterReferences.trim() || undefined,
      visualReferences: visualReferences.trim() || undefined,
      lyrics: lyrics.trim() || undefined,
      dialogue: dialogue.trim() || undefined,
      imageReferences: imageReferences.map((item) => item.trim()).filter(Boolean),
      packageType,
      audioEnabled: config.audioMode === "required" ? true : audioEnabled,
      requestKind: config.requestKind,
    });

    if (config.requestKind === "token_video" && !tokenAddress.trim()) {
      setError("Token address is required.");
      return;
    }

    if (config.requestKind !== "token_video" && !subjectName.trim()) {
      setError(`${config.subjectLabel} is required.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const body =
        config.requestKind === "token_video"
          ? {
              requestKind: "token_video" as const,
              tokenAddress: tokenAddress.trim(),
              chain,
              packageType,
              stylePreset,
              subjectDescription: subjectDescription.trim() || undefined,
              requestedPrompt: creativeDirection,
              audioEnabled: config.audioMode === "required" ? true : audioEnabled,
              pricingMode: effectivePricingMode,
              visibility: effectiveVisibility,
              experience: config.id,
            }
          : {
              requestKind: config.requestKind,
              subjectName: subjectName.trim(),
              subjectDescription: subjectDescription.trim() || undefined,
              sourceMediaUrl: sourceMediaUrl.trim() || undefined,
              sourceTranscript: sourceTranscript.trim() || undefined,
              packageType,
              stylePreset,
              requestedPrompt: creativeDirection,
              audioEnabled: config.audioMode === "required" ? true : audioEnabled,
              pricingMode: effectivePricingMode,
              visibility: effectiveVisibility,
              experience: config.id,
            };

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as CreateJobResponse & {
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.jobId) {
        throw new Error(payload.message ?? payload.error ?? "Failed to create job.");
      }

      if (payload.paymentRequired === false) {
        window.location.href = `/job/${payload.jobId}`;
        return;
      }

      setJobPayment(payload);
      setJobStatus({ status: "awaiting_payment", progress: "awaiting_payment" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!jobPayment?.jobId) return;

    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobPayment.jobId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as JobStatusResponse;
        if (!response.ok) {
          throw new Error(payload.message ?? payload.error ?? "Failed to fetch job status.");
        }

        if (!cancelled) {
          setJobStatus(payload);
        }

        const status = payload.job?.status ?? payload.status;
        if (status === "processing" || status === "complete") {
          cancelled = true;
          if (timer) clearInterval(timer);
          window.location.href = `/job/${jobPayment.jobId}`;
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError instanceof Error ? pollError.message : "Polling failed.");
        }
      }
    };

    void poll();
    timer = setInterval(() => void poll(), 6000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [jobPayment?.jobId]);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <HyperflowAssemblyScaffold
        leftRail={
          <div className="home-concierge-column home-concierge-column--workspace">
            <CinemaConciergeChat initialExperienceId={config.id} />
          </div>
        }
      >
        <section className="panel home-hero-panel">
          <div className="home-hero-copy">
            <p className="eyebrow">{config.themeTone}</p>
            <h1>{config.title}</h1>
            <p className="route-summary">{config.summary}</p>
            <div className="route-badges">
              <span className="status-badge">{packageConfig.priceSol} SOL</span>
              <span className="status-badge">{packageConfig.videoSeconds}s</span>
              <span className="status-badge">
                {config.audioMode === "required"
                  ? "voice on"
                  : audioEnabled
                    ? "audio on"
                    : "audio off"}
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Generate</p>
              <h2>Configure the brief</h2>
            </div>
          </div>

          <div className="form-stack">
            {config.requestKind === "token_video" ? (
              <div className="field">
                <span>{config.subjectLabel}</span>
                <input
                  value={tokenAddress}
                  onChange={(event) => setTokenAddress(event.target.value)}
                  placeholder={config.subjectPlaceholder}
                  disabled={isSubmitting}
                />
              </div>
            ) : (
              <div className="field">
                <span>{config.subjectLabel}</span>
                <input
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder={config.subjectPlaceholder}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="field">
              <span>{config.subjectDescriptionLabel}</span>
              <textarea
                rows={4}
                value={subjectDescription}
                onChange={(event) => setSubjectDescription(event.target.value)}
                placeholder={config.subjectDescriptionPlaceholder}
                disabled={isSubmitting}
              />
            </div>

            {config.supportsChain ? (
              <div className="field">
                <span>Chain</span>
                <select
                  value={chain}
                  onChange={(event) => setChain(event.target.value as RequestedTokenChain)}
                  disabled={isSubmitting}
                >
                  {(["auto", "solana", "ethereum", "bsc", "base"] as const).map((item) => (
                    <option key={item} value={item}>
                      {chainLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="form-row-grid">
              <div className="field">
                <span>Runtime</span>
                <select
                  value={packageType}
                  onChange={(event) => setPackageType(event.target.value as PackageType)}
                  disabled={isSubmitting}
                >
                  {CINEMA_PACKAGE_TYPES.map((item) => {
                    const option = getCinemaPackageConfig({
                      packageType: item,
                      pricingMode: effectivePricingMode,
                    });
                    return (
                      <option key={item} value={item}>
                        {option.label} - {option.priceSol} SOL
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="field">
                <span>Style</span>
                <select
                  value={stylePreset}
                  onChange={(event) => setStylePreset(event.target.value as VideoStyleId)}
                  disabled={isSubmitting}
                >
                  {config.styleOptions.map((item) => (
                    <option key={item} value={item}>
                      {getTokenVideoStylePreset(item).label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <details className="optional-panel" open={config.requestKind === "bedtime_story"}>
              <summary>Story box</summary>
              <div className="optional-panel-body">
                <div className="field">
                  <span>Story direction</span>
                  <textarea
                    rows={4}
                    value={storyNotes}
                    onChange={(event) => setStoryNotes(event.target.value)}
                    placeholder="Opening beat, middle beat, ending image, or a pasted story block."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </details>

            <details className="optional-panel">
              <summary>Characters box</summary>
              <div className="optional-panel-body">
                <div className="field">
                  <span>Character references</span>
                  <textarea
                    rows={3}
                    value={characterReferences}
                    onChange={(event) => setCharacterReferences(event.target.value)}
                    placeholder="Roles, personalities, or archetypes to keep consistent."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </details>

            <details className="optional-panel">
              <summary>Visual box</summary>
              <div className="optional-panel-body">
                <div className="field">
                  <span>Visual references</span>
                  <textarea
                    rows={3}
                    value={visualReferences}
                    onChange={(event) => setVisualReferences(event.target.value)}
                    placeholder="Materials, environments, composition, camera mood."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-row-grid">
                  {imageReferences.map((value, index) => (
                    <div key={`image-ref-${index}`} className="field">
                      <span>Image URL {index + 1}</span>
                      <input
                        value={value}
                        onChange={(event) => {
                          const next = [...imageReferences];
                          next[index] = event.target.value;
                          setImageReferences(next);
                        }}
                        placeholder="https://..."
                        disabled={isSubmitting}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </details>

            {config.requestKind !== "token_video" ? (
              <details
                className="optional-panel"
                open={
                  config.requestKind === "music_video" ||
                  config.requestKind === "scene_recreation"
                }
              >
                <summary>Source box</summary>
                <div className="optional-panel-body">
                  <div className="field">
                    <span>Source URL</span>
                    <input
                      value={sourceMediaUrl}
                      onChange={(event) => setSourceMediaUrl(event.target.value)}
                      placeholder="YouTube, Vimeo, or reference page URL"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="field">
                    <span>Transcript or beat sheet</span>
                    <textarea
                      rows={4}
                      value={sourceTranscript}
                      onChange={(event) => setSourceTranscript(event.target.value)}
                      placeholder="Optional transcript, lyrics, or scene beats used as source guidance."
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="inline-note">
                    Source links inform the script writer and editor. They do not force burnt-in subtitles unless you explicitly ask for on-screen text in the brief.
                  </div>
                </div>
              </details>
            ) : null}

            <details className="optional-panel">
              <summary>Lyrics and dialogue box</summary>
              <div className="optional-panel-body">
                <div className="field">
                  <span>Lyrics</span>
                  <textarea
                    rows={3}
                    value={lyrics}
                    onChange={(event) => setLyrics(event.target.value)}
                    placeholder="Optional song lines or rhythm cues."
                    disabled={isSubmitting}
                  />
                </div>
                <div className="field">
                  <span>Dialogue</span>
                  <textarea
                    rows={3}
                    value={dialogue}
                    onChange={(event) => setDialogue(event.target.value)}
                    placeholder="Optional narration or spoken direction."
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </details>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={config.audioMode === "required" ? true : audioEnabled}
                onChange={(event) => setAudioEnabled(event.target.checked)}
                disabled={isSubmitting || config.audioMode === "required"}
              />
              <span>
                {config.audioMode === "required"
                  ? "Audio is required for this category."
                  : "Optional audio on"}
              </span>
            </label>

            <div className="inline-note">
              Keep the brief short and clear. The best results usually come from one strong idea.
            </div>

            <div className="button-row">
              <button
                type="button"
                onClick={createJob}
                disabled={isSubmitting}
                className="button button-primary"
              >
                <SparkIcon className="button-icon" aria-hidden="true" />
                {isSubmitting ? "Opening payment..." : "Generate cinema"}
              </button>
            </div>

            {error ? <p className="inline-error">{error}</p> : null}
          </div>
        </section>

        {jobPayment ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Payment Adapter</p>
                <h2>{(jobPayment.subjectName ?? subjectName) || "Job"} is queued</h2>
              </div>
              <div className="button-row">
                <Link className="button button-secondary" href={`/job/${jobPayment.jobId}`}>
                  <ArrowRightIcon className="button-icon" aria-hidden="true" />
                  Open job page
                </Link>
              </div>
            </div>
            <div className="button-row">
              <MoonPayHostedPaymentButton
                amountSol={jobStatus?.payment?.amountSol ?? jobPayment.amountSol}
                jobId={jobPayment.jobId}
                paymentAddress={jobStatus?.payment?.paymentAddress ?? jobPayment.paymentAddress}
                label="Pay with MoonPay"
              />
            </div>
            <div className="stack-section">
              <PaymentInstructionsCard
                jobId={jobPayment.jobId}
                amountSol={jobStatus?.payment?.amountSol ?? jobPayment.amountSol}
                paymentAddress={jobStatus?.payment?.paymentAddress ?? jobPayment.paymentAddress}
                receivedSol={jobStatus?.payment?.receivedSol}
                remainingSol={jobStatus?.payment?.remainingSol}
                statusText={statusLabel(
                  jobStatus?.job?.status ?? jobStatus?.status,
                  jobStatus?.job?.progress ?? jobStatus?.progress,
                )}
              />
            </div>
          </section>
        ) : null}
      </HyperflowAssemblyScaffold>
    </div>
  );
}

