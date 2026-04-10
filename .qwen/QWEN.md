# HyperCinema — Architecture & Deployment Plan

## Stack (Fast Deployment)
- **Vercel** — Frontend + API routes (Next.js 16). Integrated with Supabase.
- **Supabase** — PostgreSQL database (primary DB) + Storage (video blobs) + SSR auth.
- **Railway** — Docker services only: `workers` (Telegram bot + X bot + job processor) + `video-service` (xAI video rendering).
- **xAI** — LLM inference (text) + video generation (`grok-imagine-video`).
- **X (Twitter)** — @HyperMythX bot for mention-based video generation.
- **Telegram** — @HyperMythXBot for command-based video generation.

## Data Flow
1. User sends request via Vercel frontend → `/api/jobs` creates job in Supabase Postgres
2. Vercel triggers Railway worker via HTTP (`WORKER_URL` + `WORKER_TOKEN`)
3. Worker picks up job, calls video-service (`VIDEO_API_BASE_URL` internal Railway DNS)
4. Video-service calls xAI API, generates clips, concatenates with ffmpeg, uploads to Supabase Storage (S3-compatible)
5. Worker marks job complete in Supabase
6. Telegram/X bots poll Supabase for completion, deliver videos
7. Frontend polls `/api/jobs/{jobId}` for status updates

## Environment Variables
### Vercel (Production)
- `DATABASE_URL` — Supabase Postgres external connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `SUPABASE_SERVICE_KEY` — Supabase service role key
- `XAI_API_KEY` — xAI for text inference
- `XAI_VIDEO_MODEL` — grok-imagine-video
- `VIDEO_API_BASE_URL` — Railway video-service public HTTPS URL
- `VIDEO_API_KEY` — Shared secret for video-service
- `WORKER_TOKEN` — Shared secret for triggering Railway worker
- `WORKER_URL` — Railway worker public HTTPS URL
- `X_API_BEARER_TOKEN` — X API for tweet scraping
- `X_OAUTH2_CLIENT_ID` / `X_OAUTH2_CLIENT_SECRET` — X OAuth for posting
- `X_API_CONSUMER_KEY` / `X_API_CONSUMER_SECRET` / `X_API_ACCESS_TOKEN` / `X_API_ACCESS_TOKEN_SECRET` — X OAuth 1.0a
- `APP_BASE_URL` — Vercel frontend URL
- `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` / `S3_REGION` / `S3_PUBLIC_URL` — Supabase S3 storage
- `EDGE_CONFIG` — Vercel Edge Config (rate limiting cache)
- `COCKPIT_USERNAME` / `COCKPIT_PASSWORD` — Admin panel

### Railway Workers Service
- `DATABASE_URL` — Supabase Postgres external connection string (same as Vercel)
- `XAI_API_KEY` — xAI for text inference
- `WORKER_TOKEN` — Bearer auth for worker HTTP endpoint
- `VIDEO_API_BASE_URL` — Railway internal: `http://video.railway.internal:8090`
- `VIDEO_API_KEY` — Shared secret
- `X_API_BEARER_TOKEN` — X API for tweet scraping
- `X_API_CONSUMER_KEY` / `X_API_CONSUMER_SECRET` / `X_API_ACCESS_TOKEN` / `X_API_ACCESS_TOKEN_SECRET` — X OAuth 1.0a
- `APP_BASE_URL` — Vercel frontend URL
- `TELEGRAM_BOT_TOKEN` — 8591718179:AAF5K1JtM_vwZdRAtpUCP-Wkr0hOFWZyhvk
- `ALLOW_IN_PROCESS_WORKER` — false
- `PORT` — 8080

### Railway Video-Service
- `VIDEO_API_KEY` — Shared secret
- `XAI_API_KEY` — xAI for video
- `XAI_BASE_URL` — https://api.x.ai/v1
- `XAI_VIDEO_MODEL` — grok-imagine-video
- `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` / `S3_REGION` / `S3_PUBLIC_URL` — Supabase S3

## Chain Support
- Solana (Pump.fun)
- BNB (FOUR.MEME)
- Base (Clanker.world)
- Public RPCs only

## Payments
- No payment logic. All jobs have `paymentWaived: true`.

## Key Constraints
- KISS analysis: Keep It Simple, Stupid
- Fast deployment first, iterate later
- All features preserved, just stripped of dead providers
- xAI-only for video and text inference
