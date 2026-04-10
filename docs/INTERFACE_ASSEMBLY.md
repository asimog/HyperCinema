# HyperCinema — Interface Assembly Audit

**Audited:** 2026-04-10  
**State:** Post-KISS cleanup, xAI-only, DexScreener-only, no payments

---

## World Declaration

HyperCinema is an **autonomous AI cinema engine** that transforms X profiles, wallet addresses, token contracts, and creative prompts into short-form cinematic videos. It runs on Vercel (frontend + API), Railway (workers + video-service), Supabase (Postgres + S3 storage), and xAI (LLM + video generation).

---

## Sovereign Boxes

Each box owns its surfaces exclusively. Connections flow through explicit interfaces. No box rewrites another box's surface.

---

### BOX 1: `lib/types` — Domain Type Registry

**Token:** `DOM`

| IS: | Single source of truth for all domain types |
| OWNS: | `lib/types/domain.ts` — `JobDocument`, `WalletStory`, `ReportDocument`, `CinematicScene`, `VideoStyleId`, `CinemaExperience` |
| MAY: | Define and export TypeScript interfaces describing domain entities |
| MAY NOT: | Contain runtime logic, import from business-logic modules, or depend on env |
| CONNECTS TO: | Every box that handles domain data (29 of 30) |

**Audit:** Clean. The most depended-upon surface. 30+ importers. No violations.

---

### BOX 2: `lib/env` — Environment Configuration

**Token:** `ENV`

| IS: | Zod-validated environment variable access |
| OWNS: | `lib/env.ts` — `getEnv()`, `Env` type |
| MAY: | Read `process.env`, validate via Zod, cache result |
| MAY NOT: | Import from business logic; no circular deps |
| CONNECTS TO: | 20+ boxes (inference, network, storage, video, workers, security, X API) |

**Audit:** 100 lines (was 294). xAI only. Clean.

---

### BOX 3: `lib/db` — Database Access

**Token:** `DB`

| IS: | Prisma client singleton |
| OWNS: | `lib/db.ts` — `db` (PrismaClient), re-exports `Prisma`, `PrismaClient` |
| MAY: | Initialize Prisma with pg adapter. Handle build-time `undefined` |
| MAY NOT: | Contain business logic, query composition, or domain types |
| CONNECTS TO: | `lib/jobs/repository`, `lib/security/rate-limit`, `lib/social/moltbook-publisher` |

**Audit:** Clean. Note: `undefined as unknown as PrismaClient` during build is a necessary workaround.

---

### BOX 4: `lib/logging` — Structured Logging

**Token:** `LOG`

| IS: | JSON-structured log emission |
| OWNS: | `lib/logging/logger.ts` — `logger.info()`, `logger.warn()`, `logger.error()` |
| MAY: | Emit structured JSON logs to console |
| MAY NOT: | Perform I/O beyond console, filter/suppress logs |
| CONNECTS TO: | Every box that emits telemetry |

**Audit:** Clean. `LogContext` convention (`component`, `stage`, `errorCode`, `errorMessage`) followed universally but should be formalized in `lib/logging/types.ts`.

---

### BOX 5: `lib/network` — HTTP Primitives

**Token:** `NET`

| IS: | Timeout-wrapped fetch + retry |
| OWNS: | `lib/network/http.ts` — `fetchWithTimeout()`; `lib/network/retry.ts` — `withRetry()`, `RetryableError` |
| MAY: | Provide composable network primitives with retries |
| MAY NOT: | Know about domain concepts (jobs, tokens, videos) |
| CONNECTS TO: | Inference, agents, video client, X API, DexScreener, job trigger |

**Audit:** Clean. Pure utility box. 8+ importers.

---

### BOX 6: `lib/inference` — Text Inference Gateway

**Token:** `INF`

| IS: | xAI text inference client |
| OWNS: | `lib/inference/text.ts` — `generateTextInference()`, `generateTextInferenceJson<T>()`; `lib/inference/config.ts` — `getTextProviderConfig()`; `lib/inference/providers.ts` — `TextInferenceProviderId = "xai"` |
| MAY: | Route text generation to xAI. Parse JSON responses |
| MAY NOT: | Contain prompt templates, business logic, or domain knowledge |
| CONNECTS TO: | `lib/ai/cinematic`, `lib/ai/openrouter`, `video-service` |

