import type { ComponentPropsWithoutRef } from "react";

type IconId =
  | "home"
  | "mythx"
  | "hyperm"
  | "hashmyth"
  | "trending"
  | "gallery";

const palettes = {
  sunset: ["#FF007A", "#FF6000", "#FFD600"],
  ocean: ["#00F0FF", "#0080FF", "#0000FF"],
  neon: ["#FF00FF", "#8000FF", "#00FFFF"],
  cyber: ["#00FFCC", "#0088FF", "#FF00FF"],
  fire: ["#FF0000", "#FF8800", "#FFFF00"],
  synth: ["#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4CC9F0"],
  gold: ["#FFD700", "#FFA500", "#FF8C00"],
};

const PIXEL_ICONS: Record<
  IconId,
  { colors: string[]; matrix: number[][] }
> = {
  home: {
    colors: palettes.sunset,
    matrix: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  mythx: {
    colors: palettes.neon,
    matrix: [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 0, 0, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
    ],
  },
  hyperm: {
    colors: palettes.cyber,
    matrix: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
    ],
  },
  hashmyth: {
    colors: palettes.gold,
    matrix: [
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
    ],
  },
  trending: {
    colors: palettes.synth,
    matrix: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
    ],
  },
  gallery: {
    colors: palettes.fire,
    matrix: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
};

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1]!, 16), parseInt(result[2]!, 16), parseInt(result[3]!, 16)]
    : [255, 255, 255];
}

function interpolateColor(color1: string, color2: string, factor: number) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const r = Math.round(rgb1[0] + factor * (rgb2[0] - rgb1[0]));
  const g = Math.round(rgb1[1] + factor * (rgb2[1] - rgb1[1]));
  const b = Math.round(rgb1[2] + factor * (rgb2[2] - rgb1[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

function getGradientColor(colors: string[], ratio: number) {
  if (!colors.length) return "#fff";
  if (colors.length === 1) return colors[0]!;
  const segments = colors.length - 1;
  const segment = Math.min(Math.floor(ratio * segments), segments - 1);
  const factor = ratio * segments - segment;
  return interpolateColor(colors[segment]!, colors[segment + 1]!, factor);
}

export function PixetIcon({
  id,
  size = 24,
  ...props
}: { id: IconId; size?: number } & ComponentPropsWithoutRef<"svg">) {
  const icon = PIXEL_ICONS[id];
  if (!icon) return null;

  const rows = icon.matrix.length;
  const cols = icon.matrix[0]?.length ?? 0;
  const pixel = size / Math.max(rows, cols);

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      width={size}
      height={size}
      aria-hidden="true"
      role="presentation"
      {...props}
    >
      <rect width={cols} height={rows} fill="none" />
      {icon.matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c}
              y={r}
              width={1}
              height={1}
              rx={0.1}
              fill={getGradientColor(icon.colors, (r + c) / (rows + cols))}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export type PixetIconId = IconId;
