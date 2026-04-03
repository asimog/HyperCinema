"use client";

import { PaletteIcon } from "@/components/ui/AppIcons";
import { TOKEN_VIDEO_STYLE_PRESETS } from "@/lib/memecoins/styles";
import { VideoStyleId } from "@/lib/types/domain";

interface StylePresetSelectorProps {
  value: VideoStyleId;
  onChange: (value: VideoStyleId) => void;
  suggested?: VideoStyleId[];
  disabled?: boolean;
}

export function StylePresetSelector({
  value,
  onChange,
  suggested = [],
  disabled,
}: StylePresetSelectorProps) {
  const suggestedSet = new Set(suggested);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="cinema-kicker text-[0.68rem] font-semibold">Choose The Style</p>
        <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#9e8f83]">
          pick a cut
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {TOKEN_VIDEO_STYLE_PRESETS.map((preset) => {
          const selected = preset.id === value;
          const isSuggested = suggestedSet.has(preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.id)}
              className={`selector-card ${selected ? "selector-card--selected" : ""} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="selector-card-top">
                <div>
                  <PaletteIcon className="selector-card-icon" aria-hidden="true" />
                  <p className="eyebrow">{preset.shortLabel}</p>
                  <p className="font-display text-2xl leading-none">{preset.label}</p>
                </div>
                <span className="status-badge">
                  {selected ? "Selected" : isSuggested ? "Suggested" : "Style"}
                </span>
              </div>
              <p className="route-summary compact">
                {preset.summary}
              </p>
              <p className="route-summary compact">
                {preset.directorNote}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