**Audit:** Clean after pruning. Provider type is xAI-only. 5 consumers.

---

### BOX 7: `lib/ai` — Creative Generation

**Token:** `AI`

| IS: | Script and report generation orchestration |
| OWNS: | `lib/ai/cinematic.ts` — `generateCinematicScript()`; `lib/ai/report.ts` — `generateReportSummary()` |
| MAY: | Call inference to generate scripts and summaries. Build fallbacks when AI fails |
| MAY NOT: | Handle job state, DB access, or video rendering |
| CONNECTS TO: | `lib/inference/text`, `lib/analytics/videoCoherence`, `lib/cinema/knowledgeBank`, `lib/cinema/storyCards`, `lib/tokens/metadata-selection` |

**Audit:** Integration box at convergence of 5+ concerns. Valid but should be explicitly documented as the integration boundary.

---

### BOX 8: `lib/analytics` — Wallet Analysis Engine

**Token:** `ANL`

| IS: | Behavioral analysis pipeline for wallet data |
| OWNS: | `lib/analytics/index.ts` — `analyzeWalletProfile()`; `lib/analytics/compute.ts` — `computeAnalyticsFromTrades()`; `lib/analytics/legacy-adapter.ts` — V2-to-legacy translation; 12 supporting modules (scoring, moment selection, narrative, video coherence, content bank) |
| MAY: | Analyze wallet trades, score metrics, assign personalities, generate story beats and video prompts |
| MAY NOT: | Generate video, render PDFs, or access DB directly |
| CONNECTS TO: | `lib/types/domain`, `lib/utils`, `lib/tokens/metadata-selection`, `workers/process-job` |

**Audit:** `legacy-adapter.ts` (920 lines) is heavy — translates V2 results to legacy `ReportDocument`/`WalletStory`. Necessary but oversized. `videoCoherence.ts` produces scene-related output that overlaps with `lib/cinema` — unclear ownership of "scene" domain.

---

### BOX 9: `lib/cinema` — Cinematic Prompt Engineering

**Token:** `CIN`

| IS: | Story state → scene plan → prompt package compiler |
| OWNS: | `lib/cinema/storyStateCompiler.ts`, `buildScenePlan.ts`, `generateVeoPrompt.ts`, `mapVisualMetaphors.ts`, `soundDirector.ts`, `storyCards.ts`, `schemas.ts`, `types.ts`, `config.ts`, `constants.ts`, `knowledgeBank.ts` |
| MAY: | Transform `WalletAnalysisResult` into structured prompt packages. Build scene plans, emotional signals, visual metaphors |
| MAY NOT: | Call inference, render video, or access DB |
| CONNECTS TO: | `lib/analytics/types` (input), `lib/ai/cinematic` (consumer) |

**Audit:** Clean internal boundaries. Well-structured sub-box architecture.

---

### BOX 10: `lib/video` — Video Render Client

**Token:** `VID`

| IS: | HTTP client for video-service + pipeline orchestrator |
| OWNS: | `lib/video/client.ts` — `renderCinematicVideo()`; `lib/video/xai.ts` — `buildXAiVideoRenderPayload()`; `lib/video/pipeline.ts` — `buildAndRenderVideo()` |
| MAY: | Send render requests, build xAI payloads, orchestrate script-then-render |
| MAY NOT: | Manage job state, write to DB, handle payments |
| CONNECTS TO: | `lib/ai/cinematic`, `lib/types/domain`, `lib/env`, `lib/network`, `video-service` (HTTP) |

**Audit:** Clean. `pipeline.ts` is a valid composition of script gen + xAI payload + render call.

---

### BOX 11: `lib/jobs` — Job Lifecycle

**Token:** `JOB`

