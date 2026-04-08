# HyperMyths / HyperCinema

AI-powered cinema generator: Next.js app (App Router) + background worker + standalone video render service (Google Veo / xAI / MythX / OpenMontage). Payments: Solana on-chain, x402/USDC, and discount codes. Admin cockpit included.

## Stack at a Glance

- Web: Next.js 16 (App Router), Tailwind (via `app/globals.css`), Firebase Auth+Firestore+Storage.
- Worker: Node job runner (`workers/`) advancing jobs, retries, settlements.
- Video service: Fastify API (`video-service/`) that calls Google Veo, xAI, MythX, or OpenMontage, then stitches or composes clips and uploads to Firebase Storage.
- Payments: Solana (Helius webhooks), x402 USDC, and discount codes.

## What's New

- **MythX Integration**: Replaced MythXEliza/ElizaOS with direct MythX backend API for video generation
- **OpenMontage Support**: New video engine option for editorial-style video compositions
- **Removed Crossmint**: Crossmint authentication and payment flow removed
- **Removed MoonPay**: MoonPay payment adapter removed
- **Discount Code System**: Enhanced with free generation support for admins

## Local Development

```bash
npm install
# Web
npm run dev
# Video service (separate terminal)
npm run video:dev
# Worker
npx tsx workers/server.ts
```

## Environment (minimum useful)

```bash
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...   # multiline with \n
HELIUS_API_KEY=...
SOLANA_RPC_URL=...
PAYMENT_MASTER_SEED_HEX=...
VIDEO_API_KEY=local-dev-key
VIDEO_API_BASE_URL=http://localhost:8090
WORKER_URL=http://localhost:8080
VERTEX_PROJECT_ID=...
VERTEX_API_KEY=...
VERTEX_LOCATION=us-central1
VERTEX_VEO_MODEL=veo-3.1-fast-generate-001
VEO_OUTPUT_RESOLUTION=1080p
FFMPEG_PATH=ffmpeg
MYTHX_BASE_URL=https://cloud.milady.ai
MYTHX_API_KEY=...
MYTHX_VIDEO_MODEL=default
```

Optional: `XAI_API_KEY`, `OPENROUTER_API_KEY`, `X402_FACILITATOR_URL`, `HELIUS_WEBHOOK_SECRET`.

### OpenMontage

```bash
VIDEO_INFERENCE_PROVIDER=openmontage
OPENMONTAGE_REPO_DIR=../OpenMontage
OPENMONTAGE_GIT_URL=https://github.com/calesthio/OpenMontage.git
OPENMONTAGE_COMPOSITION_ID=CinematicRenderer
OPENMONTAGE_VIDEO_WORKER_PROVIDER=google_veo
OPENMONTAGE_VIDEO_WORKER_MODEL=
OPENMONTAGE_OUTPUT_ROOT=output/openmontage
OPENMONTAGE_RENDER_TIMEOUT_MS=900000
```

Notes:

- When `APP_BASE_URL` points at `localhost`, Helius webhook subscription is skipped automatically. Paid jobs can still be created locally, but automatic on-chain webhook settlement needs a public callback URL or tunnel.
- Discount codes issued from `/admin/discount-codes` remain fully local-friendly and dispatch jobs immediately after redemption.
- `video-service` will use `OPENMONTAGE_REPO_DIR` when present, or clone `OPENMONTAGE_GIT_URL` automatically and install `remotion-composer` dependencies.

## Services

- Web app: routes under `app/`; homepage `app/page.tsx`; nav `components/SiteHeader.tsx`.
- MythX generator: `/mythx` page with direct backend API integration
- Admin cockpit: `/admin/moderation`, `/admin/inference`, `/admin/discount-codes` (guarded by cockpit auth).
- Worker: `workers/server.ts`, `workers/process-job.ts`, `workers/sweep-payments.ts`.
- Video render API: `video-service/src/server.ts` (`POST /render`, `GET /render/:id`).

## Deployment

- Firebase App Hosting hosts the Next.js web app.
- Cloud Run hosts both `hypercinema-worker` and `video-service`.
- Cloud Build uses `cloudbuild/worker.yaml` and `cloudbuild/video-service.yaml`.
- `deploy.bat` deploys worker + video-service, updates `WORKER_URL_HYPERCINEMA` and `VIDEO_API_BASE_URL_HYPERCINEMA`, then deploys App Hosting.

### Conway

- Conway is treated as a container host rather than a custom build target.
- Use [workers/Dockerfile](/c:/SessionMint/HyperCinema/workers/Dockerfile) for the worker and [video-service/Dockerfile](/c:/SessionMint/HyperCinema/video-service/Dockerfile) for the video service.
- Recommended split:
  - Firebase App Hosting: web app
  - Cloud Run or Conway container: worker
  - Cloud Run or Conway container: video-service
- For Conway, set the same runtime environment variables used by Cloud Run and expose ports `8080` (worker) and `8090` (video-service).

## Smoke Test: Video Render

```bash
curl -X POST https://video-service-<hash>.a.run.app/render \
  -H "Authorization: Bearer $VIDEO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "smoke-001",
    "wallet": "demo",
    "durationSeconds": 9,
    "withSound": true,
    "resolution": "720p",
    "hookLine": "Smoke test",
    "scenes": [{"sceneNumber":1,"visualPrompt":"Test visual","narration":"Test narration","durationSeconds":9}],
    "videoEngine": "google_veo",
    "provider": "google_veo",
    "prompt": "Test",
    "metadata": {
      "provider":"google_veo",
      "model":"veo-3.1-fast-generate-001",
      "resolution":"720p",
      "generateAudio":true,
      "prompt":"Test",
      "sceneMetadata":[{"sceneNumber":1,"durationSeconds":9,"narration":"Test narration","visualPrompt":"Test visual"}],
      "storyMetadata":{"wallet":"demo","storyKind":"generic_cinema","rangeDays":1,"packageType":"30s","durationSeconds":9}
    }
  }'
```

## Testing

- `npm test` / `npm run test:ci`
- Worker/payment/inference coverage lives in `tests/`.

## Ops Notes

- Protect `PAYMENT_MASTER_SEED_HEX`, webhook secrets, worker tokens, and video API keys.
- Cloud Run needs Vertex service account access plus Storage write access to your bucket.
- Admin cockpit should stay behind auth; not linked in public nav.

## Admin Panel

`/admin/moderation` (cockpit auth required).
