# HyperMyths / HyperCinema

AI-powered cinema generator: Next.js app (App Router) + background worker + standalone video render service (Google Veo / xAI). Payments: Solana on-chain, x402/USDC, discount codes, MoonPay. Admin cockpit included.

## Stack at a Glance
- Web: Next.js 16 (App Router), Tailwind (via `app/globals.css`), Firebase Auth+Firestore+Storage.
- Worker: Node job runner (`workers/`) advancing jobs, retries, settlements.
- Video service: Fastify API (`video-service/`) that calls Google Veo or xAI, stitches clips with ffmpeg, uploads to Firebase Storage.
- Payments: Solana (Helius webhooks), MoonPay, x402 USDC.

## Local Development
```bash
npm install
# Web
npm run dev
# Video service (separate terminal)
npm run video:dev
# Worker (optional local inline run)
ALLOW_IN_PROCESS_WORKER=true npm run dev
```

## Environment (minimum useful)
```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...   # multiline with \n
HELIUS_API_KEY=...
SOLANA_RPC_URL=...
PAYMENT_MASTER_SEED_HEX=...
VIDEO_API_KEY=local-dev-key
VIDEO_API_BASE_URL=http://localhost:8090
VERTEX_PROJECT_ID=...
VERTEX_API_KEY=...
VERTEX_LOCATION=us-central1
VERTEX_VEO_MODEL=veo-3.1-fast-generate-001
VEO_OUTPUT_RESOLUTION=1080p
FFMPEG_PATH=ffmpeg
```
Optional: `XAI_API_KEY`, `MOONPAY_API_KEY`, `OPENROUTER_API_KEY`, `CROSSMINT_*`, `X402_FACILITATOR_URL`, `HEL IUS_WEBHOOK_SECRET`, `MOONPAY_WEBHOOK_SHARED_TOKEN`.

## Services
- Web app: routes under `app/`; homepage `app/page.tsx`; nav `components/SiteHeader.tsx`.
- Admin cockpit: `/admin/moderation`, `/admin/inference`, `/admin/discount-codes` (guarded by cockpit auth).
- Worker: `workers/server.ts`, `workers/process-job.ts`, `workers/sweep-payments.ts`.
- Video render API: `video-service/src/server.ts` (`POST /render`, `GET /render/:id`).

## Deployment (reference)
- Cloud Build: `cloudbuild/video-service.yaml` builds `gcr.io/<project>/video-service:latest`.
- Cloud Run: deploy image with env vars above; port 8090.
- Firebase App Hosting: `apphosting.yaml` wires web env/secret vars.
- Script: `deploy.bat` (runs Cloud Build → Cloud Run → App Hosting secret update → Firebase deploy).

## Smoke Test: Video Render
```
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
- Worker/payment/inference coverage in `tests/`.

## Ops Notes
- Protect `PAYMENT_MASTER_SEED_HEX`, webhook secrets, and video API keys.
- Cloud Run needs Vertex service account with `aiplatform.user` and Storage write to your bucket.
- Admin cockpit should stay behind auth; not linked in public nav.

## Admin Panel
`/admin/moderation` (cockpit auth required).