| IS: | Job CRUD, state machine, dispatch, recovery |
| OWNS: | `lib/jobs/repository.ts` — create/update/get jobs, reports, videos; `lib/jobs/state-machine.ts` — `canTransition()`, `assertTransition()`; `lib/jobs/trigger.ts` — dispatch to worker; `lib/jobs/retry.ts`, `recovery.ts` |
| MAY: | Create/read/update jobs. Validate state transitions. Trigger worker processing. Recover stale jobs |
| MAY NOT: | Execute job pipeline, call inference, or render video |
| CONNECTS TO: | `lib/db`, `lib/types/domain`, `lib/network`, `workers/process-job` (consumer) |

**Audit:** `repository.ts` (1085 lines) handles Job, Report, and Video documents. Should be split: `JobRepository`, `ReportRepository`, `VideoRepository`. `trigger.ts` imports from `workers/process-job` for local fallback — violates lib→workers layering.

---

### BOX 12: `lib/memecoins` — Token Metadata

**Token:** `MEM`

| IS: | DexScreener metadata resolution + token video artifact builder |
| OWNS: | `lib/memecoins/metadata.ts` — `resolveMemecoinMetadata()`; `lib/memecoins/story.ts` — `buildTokenVideoArtifacts()` |
| MAY: | Fetch token metadata from DexScreener. Build `WalletStory` + `ReportDocument` for token videos |
| MAY NOT: | Access DB, render video, call inference |
| CONNECTS TO: | `lib/types/domain`, `lib/network`, `workers/process-job` |

**Audit:** Clean after DexScreener refactor. No Helius, no Pump SDK, no Solana web3.js.

---

### BOX 13: `lib/generators` — Prompt Video Artifacts

**Token:** `GEN`

| IS: | Non-token video artifact builder |
| OWNS: | `lib/generators/story.ts` — `buildPromptVideoArtifacts()` |
| MAY: | Build `WalletStory` + `ReportDocument` for prompt-based jobs (mythx, bedtime_story, music_video, generic_cinema) |
| MAY NOT: | Call inference, render video, access DB |
| CONNECTS TO: | `lib/cinema/storyCards`, `lib/cinema/audioPolicy`, `lib/types/domain` |

**Audit:** Clean. Single function, clear purpose.

---

### BOX 14: `lib/storage` — S3 Upload

**Token:** `STO`

| IS: | S3-compatible video storage upload |
| OWNS: | `lib/storage/s3.ts` — `uploadVideoToStorage()`, `isStorageConfigured()` |
| MAY: | Download from source URL, upload to S3, return public URL. Fall back gracefully |
| MAY NOT: | Generate content, manage jobs, render video |
| CONNECTS TO: | `lib/env`, `workers/process-job` |

**Audit:** Clean. Single purpose, well-isolated.

---

### BOX 15: `lib/x` — X (Twitter) API

**Token:** `XAP`

| IS: | X API authentication, profile fetching, tweet posting |
| OWNS: | `lib/x/api.ts` — `fetchXProfileTweets()`, `buildOAuth1aHeaders()`; `lib/x/client.ts` — `XClient` class |
| MAY: | Fetch X profiles, post tweets, parse commands |
| MAY NOT: | Know about jobs, video rendering, or analytics |
| CONNECTS TO: | `lib/env`, `workers/process-job`, `workers/x-bot` |

**Audit:** `client.ts` re-exports agent helper tools from `lib/agents/helpers` — boundary violation. `api.ts` (functional) and `client.ts` (class-based) duplicate X profile fetching — consolidate.

---

### BOX 16: `lib/social` — MoltBook Publisher

**Token:** `SOC`

| IS: | Social network publication for completed jobs |
| OWNS: | `lib/social/moltbook-publisher.ts` — `publishCompletedJobToMoltBook()`, `syncGalleryToMoltBook()` |
| MAY: | Register agents, publish jobs, track publication status |
| MAY NOT: | Modify job state, render video, call inference |
| CONNECTS TO: | `lib/db`, `lib/jobs/repository`, `workers/process-job` |

**Audit:** Clean.

---

### BOX 17: `lib/pdf` — PDF Generation

**Token:** `PDF`

