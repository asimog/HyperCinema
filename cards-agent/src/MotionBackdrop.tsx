import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  TorusKnotGeometry,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";

import type { CardsDeckProps, CardsAgentPlacement } from "./types";

type MotionVariant = "three_js" | "game_of_life";

interface MotionBackdropProps extends CardsDeckProps {
  mode: MotionVariant;
  placement: CardsAgentPlacement;
  kicker: string;
}

const palette = {
  bg: "#05070d",
  panel: "rgba(11, 15, 26, 0.78)",
  border: "rgba(152, 164, 201, 0.2)",
  text: "#f6f1e8",
  muted: "#a5afcd",
  cyan: "#4ee6ff",
  coral: "#ff7f62",
  gold: "#ffd166",
  green: "#8ff0c7",
};

function createSeed(title: string, subtitle: string): number {
  const seedSource = `${title}|${subtitle}`;
  let value = 0;
  for (let index = 0; index < seedSource.length; index += 1) {
    value = (value * 31 + seedSource.charCodeAt(index)) >>> 0;
  }
  return value || 1;
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function nextGeneration(grid: boolean[][]): boolean[][] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  return grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      let neighbors = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          const wrappedRow = (rowIndex + rowOffset + rows) % rows;
          const wrappedCol = (colIndex + colOffset + cols) % cols;
          if (grid[wrappedRow]?.[wrappedCol]) {
            neighbors += 1;
          }
        }
      }

      if (cell) {
        return neighbors === 2 || neighbors === 3;
      }

      return neighbors === 3;
    }),
  );
}

function buildInitialGrid(seed: number, rows = 28, cols = 48): boolean[][] {
  const random = createRandom(seed);
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => {
      const centerBias = Math.abs(rowIndex - rows / 2) + Math.abs(colIndex - cols / 2);
      const density = Math.max(0.14, 0.42 - centerBias / (rows + cols));
      return random() < density;
    }),
  );
}

function useThreeStage(frame: number, title: string, subtitle: string) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const knotRef = useRef<Mesh | null>(null);
  const orbRef = useRef<Mesh | null>(null);
  const shardRef = useRef<Mesh | null>(null);

  const { width, height, fps } = useVideoConfig();
  const seed = useMemo(() => createSeed(title, subtitle), [title, subtitle]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = "srgb";

    const scene = new Scene();
    scene.fog = new FogExp2(0x09111f, 0.06);
    scene.background = new Color(0x05070d);

    const camera = new PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 8);

    const ambient = new AmbientLight(0xb8d4ff, 1.6);
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(-2, 3, 6);
    const fill = new PointLight(0x4ee6ff, 3.2, 24);
    fill.position.set(-4, -1, 6);
    const accent = new PointLight(0xff7f62, 2.4, 24);
    accent.position.set(4, 2, 4);
    scene.add(ambient, key, fill, accent);

    const knot = new Mesh(
      new TorusKnotGeometry(1.15, 0.4, 220, 36),
      new MeshStandardMaterial({
        color: 0x6ff6ff,
        metalness: 0.82,
        roughness: 0.16,
        emissive: 0x0d2633,
        emissiveIntensity: 0.75,
      }),
    );
    knot.position.set(-0.9, 0.15, 0);
    scene.add(knot);

    const orb = new Mesh(
      new IcosahedronGeometry(0.85, 2),
      new MeshStandardMaterial({
        color: 0xffad91,
        metalness: 0.55,
        roughness: 0.22,
        emissive: 0x301008,
        emissiveIntensity: 0.55,
      }),
    );
    orb.position.set(2.0, -0.2, -0.3);
    scene.add(orb);

    const shard = new Mesh(
      new IcosahedronGeometry(0.55, 0),
      new MeshStandardMaterial({
        color: 0xf7e7b2,
        metalness: 0.1,
        roughness: 0.32,
        emissive: 0x20170c,
        emissiveIntensity: 0.35,
      }),
    );
    shard.position.set(0.55, 1.6, 0.4);
    scene.add(shard);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    knotRef.current = knot;
    orbRef.current = orb;
    shardRef.current = shard;

    return () => {
      const geometries: BufferGeometry[] = [knot.geometry, orb.geometry, shard.geometry];
      const materials: Material[] = [knot.material, orb.material, shard.material];
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      knotRef.current = null;
      orbRef.current = null;
      shardRef.current = null;
    };
  }, [height, width]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const knot = knotRef.current;
    const orb = orbRef.current;
    const shard = shardRef.current;

    if (!renderer || !scene || !camera || !knot || !orb || !shard) {
      return;
    }

    const progress = frame / fps;
    const drift = Math.sin(progress * 0.8 + seed * 0.0001) * 0.35;
    camera.position.x = drift * 0.35;
    camera.position.y = 0.3 + Math.sin(progress * 0.55) * 0.15;
    camera.lookAt(0, 0, 0);

    knot.rotation.x = progress * 0.45;
    knot.rotation.y = progress * 0.8;
    knot.rotation.z = Math.sin(progress * 0.25) * 0.2;

    orb.rotation.x = -progress * 0.22;
    orb.rotation.y = progress * 0.35;
    orb.position.y = -0.2 + Math.sin(progress * 1.05) * 0.18;

    shard.rotation.x = progress * 0.4;
    shard.rotation.y = -progress * 0.6;
    shard.position.z = 0.4 + Math.cos(progress * 0.85) * 0.15;

    renderer.render(scene, camera);
  }, [frame, fps, seed]);

  return canvasRef;
}

