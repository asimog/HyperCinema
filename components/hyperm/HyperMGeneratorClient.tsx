"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MoonPayHostedPaymentButton } from "@/components/payments/MoonPayHostedPaymentButton";
import { PaymentInstructionsCard } from "@/components/PaymentInstructionsCard";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import {
  ArrowRightIcon,
  SparkIcon,
} from "@/components/ui/AppIcons";
import { buildDirectorPrompt } from "@/lib/cinema/directorPrompt";
import { getCinemaPackageConfig, CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";
import type {
  PackageType,
  VideoStyleId,
  JobDocument,
} from "@/lib/types/domain";
import {
  normalizeXProfileInput,
  type XProfileTweetsResult,
  type XTweet,
} from "@/lib/x/api";

type CreateJobResponse = {
  jobId: string;
  priceSol: number;
  paymentAddress: string;
  amountSol: number;
  paymentRequired: boolean;
  subjectName?: string | null;
};

type JobStatusResponse = {
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
};

const HYPERM_STYLE_OPTIONS: { value: VideoStyleId; label: string }[] = [
  { value: "hyperflow_assembly", label: "Hyperflow Assembly" },
  { value: "vhs_cinema", label: "VHS Cinema" },
  { value: "black_and_white_noir", label: "Black & White Noir" },
  { value: "double_exposure", label: "Double Exposure" },
  { value: "glitch_digital", label: "Glitch Digital" },
  { value: "found_footage_raw", label: "Found Footage Raw" },
  { value: "split_screen_diptych", label: "Split Screen Diptych" },
  { value: "film_grain_70s", label: "Film Grain 70s" },
];

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function statusLabel(status?: string, progress?: string): string {
  if (status === "awaiting_payment") return "Awaiting payment";
  if (status === "payment_detected") return "Payment detected";
  if (status === "payment_confirmed") return "Payment confirmed";
  if (progress === "generating_report") return "Building autobiography";
  if (progress === "generating_video") return "Rendering cut";
  if (status === "processing") return "In production";
  if (status === "complete") return "Ready";
  if (status === "failed") return "Failed";
  return "Staging";
}

function buildAutobiographyPrompt(input: {
  displayName: string;
  username: string;
  profileUrl: string;
  subjectDescription: string;
  sourceTranscript: string;
  packageType: PackageType;
  audioEnabled: boolean;
}) {
  const prompt = buildDirectorPrompt({
    categoryTitle: "MythX",
    subjectName: input.displayName,
    subjectDescription: input.subjectDescription,
    sourceMediaUrl: input.profileUrl,
    sourceTranscript: input.sourceTranscript,
    packageType: input.packageType,
    audioEnabled: input.audioEnabled,
    requestKind: "mythx",
  });

  return [
    prompt,
    "",
    "MythX directives:",
    "- Build a public autobiography from the last 42 tweets.",
    "- Treat the tweets as chronology, evidence, rhythm, and contradiction.",
    "- Preserve the subject's actual voice instead of sanding it down into brand copy.",
    "- Surface obsession loops, pivots, bragging rights, insecurities, jokes, and reversals.",
    "- Use the tweets to reveal the person behind the profile link.",
    "- Do not sanitize the character arc.",
    `- Profile handle: @${input.username}`,
  ].join("\n");
}

export function HyperMGeneratorClient() {
  const [profileInput, setProfileInput] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [tweets, setTweets] = useState<XTweet[]>([]);
  const [manualTranscript, setManualTranscript] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("30s");
  const [stylePreset, setStylePreset] = useState<VideoStyleId>("hyperflow_assembly");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isLoadingTweets, setIsLoadingTweets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tweetError, setTweetError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobPayment, setJobPayment] = useState<CreateJobResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);

  const packageConfig = useMemo(
    () => getCinemaPackageConfig({ packageType, pricingMode: "public" }),
    [packageType],
  );

  const resolvedTranscript = useMemo(() => {
    if (manualTranscript.trim()) {
      return manualTranscript.trim();
    }

    return tweets.map((tweet, index) => `${index + 1}. ${tweet.text}`).join("\n");
  }, [manualTranscript, tweets]);

  const sourcePrompt = useMemo(() => {
    const normalized = normalizeXProfileInput(profileInput);
    const displayName =
      subjectName.trim() ||
      profileDisplayName.trim() ||
      (profileHandle.trim() ? `@${profileHandle.trim().replace(/^@+/, "")}` : "") ||
      (normalized.username ? `@${normalized.username}` : "") ||
      "X profile";
    const handle =
      profileHandle.trim() ||
      normalized.username ||
      displayName.replace(/^@+/, "");
    const description =
      subjectDescription.trim() ||
      (profileBio.trim()
        ? `Autobiography built from ${displayName}'s public bio and last 42 tweets.`
        : `Autobiography built from the last 42 tweets on ${profileUrl || profileInput}.`);

    return buildAutobiographyPrompt({
      displayName,
      username: handle,
      profileUrl: profileUrl || normalized.profileUrl || profileInput,
      subjectDescription: description,
      sourceTranscript: resolvedTranscript || "No transcript available yet.",
      packageType,
      audioEnabled,
    });
  }, [
    profileBio,
    profileDisplayName,
    profileHandle,
    profileInput,
    profileUrl,
    resolvedTranscript,
    subjectDescription,
    subjectName,
    packageType,
    audioEnabled,
  ]);

  useEffect(() => {
    if (!jobPayment?.jobId) {
      return;
    }

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

  async function loadTweets() {
    setTweetError(null);
    setError(null);
    setIsLoadingTweets(true);

    try {
      const response = await fetch("/api/hyperm/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileInput }),
      });

      const payload = (await response.json()) as XProfileTweetsResult | { error?: string; message?: string };

      if (!response.ok || !("profile" in payload)) {
        throw new Error(
          (payload as { message?: string; error?: string }).message ??
            (payload as { message?: string; error?: string }).error ??
            "Failed to load tweets.",
        );
      }

      setProfileUrl(payload.profile.profileUrl);
      setProfileDisplayName(payload.profile.displayName);
      setProfileHandle(payload.profile.username);
      setProfileBio(payload.profile.description ?? "");
      setSubjectName(payload.profile.displayName);
      setSubjectDescription(
        `Autobiography from @${payload.profile.username}'s last 42 tweets.`,
      );
      setTweets(payload.tweets);
      setManualTranscript(payload.transcript);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unexpected error while loading tweets.";
      setTweetError(message);
      setManualTranscript((current) => current || "");
    } finally {
      setIsLoadingTweets(false);
    }
  }

  async function createJob() {
    setError(null);
    setJobPayment(null);

    const normalized = normalizeXProfileInput(profileInput);
    const resolvedProfileUrl = profileUrl || normalized.profileUrl || "";
    const resolvedHandle = profileHandle || normalized.username || "";
    const resolvedDisplayName =
      subjectName.trim() || profileDisplayName.trim() || resolvedHandle || "X autobiography";

    if (!resolvedProfileUrl) {
      setError("Paste an X profile link or @handle first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKind: "mythx" as const,
          subjectName: resolvedDisplayName,
          subjectDescription:
            subjectDescription.trim() ||
            `Autobiography built from @${resolvedHandle || normalized.username} using the last 42 tweets.`,
          sourceMediaUrl: resolvedProfileUrl,
          sourceMediaProvider: "x",
          sourceTranscript: resolvedTranscript.trim() || undefined,
          packageType,
          stylePreset,
          requestedPrompt: sourcePrompt,
          audioEnabled,
          pricingMode: "public",
          visibility: "public",
        }),
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

  const tweetCount = tweets.length;

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#f4efe8] md:px-8 md:py-8">
      <HyperflowAssemblyScaffold
        leftRail={
          <div className="rail-stack">
            <section className="panel rail-panel">
              <div className="panel-header">
              <div>
                  <h2>Source</h2>
                </div>
              </div>
              <div className="route-badges">
                <span className="status-badge">{tweetCount || 42} tweets</span>
                <span className="status-badge">X API</span>
                <span className="status-badge">manual fallback</span>
              </div>
            </section>

            <section className="panel rail-panel">
              <div className="panel-header">
                <div>
                  <h2>{profileDisplayName || profileHandle || "Waiting for input"}</h2>
                </div>
              </div>
              <div className="form-stack">
                <div className="field">
                  <span>X profile</span>
                  <input value={profileInput} readOnly placeholder="https://x.com/username" />
                </div>
                <div className="field">
                  <span>Public bio</span>
                  <textarea rows={4} value={profileBio} readOnly placeholder="Loads from X API when available." />
                </div>
                <div className="field">
                  <span>Tweet preview</span>
                  <div className="module-grid-3x2">
                    {tweets.slice(0, 4).map((tweet) => (
                      <article key={tweet.id} className="surface-card module-tile">
                        <p>{truncate(tweet.text, 180)}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        }
      >
        <section className="panel home-hero-panel">
          <div className="home-hero-copy">
            <p className="eyebrow">{CINEMA_PAGE_CONFIGS.mythx.eyebrow}</p>
            <h1>{CINEMA_PAGE_CONFIGS.mythx.title}</h1>
            <p className="route-summary">{CINEMA_PAGE_CONFIGS.mythx.summary}</p>
            <div className="route-badges">
              <span className="status-badge">{packageConfig.priceSol} SOL</span>
              <span className="status-badge">last 42 tweets</span>
              <span className="status-badge">autobiography engine</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Configure the brief</h2>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={loadTweets}
                disabled={isLoadingTweets || !profileInput.trim()}
              >
                {isLoadingTweets ? "Loading..." : "Load tweets"}
              </button>
            </div>
          </div>

          <div className="form-stack">
            <div className="field">
              <span>X profile link or handle</span>
              <input
                value={profileInput}
                onChange={(event) => setProfileInput(event.target.value)}
                placeholder="https://x.com/username or @username"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-row-grid">
              <div className="field">
              <span>Display name (optional)</span>
              <input
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="Auto-filled from X, but editable"
                disabled={isSubmitting}
              />
            </div>
            <div className="field">
                <span>Handle (optional)</span>
                <input
                  value={profileHandle}
                  onChange={(event) => setProfileHandle(event.target.value)}
                  placeholder="@username"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="field">
              <span>Biography angle</span>
              <textarea
                rows={4}
                value={subjectDescription}
                onChange={(event) => setSubjectDescription(event.target.value)}
                placeholder="What should the autobiography expose: the rise, the tell, the contradiction, the pivot?"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-row-grid">
              <div className="field">
                <span>Runtime</span>
                <select
                  value={packageType}
                  onChange={(event) => setPackageType(event.target.value as PackageType)}
                  disabled={isSubmitting}
                >
                  {(["30s", "60s"] as const).map((item) => {
                    const option = getCinemaPackageConfig({
                      packageType: item,
                      pricingMode: "public",
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
                  {HYPERM_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(event) => setAudioEnabled(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>Audio on</span>
            </label>

            <div className="field">
              <span>Last 42 tweets / fallback transcript</span>
              <textarea
                rows={10}
                value={manualTranscript}
                onChange={(event) => setManualTranscript(event.target.value)}
                placeholder="If the X API is not ready yet, paste the last 42 tweets here."
                disabled={isSubmitting}
              />
            </div>

            <div className="button-row">
              <button
                type="button"
                onClick={createJob}
                disabled={isSubmitting}
                className="button button-primary"
              >
                <SparkIcon className="button-icon" aria-hidden="true" />
                {isSubmitting ? "Opening checkout..." : "Create video"}
              </button>
            </div>

            {tweetError ? <p className="inline-error">{tweetError}</p> : null}
            {error ? <p className="inline-error">{error}</p> : null}
          </div>
        </section>

        {jobPayment ? (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>{jobPayment.subjectName ?? subjectName ?? "MythX job"} ready for checkout</h2>
              </div>
              <div className="button-row">
                <Link className="button button-secondary" href={`/job/${jobPayment.jobId}`}>
                  <ArrowRightIcon className="button-icon" aria-hidden="true" />
                  Open job
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