| IS: | Report PDF generation |
| OWNS: | `lib/pdf/report.ts` — `generateReportPdf()`, `toPdfSafeText()` |
| MAY: | Generate PDF from `ReportDocument`. Sanitize text |
| MAY NOT: | Access DB or call APIs |
| CONNECTS TO: | `lib/types/domain`, `workers/process-job` |

**Audit:** Clean.

---

### BOX 18: `lib/security` — Rate Limiting + Auth

**Token:** `SEC`

| IS: | Rate limiting, IP extraction, webhook verification |
| OWNS: | `lib/security/rate-limit.ts`, `request-ip.ts`, `webhook-auth.ts` |
| MAY: | Enforce rate limits via DB counters. Extract client IPs. Verify webhook signatures |
| MAY NOT: | Manage jobs, generate content, render video |
| CONNECTS TO: | `lib/db`, API routes |

**Audit:** Clean.

---

### BOX 19: `workers/` — Job Processing Worker

**Token:** `WRK`

| IS: | Background job processing HTTP server |
| OWNS: | `workers/server.ts` — HTTP server (`POST /`, `POST /retry-job`, `POST /moltbook-sync`, `GET /healthz`); `workers/process-job.ts` — `processJob()` pipeline; `workers/commands.ts` — retry/sync commands; `workers/telegram-bot.ts`, `workers/x-bot.ts` — social bots |
| MAY: | Process jobs: analytics → report → script → video → upload → publish. Accept HTTP commands |
| MAY NOT: | Serve user-facing pages. Manage Next.js frontend |
| CONNECTS TO: | 12 lib boxes (analytics, AI, cinema, video, memecoins, generators, storage, jobs, pdf, social, X, network) |

**Audit:** God object (`process-job.ts` at 500+ lines). Orchestrates entire pipeline. Should delegate to a `PipelineOrchestrator` in lib/. Telegram bot is polling-based (no webhook) — works on Railway.

---

### BOX 20: `video-service/` — Video Render Microservice

**Token:** `VSR`

| IS: | Standalone Fastify video rendering service (xAI only) |
| OWNS: | `video-service/src/server.ts` — Fastify app (`POST /render`, `GET /render/:id`); `video-service/src/render-service.ts` — `RenderService`; `video-service/src/providers/xai-video.ts` — xAI client; `video-service/src/pipeline/` — scene planning, media ops; `video-service/src/types.ts`, `env.ts`, `repository.ts`, `db.ts` |
| MAY: | Accept render requests. Generate clips via xAI. Concatenate clips. Generate thumbnails. Upload to S3. Recover stale jobs |
| MAY NOT: | Generate scripts, manage app jobs, produce reports |
| CONNECTS TO: | `lib/video/client.ts` (HTTP consumer), xAI API, S3 storage |

**Audit:** Well-isolated as separate deployable unit. Own `db.ts`, `env.ts`, `types.ts`. Does not import from main `lib/`. HTTP contract (`POST /render`, `GET /render/:id`) forms explicit interface with `lib/video/client.ts`.

---

### BOX 21: `app/api/*` — HTTP API Routes

**Token:** `API`

| IS: | Next.js API route handlers |
| OWNS: | `/api/jobs/*` — job CRUD; `/api/video/*` — video creation/status; `/api/render/*` — render proxy; `/api/worker/trigger` — dispatch; `/api/chat/stream` — AI chat; `/api/autonomous/*` — autonomous mode; `/api/report/*` — PDF serving; `/api/hyperm/*`, `/api/moltbook/*`, `/api/service/*`, `/api/generate/*` |
| MAY: | Accept HTTP requests. Create/query jobs. Proxy to video-service. Serve artifacts |
| MAY NOT: | Contain business logic. Generate content directly. Manage DB transactions |
| CONNECTS TO: | `lib/jobs/repository`, `lib/jobs/trigger`, `lib/security`, `lib/env` |

**Audit:** Thin adapters. Correct API layer behavior.

---

### BOX 22: `app/` — Pages

**Token:** `PG`

