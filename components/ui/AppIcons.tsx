import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { CinemaPageId } from "@/lib/cinema/config";
import { PixetIcon, type PixetIconId } from "./PixetIcon";
import type { RequestedTokenChain } from "@/lib/types/domain";

type IconProps = ComponentPropsWithoutRef<"svg"> & {
  title?: string;
};

function SvgIcon({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M12 2.75l1.86 5.53 5.39 1.86-5.39 1.86L12 17.53l-1.86-5.52L4.75 10.14l5.39-1.86L12 2.75z"
        fill="currentColor"
      />
    </SvgIcon>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 5v14M16 5v14M4 9h16M4 15h16" stroke="currentColor" strokeWidth="1.4" />
    </SvgIcon>
  );
}

export function FilmRollIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="8.5" cy="8.5" r="0.9" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="0.9" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="0.9" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="0.9" fill="currentColor" />
    </SvgIcon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M4.75 7.75A2.75 2.75 0 0 1 7.5 5h10.5A1.75 1.75 0 0 1 19.75 6.75V8H7.5A2.75 2.75 0 0 1 4.75 7.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.75 8.25V17A2.25 2.25 0 0 0 7 19.25h10A2.25 2.25 0 0 0 19.25 17v-3.5H13a1.75 1.75 0 0 1 0-3.5h6.25V9.75"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="13.25" cy="12.25" r="1.1" fill="currentColor" />
    </SvgIcon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </SvgIcon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 11.5l15-6.5-6.5 15-2.1-6.4L4 11.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.4 14.1l3.6-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5.5 12.3l4.2 4.2L18.5 7.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4.5 11.5 12 5l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-5h-3v5H6a1.5 1.5 0 0 1-1.5-1.5v-7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function TrendingIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 17l4.5-4.5 3 3L19 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 9H19v4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M12 20.2s-7.3-4.6-7.3-9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.3 3.3c0 5.1-7.3 9.7-7.3 9.7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </SvgIcon>
  );
}

export function HashIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9 4.5L7.5 19.5M16.5 4.5L15 19.5M4.5 9h15M3.5 15h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function ChainIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M8.3 12.7 6.8 14.2a3.5 3.5 0 1 0 5 5l1.5-1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.7 11.3 17.2 9.8a3.5 3.5 0 1 0-5-5L10.7 6.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path
        d="M12 4.5a7.5 7.5 0 1 0 0 15h1.2a1.8 1.8 0 0 0 0-3.6H12a1.8 1.8 0 0 1 0-3.6h1.2a1.8 1.8 0 0 0 0-3.6H12A7.5 7.5 0 0 1 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8" cy="9" r="1" fill="currentColor" />
      <circle cx="9.5" cy="6.9" r="1" fill="currentColor" />
      <circle cx="14.5" cy="6.9" r="1" fill="currentColor" />
      <circle cx="16" cy="9" r="1" fill="currentColor" />
    </SvgIcon>
  );
}

export function GetPageIcon(id: CinemaPageId) {
  const PAGE_ICON_MAP: Partial<Record<CinemaPageId, PixetIconId>> = {
    hashmyth: "hashmyth",
    hypercinema: "gallery",
    hyperm: "hyperm",
    mythx: "mythx",
    lovex: "home",
    trenchcinema: "trending",
    funcinema: "hyperm",
    familycinema: "home",
    musicvideo: "gallery",
    gallery: "gallery",
    trending: "trending",
  };

  const mapped = PAGE_ICON_MAP[id] ?? "trending";

  return function WrappedPixetIcon(props: ComponentPropsWithoutRef<"svg">) {
    return <PixetIcon id={mapped as any} {...props} />;
  };
}

export function ChainBadgeIcon(chain: RequestedTokenChain) {
  switch (chain) {
    case "solana":
      return SparkIcon;
    case "ethereum":
      return ChainIcon;
    case "bsc":
      return WalletIcon;
    case "base":
      return PaletteIcon;
    default:
      return FilmIcon;
  }
}
