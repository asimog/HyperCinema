# HyperMyths

HyperMyths is a Next.js application for generating cinematic video experiences from a small amount of user input. The public product surface includes several story modes such as creator cuts, X-profile autobiographies, token-led trading stories, family keepsakes, music-led videos, and scene recreation.

The repo is split into a web app, a background worker, and a dedicated video render service. Payments can be handled through manual Solana deposits, MoonPay checkout, discount codes, and x402 / USDC flows for agent-style requests.

## Product Overview

HyperMyths is built around a few user-facing experiences:

- `HyperM` for creator-style concept cuts
- `MythX` for autobiographies derived from X profiles
- `HashMyth` for token and wallet story videos
- `LoveX` for family moments and keepsakes
- `TrenchMyths`, `FunMyths`, `Music`, and `Recreator` for additional story modes

Each experience maps to a route in the App Router and is configured through shared cinema configuration in `lib/cinema/config.ts`.

## Architecture

### Frontend

- Next.js App Router UI
- Global shell and navigation in `components/SiteHeader.tsx`
- Homepage in `app/page.tsx`
- Experience-specific generator clients:
  - `components/cinema/CinemaGeneratorClient.tsx`
  - `components/hyperm/HyperMGeneratorClient.tsx`
- Shared chat and checkout surfaces:
  - `components/chat/CinemaConciergeChat.tsx`
  - `components/PaymentInstructionsCard.tsx`

### Backend

- Job creation, retry, discount, and status routes in `app/api/jobs`
- X-profile tweet ingestion in `app/api/hyperm/tweets`
- Manual Solana and MoonPay payment handling
- x402 / USDC endpoint in `app/api/x402/video`
- Helius webhook ingestion in `app/api/helius-webhook`
- Inference endpoints in `app/api/inference/text` and `app/api/inference/video`
- Media output routes in `app/api/report/[jobId]` and `app/api/video/[jobId]`

### Background Processing

- `workers/server.ts` dispatches due jobs
- `workers/process-job.ts` advances jobs through analysis, prompt generation, and render
- `workers/sweep-payments.ts` sweeps collected Solana payments
- `workers/commands.ts` exposes operational commands for the worker runtime

### Data And Storage

- Firestore stores jobs, reports, and runtime state
- Firebase Storage stores generated assets
- Helius is used for Solana chain activity and webhook subscription management
- OpenRouter / OpenAI / Anthropic / Replicate / Hugging Face / Ollama can be used as inference backends depending on config

## Key Routes

### UI routes

- `/` homepage and primary product entry
- `/HyperCinema`
- `/HyperM`
- `/MythX`
- `/HashMyth`
- `/LoveX`
- `/TrenchCinema`
- `/FunCinema`
- `/MusicVideo`
- `/Recreator`
- `/gallery`
- `/gallery/private`
- `/trending`
- `/job/[jobId]`
- `/login`

### API routes

- `POST /api/jobs`
- `GET /api/jobs/[jobId]`
- `POST /api/jobs/[jobId]/retry`
- `POST /api/jobs/[jobId]/discount`
- `POST /api/jobs/[jobId]/moonpay/start`
- `GET /api/report/[jobId]`
- `GET /api/video/[jobId]`
- `POST /api/x402/video`
- `POST /api/hyperm/tweets`
- `POST /api/inference/text`
- `POST /api/inference/video`
- `GET /api/service`
- `POST /api/helius-webhook`
- `POST /api/moonpay-webhook`

### Admin routes

- `/admin/moderation`
- `/admin/inference`
- `/admin/discount-codes`
- `/amber-vaults`

## Payments And Inference Pipeline

### Manual Solana checkout

1. `POST /api/jobs` creates a job and assigns a dedicated payment address.
2. `app/api/jobs/[jobId]` exposes payment instructions.
3. `app/api/helius-webhook` receives on-chain activity.
4. `lib/payments/onchain-verify.ts` and `lib/payments/settlement.ts` verify and apply settlement.
5. Once payment is confirmed, the job transitions into processing and the worker dispatches render work.
6. The finished report and video are available from `GET /api/report/[jobId]` and `GET /api/video/[jobId]`.

### MoonPay

- `POST /api/jobs/[jobId]/moonpay/start` prepares a hosted checkout flow.
- MoonPay webhook events are handled in `app/api/moonpay-webhook/route.ts`.
- Confirmed payment advances the same job pipeline as manual Solana payments.

### x402 / USDC

- `POST /api/x402/video` validates the x402 payment signature and settles the request.
- A successful payment creates the job immediately and dispatches rendering.

### Inference

- Text inference is handled by `app/api/inference/text`
- Video inference is handled by `app/api/inference/video`
- Backend provider selection comes from `lib/env.ts` and the inference runtime config
- The video pipeline is implemented under `lib/video`

## Configuration

Environment variables are validated in `lib/env.ts`.