| IS: | Next.js page routes |
| OWNS: | `/` — homepage (chat + generate); `/job/[jobId]` — job detail; `/creator/*` — creator tools; `/autonomous` — autonomous mode; `/privacy`, `/terms` — legal |
| MAY: | Render UI, fetch from API routes, manage client state |
| MAY NOT: | Import from business logic boxes |
| CONNECTS TO: | `app/api/*` via fetch |

**Audit:** Clean.

---

### BOX 23: `components/` — React UI

**Token:** `CMP`

| IS: | Client-side React components |
| OWNS: | `SiteHeader.tsx`, `SiteFooter.tsx`, `VideoPlayer.tsx`, `ReportCard.tsx`, `CinemaConciergeChat.tsx`, `CinemaGeneratorClient.tsx`, `HyperMGeneratorClient.tsx`, `MythXGeneratorClient.tsx`, UI primitives |
| MAY: | Render UI. Call API routes. Manage client state |
| MAY NOT: | Import from business logic. Call inference. Manage job state directly |
| CONNECTS TO: | `app/api/*` via fetch |

**Audit:** Clean.

---

## Shared Interface Contracts

### Contract A: `JobDocument` Lifecycle
- **Owner:** BOX 11 (`lib/jobs`)
- **Shape:** `lib/types/domain.ts` — `JobDocument`
- **State machine:** `pending → processing → complete|failed`, `failed → pending` (retry)
- **Consumers:** BOX 19 (worker), BOX 21 (API routes), BOX 22 (pages), BOX 16 (MoltBook)
- **Status:** ✅ Explicit, validated

### Contract B: `{ report, story }` Pair
- **Producers:** BOX 8 (`analytics/legacy-adapter`), BOX 12 (`memecoins/story`), BOX 13 (`generators/story`)
- **Shape:** `{ report: Omit<ReportDocument, "summary"|"downloadUrl">, story: WalletStory }`
- **Consumers:** BOX 19 (worker pipeline)
- **Status:** ⚠️ Emergent contract — three boxes produce this shape independently. Should be formalized.

### Contract C: Video Service HTTP API
- **Owner:** BOX 20 (`video-service`)
- **Endpoints:** `POST /render`, `GET /render/:id`, `GET /healthz`
- **Request:** `NormalizedRenderRequest` (Zod-validated)
- **Response:** `{ id, jobId, statusUrl, videoUrl?, thumbnailUrl? }`
- **Consumer:** BOX 10 (`lib/video/client.ts`)
- **Status:** ✅ Explicit Zod schema, but duplicated in `lib/video/xai.ts`

### Contract D: `WalletStory` Input
- **Owner:** BOX 1 (`lib/types/domain`)
- **Consumers:** BOX 7 (AI cinematic), BOX 10 (video pipeline), BOX 13 (generators)
- **Status:** ✅ Well-defined but large (~60 fields)

### Contract E: Worker HTTP Protocol
- **Owner:** BOX 19 (`workers/server.ts`)
- **Endpoints:** `POST /` (process job), `POST /retry-job`, `POST /moltbook-sync`, `GET /healthz`
- **Status:** ⚠️ No Zod validation on incoming requests

---

## Boundary Violations

| Violation | Severity | Fix |
|-----------|----------|-----|
| `lib/x/client.ts` re-exports `lib/agents/helpers` | Medium | Remove re-exports, create `lib/agents/helpers.ts` standalone |
| `lib/jobs/trigger.ts` imports `workers/process-job` | Medium | Use HTTP-only dispatch; remove local fallback import |
| `workers/process-job.ts` is 500+ lines | Medium | Extract pipeline stages into lib/ orchestrator |
| `lib/jobs/repository.ts` handles Job+Report+Video (1085 lines) | Low | Split into 3 repository files |
| Three boxes produce `{report, story}` independently | Low | Formalize as factory in `lib/types/domain` |
| Video service request schema duplicated in `lib/video/xai.ts` | Low | Share single Zod schema between both |

---

## Merkle State

World root: `HC-DOM-ENV-DB-LOG-NET-INF-AI-ANL-CIN-VID-JOB-MEM-GEN-STO-XAP-SOC-PDF-SEC-WRK-VSR-API-PG-CMP`

Each box contributes its token to an ordered root. No box owns another box's token.
