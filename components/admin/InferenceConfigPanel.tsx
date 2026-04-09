"use client";

import { useEffect, useState } from "react";

import type { InferenceRuntimeConfig } from "@/lib/inference/config";
import {
  PROVIDER_FIELD_OPTIONS,
  type InferenceProviderFieldId,
  type ProviderOption,
  type TextInferenceProviderId,
  type VideoInferenceProviderId,
} from "@/lib/inference/providers";

type InferenceConfigPanelProps = {
  initialConfig: InferenceRuntimeConfig;
  textOptions: ProviderOption<TextInferenceProviderId>[];
  videoOptions: ProviderOption<VideoInferenceProviderId>[];
};

type Surface = "text" | "video";

function providerSummary(option: ProviderOption): string {
  return `${option.label}${option.defaultModel ? ` - ${option.defaultModel}` : ""}`;
}

function providerLabel(option: ProviderOption): string {
  return `${providerSummary(option)}${!option.implemented ? " (coming soon)" : ""}`;
}

function surfaceTitle(surface: Surface): string {
  return surface === "text" ? "Text inference" : "Video inference";
}

function normalizeValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function InferenceConfigPanel({
  initialConfig,
  textOptions,
  videoOptions,
}: InferenceConfigPanelProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-select provider on mount if exactly one surface has an API key configured
  useEffect(() => {
    for (const surface of ["text", "video"] as const) {
      const options = surface === "text" ? textOptions : videoOptions;
      const registry =
        surface === "text"
          ? initialConfig.providers.text
          : initialConfig.providers.video;
      const configured = options.filter(
        (o) =>
          o.implemented &&
          o.fields.includes("apiKey") &&
          registry[o.id as keyof typeof registry]?.apiKey,
      );
      if (configured.length === 1) {
        setActiveProvider(surface, configured[0].id);
      }
    }
    // Run once on mount — dependencies intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getOptions(surface: Surface) {
    return surface === "text" ? textOptions : videoOptions;
  }

  function getProviderId(surface: Surface) {
    return surface === "text" ? config.text.provider : config.video.provider;
  }

  function getRegistry(surface: Surface) {
    return surface === "text" ? config.providers.text : config.providers.video;
  }

  function updateConfig(
    updater: (current: InferenceRuntimeConfig) => InferenceRuntimeConfig,
  ) {
    setConfig((current) => updater(current));
  }

  function setActiveProvider(
    surface: Surface,
    provider: TextInferenceProviderId | VideoInferenceProviderId,
  ) {
    updateConfig((current) => {
      if (surface === "text") {
        const selection =
          current.providers.text[provider as TextInferenceProviderId];
        return {
          ...current,
          text: {
            provider: provider as TextInferenceProviderId,
            model: selection?.model ?? null,
          },
        };
      }

      const selection =
        current.providers.video[provider as VideoInferenceProviderId];
      return {
        ...current,
        video: {
          provider: provider as VideoInferenceProviderId,
          model: selection?.model ?? null,
        },
      };
    });
  }

  function updateProviderField(
    surface: Surface,
    provider: string,
    field: InferenceProviderFieldId,
    value: string,
  ) {
    updateConfig((current) => {
      if (surface === "text") {
        const nextRegistry = { ...current.providers.text };
        const currentEntry = nextRegistry[
          provider as TextInferenceProviderId
        ] ?? {
          apiKey: null,
          baseUrl: null,
          model: null,
        };
        const nextEntry = {
          ...currentEntry,
          [field]: normalizeValue(value),
        };

        nextRegistry[provider as TextInferenceProviderId] = nextEntry;

        return {
          ...current,
          text:
            current.text.provider === provider
              ? {
                  provider: current.text.provider,
                  model:
                    field === "model" ? nextEntry.model : current.text.model,
                }
              : current.text,
          providers: {
            ...current.providers,
            text: nextRegistry,
          },
        };
      }

      const nextRegistry = { ...current.providers.video };
      const currentEntry = nextRegistry[
        provider as VideoInferenceProviderId
      ] ?? {
        apiKey: null,
        baseUrl: null,
        model: null,
      };
      const nextEntry = {
        ...currentEntry,
        [field]: normalizeValue(value),
      };

      nextRegistry[provider as VideoInferenceProviderId] = nextEntry;

      return {
        ...current,
        video:
          current.video.provider === provider
            ? {
                provider: current.video.provider,
                model:
                  field === "model" ? nextEntry.model : current.video.model,
              }
            : current.video,
        providers: {
          ...current.providers,
          video: nextRegistry,
        },
      };
    });
  }

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
            provider: config.text.provider,
            model: config.text.model,
          },
          video: {
            provider: config.video.provider,
            model: config.video.model,
          },
          providers: config.providers,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ??
            payload.message ??
            "Failed to update inference config.",
        );
      }

      setMessage("Inference configuration updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Unknown error",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderFieldRow(
    surface: Surface,
    provider: string,
    field: InferenceProviderFieldId,
  ) {
    const registry = getRegistry(surface);
    const entry = registry[provider as keyof typeof registry];
    const fieldOption = PROVIDER_FIELD_OPTIONS[field];
    const value = entry?.[field] ?? "";

    return (
      <label key={field} className="field">
        <span>{fieldOption.label}</span>
        <input
          type={fieldOption.type}
          value={value}
          onChange={(event) =>
            updateProviderField(surface, provider, field, event.target.value)
          }
          placeholder={fieldOption.placeholder}
        />
        <p className="route-summary compact">{fieldOption.helper}</p>
      </label>
    );
  }

  function renderProviderCard(
    surface: Surface,
    option: ProviderOption<TextInferenceProviderId | VideoInferenceProviderId>,
  ) {
    const registry = getRegistry(surface);
    const _entry = registry[option.id as keyof typeof registry];
    const isActive = getProviderId(surface) === option.id;

    return (
      <section key={option.id} className="surface-card grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <strong>{providerSummary(option)}</strong>
            <div className="route-summary compact">{option.description}</div>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setActiveProvider(surface, option.id)}
            disabled={!option.implemented}
          >
            {isActive ? "Active" : "Select"}
          </button>
        </div>
        <div className="grid gap-3">
          {option.fields.map((field) =>
            renderFieldRow(surface, option.id, field),
          )}
        </div>
        <div className="route-summary compact">
          {isActive ? `Current ${surface} provider` : "Stored in registry only"}
          {option.id === "xai" && (
            <span className="block mt-1 opacity-70">
              {surface === "text"
                ? "Uses XAI_TEXT_API_KEY — separate from the video key."
                : "Uses XAI_VIDEO_API_KEY — separate from the text key."}
            </span>
          )}
        </div>
      </section>
    );
  }

  function renderSurface(surface: Surface) {
    const options = getOptions(surface);
    const provider = getProviderId(surface);
    const registry = getRegistry(surface);
    const activeEntry = registry[provider as keyof typeof registry];
    const activeOption = options.find((option) => option.id === provider);

    return (
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{surface.toUpperCase()}</p>
            <h2>{surfaceTitle(surface)}</h2>
          </div>
        </div>
        <p className="route-summary">
          Choose the active provider here, then manage each provider credential
          set directly in the registry cards below.
        </p>

        <div className="form-stack">
          <label className="field">
            <span>Active provider</span>
            <select
              value={provider}
              onChange={(event) =>
                setActiveProvider(
                  surface,
                  event.target.value as
                    | TextInferenceProviderId
                    | VideoInferenceProviderId,
                )
              }
            >
              {options.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.implemented}
                >
                  {providerLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Active model</span>
            <input
              value={
                surface === "text"
                  ? (config.text.model ?? "")
                  : (config.video.model ?? "")
              }
              onChange={(event) =>
                updateProviderField(
                  surface,
                  provider,
                  "model",
                  event.target.value,
                )
              }
              placeholder={activeOption?.defaultModel ?? "Model id"}
            />
            <p className="route-summary compact">
              This updates the selected provider entry only.
            </p>
          </label>
          <div className="surface-card grid gap-1">
            <strong>Selected entry</strong>
            <div>{activeOption?.label ?? provider}</div>
            <div className="route-summary compact">
              {activeEntry?.baseUrl
                ? activeEntry.baseUrl
                : "No base URL configured"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {options.map((option) => renderProviderCard(surface, option))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Registry</p>
            <h2>Inference config state</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="surface-card grid gap-1">
            <strong>Updated by</strong>
            <div>{config.updatedBy ?? "system"}</div>
          </div>
          <div className="surface-card grid gap-1">
            <strong>Updated at</strong>
            <div>
              {config.updatedAt
                ? new Date(config.updatedAt).toLocaleString()
                : "Never"}
            </div>
          </div>
        </div>
      </section>

      {renderSurface("text")}
      {renderSurface("video")}

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
          <div className="surface-card grid gap-1">
            <strong>Active text</strong>
            <div>{config.text.provider}</div>
            <div className="route-summary compact">
              {config.text.model ?? "No model set"}
            </div>
          </div>
          <div className="surface-card grid gap-1">
            <strong>Active video</strong>
            <div>{config.video.provider}</div>
            <div className="route-summary compact">
              {config.video.model ?? "No model set"}
            </div>
          </div>
        </div>
        {message ? <p className="inline-note mt-3">{message}</p> : null}
        {error ? <p className="inline-error mt-3">{error}</p> : null}
      </section>
    </div>
  );
}
