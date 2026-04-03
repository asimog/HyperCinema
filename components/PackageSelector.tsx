"use client";

import { ClockIcon } from "@/components/ui/AppIcons";
import { ACTIVE_PACKAGE_TYPES, PACKAGE_CONFIG } from "@/lib/constants";
import { PackageType } from "@/lib/types/domain";

interface PackageSelectorProps {
  value: PackageType;
  onChange: (value: PackageType) => void;
  disabled?: boolean;
}

export function PackageSelector({
  value,
  onChange,
  disabled,
}: PackageSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="cinema-kicker text-[0.68rem] font-semibold">Choose The Runtime</p>
        <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#9e8f83]">
          30s / 60s
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ACTIVE_PACKAGE_TYPES.map((packageType) => {
          const item = PACKAGE_CONFIG[packageType];
          const selected = item.packageType === value;
          return (
            <button
              key={item.packageType}
              type="button"
              disabled={disabled}
              onClick={() => onChange(item.packageType)}
              className={`selector-card ${selected ? "selector-card--selected" : ""} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="selector-card-top">
                <div>
                  <ClockIcon className="selector-card-icon" aria-hidden="true" />
                  <p className="eyebrow">{item.label ?? `${item.videoSeconds}s`}</p>
                  <p className="font-display text-3xl leading-none">{item.priceSol} SOL</p>
                </div>
                <span className="status-badge">
                  {selected ? "Selected" : `${item.videoSeconds}s`}
                </span>
              </div>
              <p className="route-summary compact">{item.subtitle}</p>
              <p className="route-summary compact">
                Agent x402: ${item.priceUsdc} USDC
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
