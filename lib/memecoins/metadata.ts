// ── Memecoin Metadata — DexScreener Only ───────────────────────────
// Free, no-auth token metadata from DexScreener API.
// Supports: Solana, Ethereum, Base, BSC.
// Returns: name, symbol, image, links, market snapshot.
// No Helius, no Pump SDK, no Solana web3.js.

import {
  SupportedTokenChain,
  TokenLink,
  TokenMarketSnapshot,
} from "@/lib/types/domain";
import { withRetry, RetryableError } from "@/lib/network/retry";
import { fetchWithTimeout } from "@/lib/network/http";

const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex";
const TIMEOUT_MS = 6_000;
const RETRY_ATTEMPTS = 2;
const EVM_CHAINS: SupportedTokenChain[] = ["ethereum", "bsc", "base"];

interface DSResult {
  pairs: DSPair[] | null;
}
interface DSPair {
  chainId: string;
  dexId: string;
  url?: string;
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  baseToken?: { address?: string; name?: string; symbol?: string };
  info?: {
    imageUrl?: string;
    websites?: { label?: string; url?: string }[];
    socials?: { type?: string; url?: string }[];
  };
}

export interface ResolvedMemecoinMetadata {
  chain: SupportedTokenChain;
  address: string;
  name: string;
  symbol: string;
  image: string | null;
  description: string | null;
  isPump: boolean;
  links: TokenLink[];
  marketSnapshot: TokenMarketSnapshot;
}

function sanitize(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toUrl(v: unknown): string | null {
  const s = sanitize(v);
  if (!s) return null;
  if (s.toLowerCase().startsWith("ipfs://")) {
    const p = s.replace(/^ipfs:\/\//i, "").replace(/^\/+/, "");
    return p ? `https://ipfs.io/ipfs/${p}` : null;
  }
  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}

function isSolanaAddr(a: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
}

function isEvmAddr(a: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

async function fetchPairs(chain: string, addr: string): Promise<DSPair[]> {
  const url = `${DEXSCREENER_BASE}/tokens/${encodeURIComponent(chain)}/${encodeURIComponent(addr)}`;
  return withRetry(
    async () => {
      const res = await fetchWithTimeout(
        url,
        { headers: { Accept: "application/json" } },
        TIMEOUT_MS,
      );
      if (res.status === 404) return [];
      if (!res.ok) {
        if (res.status >= 500)
          throw new RetryableError(`DexScreener ${res.status}`);
        return [];
      }
      const data = (await res.json()) as DSResult;
      return data.pairs ?? [];
    },
    { attempts: RETRY_ATTEMPTS, baseDelayMs: 350, maxDelayMs: 2500 },
  );
}

function scorePair(p: DSPair): number {
  return (
    (num(p.liquidity?.usd) ?? 0) * 100 +
    (num(p.volume?.h24) ?? 0) * 10 +
    (num(p.marketCap ?? p.fdv) ?? 0)
  );
}

function bestPair(pairs: DSPair[]): DSPair | null {
  if (!pairs.length) return null;
  return [...pairs].sort((a, b) => scorePair(b) - scorePair(a))[0] ?? null;
}

function links(p: DSPair | null): TokenLink[] {
  if (!p) return [];
  const m = new Map<string, TokenLink>();
  const u = toUrl(p.url);
  if (u) m.set(u, { label: "DexScreener", url: u });
  for (const w of p.info?.websites ?? []) {
    const url = toUrl(w.url);
    if (url) m.set(url, { label: sanitize(w.label) ?? "Website", url });
  }
  for (const s of p.info?.socials ?? []) {
    const url = toUrl(s.url);
    if (url)
      m.set(url, {
        label:
          sanitize(s.type)?.replace(/^\w/, (c) => c.toUpperCase()) ?? "Social",
        url,
      });
  }
  return [...m.values()].slice(0, 5);
}

function marketSnap(p: DSPair | null): TokenMarketSnapshot {
  return {
    priceUsd: p ? num(p.priceUsd) : null,
    marketCapUsd: p ? (num(p.marketCap) ?? num(p.fdv)) : null,
    liquidityUsd: p ? num(p.liquidity?.usd) : null,
    volume24hUsd: p ? num(p.volume?.h24) : null,
    pairUrl: p ? toUrl(p.url) : null,
  };
}

export async function resolveMemecoinMetadata(input: {
  address: string;
  chain: "solana" | "ethereum" | "base" | "bsc" | "auto";
}): Promise<ResolvedMemecoinMetadata> {
  const addr = input.address.trim();
  const isSol = isSolanaAddr(addr);
  const isEvm = isEvmAddr(addr);

  if (!isSol && !isEvm)
    throw new Error("Provide a valid Solana mint or EVM contract address.");
  if (input.chain === "solana" && isEvm)
    throw new Error("EVM address not valid for Solana chain.");

  if (isSol) {
    const pairs = await fetchPairs("solana", addr);
    const p = bestPair(pairs);
    return {
      chain: "solana",
      address: addr,
      name: sanitize(p?.baseToken?.name) ?? `Token ${shortAddr(addr)}`,
      symbol: sanitize(p?.baseToken?.symbol) ?? "SOLMEME",
      image: toUrl(p?.info?.imageUrl),
      description: null,
      isPump: p?.dexId?.toLowerCase() === "pumpfun",
      links: links(p),
      marketSnapshot: marketSnap(p),
    };
  }

  // EVM — try requested chain or all EVM chains
  const chains =
    input.chain === "auto" ? EVM_CHAINS : [input.chain as SupportedTokenChain];
  const results = await Promise.all(
    chains.map(async (c) => ({ chain: c, pairs: await fetchPairs(c, addr) })),
  );
  const ranked = results
    .map(({ chain, pairs }) => ({ chain, pair: bestPair(pairs) }))
    .sort((a, b) => scorePair(b.pair ?? {}) - scorePair(a.pair ?? {}));
  const winner = ranked.find((r) => r.pair) ?? ranked[0];
  const ch = winner?.pair
    ? winner.chain
    : input.chain === "auto"
      ? "ethereum"
      : input.chain;
  const p = winner?.pair ?? null;

  return {
    chain: ch,
    address: addr,
    name: sanitize(p?.baseToken?.name) ?? `${ch} token ${shortAddr(addr)}`,
    symbol: sanitize(p?.baseToken?.symbol) ?? `${ch.toUpperCase()}MEME`,
    image: toUrl(p?.info?.imageUrl),
    description: null,
    isPump: false,
    links: links(p),
    marketSnapshot: marketSnap(p),
  };
}