function useLifeGrid(frame: number, title: string, subtitle: string) {
  const seed = useMemo(() => createSeed(title, subtitle), [title, subtitle]);
  const initialGrid = useMemo(() => buildInitialGrid(seed), [seed]);
  const steps = Math.floor(frame / 4);

  return useMemo(() => {
    let grid = initialGrid;
    for (let index = 0; index < steps; index += 1) {
      grid = nextGeneration(grid);
    }
    return grid;
  }, [initialGrid, steps]);
}

function SceneCaption({
  title,
  subtitle,
  kicker,
  placement,
}: {
  title: string;
  subtitle: string;
  kicker: string;
  placement: CardsAgentPlacement;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 52,
        color: palette.text,
      }}
    >
      <div style={{display: "flex", justifyContent: "space-between", gap: 24}}>
        <div
          style={{
            padding: "9px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: palette.cyan,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            padding: "9px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: palette.gold,
          }}
        >
          {placement}
        </div>
      </div>

      <div
        style={{
          maxWidth: 980,
          padding: 22,
          borderRadius: 26,
          background: palette.panel,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 28px 90px rgba(0, 0, 0, 0.34)",
          backdropFilter: "blur(24px)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: palette.coral,
            marginBottom: 12,
          }}
        >
          CardsAgent / Video Adapter
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 68,
            lineHeight: 0.95,
            letterSpacing: "-0.06em",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "14px 0 0",
            maxWidth: 820,
            fontSize: 24,
            lineHeight: 1.45,
            color: palette.muted,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function MotionBackdrop({ mode, title, subtitle, kicker, placement }: MotionBackdropProps) {
  const frame = useCurrentFrame();
  const lifeGrid = useLifeGrid(frame, title, subtitle);
  const threeCanvasRef = useThreeStage(frame, title, subtitle);
  const cellSize = 18;

  if (mode === "three_js") {
    return (
      <AbsoluteFill style={{background: palette.bg, overflow: "hidden"}}>
        <canvas
          ref={threeCanvasRef}
          width={1280}
          height={720}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            background: palette.bg,
          }}
        />
        <SceneCaption title={title} subtitle={subtitle} kicker={kicker} placement={placement} />
      </AbsoluteFill>
    );
  }

  const gridWidth = lifeGrid[0]?.length ?? 0;
  const gridHeight = lifeGrid.length;
  const leftOffset = Math.floor((1280 - gridWidth * cellSize) / 2);
  const topOffset = Math.floor((720 - gridHeight * cellSize) / 2);
  const aliveCount = lifeGrid.flat().filter(Boolean).length;
  const flash = interpolate(frame % 24, [0, 12, 23], [0.1, 0.32, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{background: palette.bg, overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 50%, rgba(143,240,199,0.18), transparent 26%), radial-gradient(circle at 18% 24%, rgba(255,127,98,0.14), transparent 24%), radial-gradient(circle at 80% 72%, rgba(78,230,255,0.11), transparent 25%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: flash,
          background: "linear-gradient(135deg, rgba(143,240,199,0.2), transparent 42%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: leftOffset,
          top: topOffset,
          display: "grid",
          gridTemplateColumns: `repeat(${gridWidth}, ${cellSize}px)`,
          gap: 0,
        }}
      >
        {lifeGrid.flatMap((row, rowIndex) =>
          row.map((alive, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={{
                width: cellSize - 1,
                height: cellSize - 1,
                margin: 0.5,
                borderRadius: 4,
                backgroundColor: alive ? palette.green : "rgba(255,255,255,0.04)",
                boxShadow: alive
                  ? "0 0 14px rgba(143,240,199,0.22)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.03)",
                opacity: alive ? 1 : 0.48,
              }}
            />
          )),
        )}
      </div>
      <SceneCaption
        title={title}
        subtitle={`${subtitle} ${aliveCount > 0 ? `${aliveCount} cells alive this frame.` : ""}`.trim()}
        kicker={kicker}
        placement={placement}
      />
    </AbsoluteFill>
  );
}
