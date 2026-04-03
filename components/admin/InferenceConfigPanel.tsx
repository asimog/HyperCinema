"use client";

import { useMemo, useState } from "react";

import type {
  ProviderOption,
  TextInferenceProviderId,
  VideoInferenceProviderId,
} from "@/lib/inference/providers";
import type { InferenceRuntimeConfig } from "@/lib/inference/config";

type InferenceConfigPanelProps = {
  initialConfig: InferenceRuntimeConfig;
  textOptions: ProviderOption<TextInferenceProviderId>[];
  videoOptions: ProviderOption<VideoInferenceProviderId>[];
};

function providerSummary(option: ProviderOption): string {
  return `${option.label}${option.defaultModel ? ` · ${option.defaultModel}` : ""}`;
}

export function InferenceConfigPanel({
  initialConfig,
  textOptions,
  videoOptions,
}: InferenceConfigPanelProps) {
  const [textProvider, setTextProvider] = useState(initialConfig.text.provider);
  const [textModel, setTextModel] = useState(initialConfig.text.model ?? "");
  const [textBaseUrl, setTextBaseUrl] = useState(initialConfig.text.baseUrl ?? "");
  const [videoProvider, setVideoProvider] = useState(initialConfig.video.provider);
  const [videoModel, setVideoModel] = useState(initialConfig.video.model ?? "");
  const [videoBaseUrl, setVideoBaseUrl] = useState(initialConfig.video.baseUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTextOption = useMemo(
    () => textOptions.find((option) => option.id === textProvider),
    [textOptions, textProvider],
  );
  const selectedVideoOption = useMemo(
    () => videoOptions.find((option) => option.id === videoProvider),
    [videoOptions, videoProvider],
  );

  async function saveConfig() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/inference-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: {
            provider: textProvider,
            model: textModel.trim() || null,
            baseUrl: textBaseUrl.trim() || null,
          },
          video: {
            provider: videoProvider,
            model: videoModel.trim() || null,
            baseUrl: videoBaseUrl.trim() || null,
          },
        }),
      });

      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? payload.message ?? "Failed to update inference config.");
      }

      setMessage("Inference configuration updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Text inference</p>
            <h2>Provider switch</h2>
          </div>
        </div>
        <p className="route-summary">
          This controls the text-only model path used for summaries, scripts, and other LLM calls.
          API keys stay in env vars. This page only changes the active provider and model.
        </p>
        <label className="block mb-3">
          <span className="block text-sm font-medium mb-2">Provider</span>
          <select
            className="w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-white"
            value={textProvider}
            onChange={(event) => setTextProvider(event.target.value as TextInferenceProviderId)}
          >
            {textOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {providerSummary(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="block mb-3">
          <span className="block text-sm font-medium mb-2">Model</span>
          <input
            className="w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-white"
            value={textModel}
            onChange={(event) => setTextModel(event.target.value)}
            placeholder={selectedTextOption?.defaultModel ?? "Model id"}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-2">Custom base URL</span>
          <input
            className="w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-white"
            value={textBaseUrl}
            onChange={(event) => setTextBaseUrl(event.target.value)}
            placeholder={selectedTextOption?.envHint ?? "Optional"}
          />
        </label>
      </section>

      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Video inference</p>
            <h2>Provider switch</h2>
          </div>
        </div>
        <p className="route-summary">
          This controls the video API target. Built-in support stays on Google Veo, while custom
          backends can be wired in through your own endpoint.
        </p>
        <label className="block mb-3">
          <span className="block text-sm font-medium mb-2">Provider</span>
          <select
            className="w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-white"
            value={videoProvider}
            onChange={(event) => setVideoProvider(event.target.value as VideoInferenceProviderId)}
          >
            {videoOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {providerSummary(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="block mb-3">
          <span className="block text-sm font-medium mb-2">Model</span>
          <input
            className="w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-white"
            value={videoModel}
            onChange={(event) => setVideoModel(event.target.value)}
            placeholder={selectedVideoOption?.defaultModel ?? "Model id"}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-2">Video API base URL</span>
          <input
            className="w-full rounded-md border border-white/15 bg-black/25 px-3 py-2 text-white"
            value={videoBaseUrl}
            onChange={(event) => setVideoBaseUrl(event.target.value)}
            placeholder={selectedVideoOption?.envHint ?? "Optional"}
          />
        </label>
      </section>

      <section className="panel rail-panel">
        <div className="button-row">
          <button
            type="button"
            className="button button-primary"
            onClick={() => void saveConfig()}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save inference config"}
          </button>
          <div className="surface-card" style={{ padding: "0.9rem 1rem" }}>
            <strong>Current text</strong>
            <div>{selectedTextOption?.label ?? textProvider}</div>
            <div className="text-sm opacity-70">{selectedTextOption?.description}</div>
          </div>
          <div className="surface-card" style={{ padding: "0.9rem 1rem" }}>
            <strong>Current video</strong>
            <div>{selectedVideoOption?.label ?? videoProvider}</div>
            <div className="text-sm opacity-70">{selectedVideoOption?.description}</div>
          </div>
        </div>
        {message ? <p className="text-emerald-300 mt-3">{message}</p> : null}
        {error ? <p className="inline-error mt-3">{error}</p> : null}
      </section>
    </div>
  );
}
