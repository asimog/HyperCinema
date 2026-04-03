"use client";

import { ChainBadgeIcon } from "@/components/ui/AppIcons";
import { RequestedTokenChain } from "@/lib/types/domain";

const CHAIN_OPTIONS: Array<{
  value: RequestedTokenChain;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto",
    description: "Detect Solana, Ethereum, BNB Chain, or Base from the address.",
  },
  {
    value: "solana",
    label: "Solana",
    description: "Use Pump metadata when available and treat the address as a mint.",
  },
  {
    value: "ethereum",
    label: "Ethereum",
    description: "Force the address to resolve as an Ethereum memecoin.",
  },
  {
    value: "bsc",
    label: "BNB Chain",
    description: "Force the address to resolve as a BNB Chain memecoin.",
  },
  {
    value: "base",
    label: "Base",
    description: "Force the address to resolve as a Base memecoin.",
  },
];

interface ChainSelectorProps {
  value: RequestedTokenChain;
  onChange: (value: RequestedTokenChain) => void;
  disabled?: boolean;
}

export function ChainSelector({ value, onChange, disabled }: ChainSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="cinema-kicker text-[0.68rem] font-semibold">Choose The Chain</p>
        <p className="text-[0.72rem] uppercase tracking-[0.22em] text-[#9e8f83]">
          multichain
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {CHAIN_OPTIONS.map((option) => {
          const selected = option.value === value;
          const ChainIcon = ChainBadgeIcon(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`selector-card ${selected ? "selector-card--selected" : ""} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="selector-card-top">
                <div>
                  <ChainIcon className="selector-card-icon" aria-hidden="true" />
                  <p className="eyebrow">{option.label}</p>
                </div>
                <span className="status-badge">
                  {selected ? "Selected" : option.label}
                </span>
              </div>
              <p className="route-summary compact">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
