# HashCinema

HashCinema turns **recent Pump.fun memecoin trading behavior** into:

1. A playable AI trailer (Google Veo with sound)
2. A combined PDF report

It’s built to be crypto-native:

- One dedicated deposit address per job (no memo)
- Helius webhook auto-detection for incoming SOL
- Durable worker dispatch retries (outbox-backed)
- Instant + scheduled sweeps to the revenue wallet

Dedicated deposit addresses are deterministically derived from `PAYMENT_MASTER_SEED_HEX`.

## Architecture (What Runs Where)

- **Web app**: Next.js App Router (Firebase App Hosting)
- **Worker**: `workers/server.ts` (Cloud Run). Processes jobs and runs `/dispatch`, `/sweep`, `/retry-job`.
- **Video service**: `video-service/src/server.ts` (Cloud Run). Implements `/render` and polls Veo jobs.
- **Data/storage**: Firestore + Firebase Storage

### Veo Audio Coherence

Veo is invoked with `generateAudio=true`.

To keep audio coherent across a full trailer (not a scene roulette), the Veo prompt includes:

- A **Sound bible**: stable leitmotifs + act-level audio progression
- A **Scene sound reel**: per-scene bed + accent guidance

See: `lib/video/veo.ts` and `lib/cinema/generateVeoPrompt.ts`.

## Stack

- Next.js + TypeScript + Tailwind CSS
- Firebase App Hosting + Firestore + Firebase Storage
- Solana Web3.js + Helius API/Webhooks
- OpenRouter (`mistralai/mistral-small`) for copy/story fallbacks
- Google Veo (with sound) via the video-service provider layer
- Cloud Run worker + Cloud Run video-service

## Pricing

- `1d`: `0.02 SOL` + 30s video
- `2d`: `0.03 SOL` + 60s video
- `3d`: `0.04 SOL` + 90s video

### Agent Pricing (x402 on Solana USDC)

- `30s` (`1d`): `$3 USDC`
- `60s` (`2d`): `$3 USDC`
- `90s` (`3d`): `$5 USDC`

## Job States

- `awaiting_payment`
- `payment_detected`
- `payment_confirmed`
- `processing`
- `complete`
- `failed`

## Environment Variables

### Required (App + Worker)

```bash
HELIUS_API_KEY=
SOLANA_RPC_URL=
OPENROUTER_API_KEY=
VIDEO_API_KEY=
HELIUS_WEBHOOK_SECRET=
FIREBASE_PROJECT_ID=
HASHCINEMA_PAYMENT_WALLET=
PAYMENT_MASTER_SEED_HEX=
WORKER_TOKEN=
```

Notes:

- `HASHCINEMA_PAYMENT_WALLET` is the revenue sweep destination wallet.
- `WORKER_TOKEN` protects worker endpoints with bearer auth (recommended for Cloud Run).

### Optional (App + Worker)

```bash
APP_BASE_URL=http://localhost:3000
SOLANA_RPC_FALLBACK_URL=https://api.mainnet-beta.solana.com
FIREBASE_STORAGE_BUCKET=
WORKER_URL=
ALLOW_IN_PROCESS_WORKER=true
JOB_DISPATCH_BATCH_LIMIT=25
WORKER_MAX_BODY_BYTES=32768
PAYMENT_DERIVATION_PREFIX=hashcinema-job
HELIUS_WEBHOOK_ID=
SWEEP_MIN_LAMPORTS=5000
SWEEP_BATCH_LIMIT=50
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=HashCinema
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
GOONBOOK_AGENT_BIO=HashArt.fun drops AI video trailers and posts them to GoonBook.
GOONBOOK_SYNC_BATCH_LIMIT=12
ANALYTICS_ENGINE_MODE=v2_fallback_legacy
```

### Video-service (see `video-service/.env.example`)

```bash
PORT=8090
VIDEO_API_KEY=
VIDEO_SERVICE_BASE_URL=http://localhost:8090
VERTEX_PROJECT_ID=
VERTEX_API_KEY=
VERTEX_LOCATION=us-central1
VERTEX_VEO_MODEL=veo-3.1-fast-generate-001
VEO_OUTPUT_RESOLUTION=1080p
VEO_MAX_CLIP_SECONDS=8
VERTEX_POLL_INTERVAL_MS=5000
VERTEX_MAX_POLL_ATTEMPTS=180
RENDER_RECOVERY_INTERVAL_MS=30000
RENDER_STALE_MS=1200000
RENDER_RECOVERY_BATCH_LIMIT=20
FFMPEG_PATH=ffmpeg
```