### Required

```bash
HELIUS_API_KEY=
SOLANA_RPC_URL=
VIDEO_API_KEY=
FIREBASE_PROJECT_ID=
PAYMENT_MASTER_SEED_HEX=
```

### Common optional

```bash
APP_BASE_URL=http://localhost:3000
SOLANA_RPC_FALLBACK_URL=https://api.mainnet-beta.solana.com
FIREBASE_STORAGE_BUCKET=
WORKER_URL=
WORKER_TOKEN=
ALLOW_IN_PROCESS_WORKER=true
JOB_DISPATCH_BATCH_LIMIT=25
JOB_PROCESSING_STALE_MS=120000
PAYMENT_DERIVATION_PREFIX=hashcinema-job
HELIUS_WEBHOOK_ID=
HELIUS_WEBHOOK_SECRET=
SWEEP_MIN_LAMPORTS=5000
SWEEP_BATCH_LIMIT=50
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=HYPERCINEMA
OPENROUTER_SITE_URL=
VIDEO_API_BASE_URL=
VIDEO_ENGINE=google_veo
VIDEO_VEO_MODEL=veo-3.1-fast-generate-001
VIDEO_RESOLUTION=1080p
VIDEO_RENDER_POLL_INTERVAL_MS=5000
VIDEO_RENDER_MAX_POLL_ATTEMPTS=2160
X402_FACILITATOR_URL=https://x402.dexter.cash
GOONBOOK_API_BASE_URL=
GOONBOOK_AGENT_API_KEY=
GOONBOOK_AGENT_HANDLE=hasmedia
GOONBOOK_AGENT_DISPLAY_NAME=HASMEDIA
GOONBOOK_AGENT_BIO=HyperMyths drops AI video trailers and posts them to GoonBook.
GOONBOOK_SYNC_BATCH_LIMIT=12
ANALYTICS_ENGINE_MODE=v2_fallback_legacy
MOONPAY_API_KEY=
MOONPAY_WEBHOOK_SHARED_TOKEN=
NEXT_PUBLIC_MOONPAY_PAYLINK_ID=
NEXT_PUBLIC_MOONPAY_NETWORK=
CROSSMINT_SERVER_API_KEY=
NEXT_PUBLIC_CROSSMINT_API_KEY=
CROSSMINT_COOKIE_DOMAIN=
CROSSMINT_ADMIN_ALLOWLIST=
```

See `apphosting.yaml` for the deployment environment variable wiring used in hosted environments.

## Local Development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Run the video service in another terminal:

```bash
npm run video:dev
```

Useful checks:

```bash
npm run lint
npm run build
npm test
```

## Testing

The repo uses Vitest for unit and integration-style tests.

- `npm test` runs the main suite
- `npm run test:ci` runs the suite with the default reporter
- `npm run test:live` runs the external smoke test only

Coverage in the current repository includes:

- payment settlement and webhook logic
- Solana / Helius transaction processing
- inference config and render pipeline behavior
- job state machine and retry flows
- report generation and PDF output
- rate limiting and security helpers

## Deployment Notes

The app is designed around three runtime pieces:

1. The Next.js web app
2. The background worker
3. The video render service

Production deployment should ensure:

- the web app can reach Firestore, Firebase Storage, Helius, and the selected inference/video providers
- the worker process has access to the same job datastore and payment config
- the video service can be started independently and receives the same runtime config
- webhook endpoints are reachable for Helius and MoonPay
- `APP_BASE_URL` is set correctly for generated status and return URLs

If you are deploying the app on a platform that supports separate services, keep the worker and video service separate from the web tier.

## Operational Concerns

- Payment addresses are derived from a master seed. Protect `PAYMENT_MASTER_SEED_HEX`.
- `HELIUS_WEBHOOK_SECRET` and `MOONPAY_WEBHOOK_SHARED_TOKEN` should be treated as secrets, not public config.
- Keep the public and private pricing paths in sync with `lib/cinema/config.ts` and `lib/packages.ts`.
- `ALLOW_IN_PROCESS_WORKER` is useful for local development, but production should run the worker separately.
- Job retries and sweeps are operational workflows, not end-user features. Monitor them separately.
- Inference and render backends are configurable. A bad provider config can stall the queue without breaking the UI.
- The repo includes admin routes and moderator tooling. Keep those behind auth and out of public navigation.

## Repository Layout

```text
app/         Next.js routes, APIs, pages, and layout
components/  Reusable UI and experience-specific clients
lib/         Core domain logic, payments, jobs, inference, analytics, and storage helpers
workers/     Background worker and command entrypoints
tests/       Vitest suite for domain, API, and integration behavior
```

## Repo Skill

Local repo skill:

- `skills/hasmedia/SKILL.md`

Use it for x402 video jobs, job polling, report retrieval, and GoonBook publishing flows.
