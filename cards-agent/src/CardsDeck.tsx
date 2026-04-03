import type { CSSProperties } from "react";

import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";

import type { CardsDeckProps } from "./types";

const fps = 30;

const palette = {
  bg: "#05070d",
  panel: "rgba(11, 15, 26, 0.82)",
  border: "rgba(152, 164, 201, 0.18)",
  text: "#f6f1e8",
  muted: "#a5afcd",
  cyan: "#4ee6ff",
  coral: "#ff7f62",
  gold: "#ffd166",
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const glass: CSSProperties = {
  background: palette.panel,
  border: `1px solid ${palette.border}`,
  borderRadius: 24,
  boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34)",
  backdropFilter: "blur(24px)",
};

const displayFont = '"Arial Black", Impact, sans-serif';
const bodyFont = '"Trebuchet MS", "Segoe UI", sans-serif';

function motion(frame: number, delay: number) {
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: {
      damping: 18,
      stiffness: 120,
      mass: 0.85,
    },
    durationInFrames: 28,
  });

  return {
    opacity: interpolate(progress, [0, 1], [0, 1], clamp),
    translateY: interpolate(progress, [0, 1], [24, 0], clamp),
  };
}

export function CardsDeck({ title, subtitle, cards }: CardsDeckProps) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: palette.bg,
        color: palette.text,
        padding: 56,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 18%, rgba(78,230,255,0.14), transparent 28%), radial-gradient(circle at 82% 14%, rgba(255,127,98,0.12), transparent 26%), radial-gradient(circle at 50% 86%, rgba(255,209,102,0.09), transparent 32%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          height: "100%",
        }}
      >
        <div style={{display: "flex", flexDirection: "column", gap: 10}}>
          <div
            style={{
              fontFamily: bodyFont,
              fontSize: 14,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: palette.cyan,
            }}
          >
            CardsAgent / Remotion
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: displayFont,
              fontSize: 60,
              lineHeight: 1,
              letterSpacing: "-0.05em",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 900,
              fontFamily: bodyFont,
              fontSize: 22,
              lineHeight: 1.45,
              color: palette.muted,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 18,
            flex: 1,
          }}
        >
          {cards.map((card, index) => {
            const m = motion(frame, 10 + index * 8);
            return (
              <article
                key={card.id}
                style={{
                  ...glass,
                  padding: 22,
                  opacity: m.opacity,
                  transform: `translateY(${m.translateY}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontFamily: bodyFont,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: index % 2 === 0 ? palette.gold : palette.coral,
                    }}
                  >
                    {card.phase}
                  </div>
                  <div
                    style={{
                      fontFamily: bodyFont,
                      fontSize: 12,
                      color: palette.muted,
                      textAlign: "right",
                    }}
                  >
                    {card.transitionLabel}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: displayFont,
                    fontSize: 28,
                    lineHeight: 1.04,
                    color: palette.text,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontFamily: bodyFont,
                    fontSize: 18,
                    lineHeight: 1.45,
                    color: palette.muted,
                  }}
                >
                  {card.teaser}
                </div>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: bodyFont,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: palette.cyan,
                    }}
                  >
                    Visual cue
                  </div>
                  <div
                    style={{
                      fontFamily: bodyFont,
                      fontSize: 16,
                      lineHeight: 1.5,
                      color: palette.text,
                    }}
                  >
                    {card.visualCue}
                  </div>
                  <div
                    style={{
                      fontFamily: bodyFont,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: palette.gold,
                      marginTop: 6,
                    }}
                  >
                    Text cue
                  </div>
                  <div
                    style={{
                      fontFamily: bodyFont,
                      fontSize: 16,
                      lineHeight: 1.5,
                      color: palette.text,
                    }}
                  >
                    {card.narrationCue}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