## API

- `POST /api/jobs`: create job + subscribe dedicated address for webhook monitoring
- `GET /api/jobs/[jobId]`: status + artifacts + payment instructions
- `POST /api/helius-webhook`: verify transfers on-chain, confirm payment, enqueue worker
- `GET /api/report/[jobId]`
- `GET /api/video/[jobId]`
- `POST /api/x402/video`: x402-protected agent endpoint that accepts USDC on Solana and starts a paid job immediately after settlement

### x402 Agent Flow

`POST /api/x402/video`

Request body:

```json
{
  "wallet": "YOUR_SOLANA_WALLET",
  "packageType": "1d"
}
```

Or:

```json
{
  "wallet": "YOUR_SOLANA_WALLET",
  "durationSeconds": 60
}
```

Behavior:

- No `PAYMENT-SIGNATURE` header: returns `402 Payment Required` with a `PAYMENT-REQUIRED` header for Solana USDC settlement
- Valid x402 payment: creates a paid job, dispatches processing, and returns job/report/video URLs to poll

### GoonBook Automation

When `GOONBOOK_API_BASE_URL` is configured:

- Every completed job attempts an automatic GoonBook publish using the gallery thumbnail + dossier summary
- The publisher uses GoonClaw's live agent API flow at `/api/goonbook/agents/register` and `/api/goonbook/agents/posts`
- If `GOONBOOK_AGENT_API_KEY` is omitted, HashCinema auto-registers the managed `HASMEDIA` agent, stores the returned key server-side, and reuses it for later posts
- Publication state is stored in Firestore under `goonbook_publications`
- Managed agent state is stored in Firestore under `goonbook_agent_state`
- Worker backfill/retry endpoint: `POST /goonbook-sync` on the worker service

## Agent Skill

A repo-local skill lives at `skills/hasmedia/SKILL.md`.

Use it when an agent needs to:

- buy a trailer package over x402
- poll HashArt job/report/video URLs
- publish completed drops to GoonBook using the `HASMEDIA` identity

Video backend contract reference: `docs/render-veo-contract.md`

## Local Development

```bash
npm install
npm run dev
```

Video-service local run:

```bash
npm run video:dev
```

Quality checks:

```bash
npx tsc -p tsconfig.json --noEmit
npm run lint
npm test
npm run build
```

## Deploy: Cloud Run (Worker + Video Service)

This repo includes Dockerfiles and Cloud Build configs:

- `workers/Dockerfile` + `cloudbuild/worker.yaml`
- `video-service/Dockerfile` + `cloudbuild/video-service.yaml`

Example (project `hashart-fun`, region `us-central1`):

```bash
# Build images
gcloud builds submit --project hashart-fun --config cloudbuild/worker.yaml \
  --substitutions _IMAGE=us-central1-docker.pkg.dev/hashart-fun/hashart-containers/hashart-worker:latest .

gcloud builds submit --project hashart-fun --config cloudbuild/video-service.yaml \
  --substitutions _IMAGE=us-central1-docker.pkg.dev/hashart-fun/hashart-containers/hashart-video-service:latest .

# Deploy services
gcloud run deploy hashart-worker --project hashart-fun --region us-central1 \
  --image us-central1-docker.pkg.dev/hashart-fun/hashart-containers/hashart-worker:latest \
  --allow-unauthenticated

gcloud run deploy hashart-video-service --project hashart-fun --region us-central1 \
  --image us-central1-docker.pkg.dev/hashart-fun/hashart-containers/hashart-video-service:latest \
  --allow-unauthenticated
```

## Deploy: Firebase App Hosting (Web App)

App Hosting rollouts deploy from a **git commit** or **branch**. Typical flow:

```bash
# Ensure firebase CLI auth is valid (may require reauth)
firebase login --reauth

# Find backendId
firebase apphosting:backends:list

# Deploy the pushed commit SHA
firebase apphosting:rollouts:create <backendId> -g <gitCommit> -f
```
