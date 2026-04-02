import { beforeEach, describe, expect, it, vi } from "vitest";

type DocRef = {
  collectionName: string;
  id: string;
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (value: unknown, options?: { merge?: boolean }) => Promise<void>;
};

const state = vi.hoisted(() => {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();

  function ensureCollection(name: string) {
    let collection = collections.get(name);
    if (!collection) {
      collection = new Map();
      collections.set(name, collection);
    }
    return collection;
  }

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  function read(name: string, id: string) {
    return ensureCollection(name).get(id);
  }

  function write(
    name: string,
    id: string,
    value: Record<string, unknown>,
    merge?: boolean,
  ) {
    const collection = ensureCollection(name);
    const existing = collection.get(id);
    collection.set(id, merge && existing ? { ...existing, ...value } : clone(value));
  }

  function doc(collectionName: string, id: string): DocRef {
    return {
      collectionName,
      id,
      async get() {
        const value = read(collectionName, id);
        return {
          exists: Boolean(value),
          data: () => clone(value ?? {}),
        };
      },
      async set(value: unknown, options?: { merge?: boolean }) {
        write(collectionName, id, value as Record<string, unknown>, options?.merge);
      },
    };
  }

  function reset() {
    collections.clear();
  }

  return {
    collections,
    doc,
    read,
    reset,
    write,
  };
});

const mocks = vi.hoisted(() => ({
  getEnv: vi.fn(() => ({
    APP_BASE_URL: "https://hashart.fun",
    GOONBOOK_API_BASE_URL: "https://goonclaw.com",
    GOONBOOK_AGENT_API_KEY: undefined,
    GOONBOOK_AGENT_HANDLE: "hasmedia",
    GOONBOOK_AGENT_DISPLAY_NAME: "HASMEDIA",
    GOONBOOK_AGENT_BIO:
      "HyperMyths drops AI video trailers and posts them to GoonBook.",
    GOONBOOK_SYNC_BATCH_LIMIT: 12,
  })),
  getJobArtifacts: vi.fn(),
  listCompletedJobArtifacts: vi.fn(),
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: mocks.getEnv,
}));

vi.mock("@/lib/jobs/repository", () => ({
  getJobArtifacts: mocks.getJobArtifacts,
  listCompletedJobArtifacts: mocks.listCompletedJobArtifacts,
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getDb: () => ({
    collection(name: string) {
      return {
        doc(id: string) {
          return state.doc(name, id);
        },
      };
    },
    async runTransaction<T>(
      callback: (tx: {
        get: (ref: DocRef) => Promise<{ exists: boolean; data: () => unknown }>;
        set: (ref: DocRef, value: unknown, options?: { merge?: boolean }) => void;
      }) => Promise<T>,
    ) {
      return callback({
        get: async (ref) => ref.get(),
        set: (ref, value, options) => {
          state.write(
            ref.collectionName,
            ref.id,
            value as Record<string, unknown>,
            options?.merge,
          );
        },
      });
    },
  }),
}));

import { publishCompletedJobToGoonBook } from "@/lib/social/goonbook-publisher";

describe("goonbook publisher", () => {
  beforeEach(() => {
    state.reset();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("registers HASMEDIA once and reuses the cached agent key for later posts", async () => {
    mocks.getJobArtifacts.mockImplementation(async (jobId: string) => ({
      job: {
        jobId,
        wallet: "7cQjAvzJsmdePPMk8TiW8hYHHhCfdNtEaaNK3o46YP12",
        packageType: "1d",
        rangeDays: 1,
        priceSol: 0.02,
        priceUsdc: 3,
        videoSeconds: 30,
        status: "complete",
        progress: "complete",
        txSignature: "tx-signature",
        createdAt: "2026-03-23T08:00:00.000Z",
        updatedAt: "2026-03-23T08:05:00.000Z",
        errorCode: null,
        errorMessage: null,
        paymentMethod: "x402_usdc",
        paymentCurrency: "USDC",
        paymentNetwork: "solana",
        x402Transaction: "tx-signature",
        paymentAddress: "11111111111111111111111111111111",
        paymentIndex: null,
        paymentRouting: "x402",
        requiredLamports: 0,
        receivedLamports: 0,
        paymentSignatures: ["tx-signature"],
        lastPaymentAt: "2026-03-23T08:00:00.000Z",
        sweepStatus: "swept",
        sweepSignature: "tx-signature",
        sweptLamports: 0,
        lastSweepAt: "2026-03-23T08:00:00.000Z",
        sweepError: null,
      } as const,
      report: {
        jobId,
        wallet: "7cQjAvzJsmdePPMk8TiW8hYHHhCfdNtEaaNK3o46YP12",
        rangeDays: 1,
        pumpTokensTraded: 4,
        buyCount: 12,
        sellCount: 9,
        solSpent: 8.25,
        solReceived: 7.9,
        estimatedPnlSol: -0.35,
        bestTrade: "AAA (+0.22 SOL)",
        worstTrade: "BBB (-0.48 SOL)",
        styleClassification: "The Chaos Gambler",
        timeline: [],
        walletPersonality: "The Chaos Gambler",
        summary: "Fresh HyperMyths trailer export.",
        downloadUrl: "https://hashart.fun/reports/job-1.pdf",
      } as Record<string, unknown>,
      video: {
        jobId,
        videoUrl: `https://hashart.fun/videos/${jobId}.mp4`,
        thumbnailUrl: `https://hashart.fun/videos/${jobId}.png`,
      } as Record<string, unknown>,
    }));

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/goonbook/agents/register")) {
        return new Response(
          JSON.stringify({
            agent: {
              apiKey: "goonbook_agent_key_123",
              profile: {
                id: "hasmedia",
              },
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      expect(url.endsWith("/api/goonbook/agents/posts")).toBe(true);
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer goonbook_agent_key_123",
      });

      return new Response(
        JSON.stringify({
          item: {
            id: "goonbook-post-1",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await publishCompletedJobToGoonBook("job-1");
    const second = await publishCompletedJobToGoonBook("job-2");

    expect(first).toEqual({
      jobId: "job-1",
      status: "posted",
      postId: "goonbook-post-1",
    });
    expect(second).toEqual({
      jobId: "job-2",
      status: "posted",
      postId: "goonbook-post-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://goonclaw.com/api/goonbook/agents/register",
    );
    expect(state.read("goonbook_agent_state", "hasmedia")).toMatchObject({
      handle: "hasmedia",
      displayName: "HASMEDIA",
      apiKey: "goonbook_agent_key_123",
    });
  });
});
