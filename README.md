# HyperMyths

**Autonomous AI cinema engine.** Turns X profiles, wallet addresses, token contracts, and creative prompts into short-form cinematic videos. Free. No payments.

**Live:** [www.hypermyths.com](https://www.hypermyths.com)  
**X:** [@HyperMythsX](https://x.com/HyperMythX)  
**Telegram:** [@HyperMythXBot](https://t.me/HyperMythXBot)

---

## Stack

| Layer         | Tech                                                                 | Where          |
| ------------- | -------------------------------------------------------------------- | -------------- |
| Frontend      | Next.js 16 (App Router), Tailwind CSS, Fragment Mono + Space Grotesk | Vercel         |
| Database      | PostgreSQL (Supabase)                                                | Railway        |
| Storage       | S3-compatible (Supabase Storage)                                     | Supabase       |
| Worker        | Node.js HTTP server + Telegram bot + X bot                           | Railway Docker |
| Video Service | Fastify + xAI + ffmpeg + S3 upload                                   | Railway Docker |
| AI            | xAI (Grok-3 text + grok-imagine-video)                               | xAI API        |
| Social        | Telegram (polling) + X/Twitter (mention polling)                     | Railway        |

## Architecture

```
┌─────────────┐     POST /api/jobs      ┌──────────────────┐
│   Vercel    │ ──────────────────────→  │   Railway Worker  │
│  Frontend   │                          │   (port 8080)     │
│  + API      │ ←─── polling /api/jobs ─ │                   │
└─────────────┘                          └────────┬─────────┘
                                                  │
                                        ┌─────────▼──────────┐
                                        │   Railway Video     │
                                        │   Service (8090)    │
                                        │   xAI → ffmpeg → S3 │
                                        └─────────┬──────────┘
                                                  │
                                        ┌─────────▼──────────┐
                                        │   Supabase S3       │
                                        │   Storage (videos)  │
                                        └────────────────────┘
```

## What It Does

### Input Types

| Input                              | Flow                                                                    | Output              |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------- |
| `@username` or `https://x.com/...` | Scrapes X profile → generates autobiography video                       | 30s cinematic short |
| Solana/Ethereum/Base/BNB address   | Fetches token metadata from DexScreener → generates trading story video | 30s cinematic short |
| Creative prompt                    | Builds story from prompt → generates video                              | 30s cinematic short |
| "random"                           | Picks random prompt → generates video                                   | 30s cinematic short |

### How to Use

1. Go to [www.hypermyths.com](https://www.hypermyths.com)
2. Chat with HyperM — tell it what you want
3. Type an `@handle`, wallet address, or creative prompt
4. Press **GENERATE →**
5. Watch your video being created live

### Bots

- **Telegram:** Message [@HyperMythXBot](https://t.me/HyperMythXBot)
  - `/video @username` — autobiography video
  - `/video <address>` — token video
  - `/random` — random cinema
  - `/status <jobId>` — check progress
- **X/Twitter:** Mention [@HyperMythsX](https://x.com/HyperMythX)
  - `@HyperMythsX @someone` — autobiography for @someone
  - `@HyperMythsX <address>` — token video
  - `@HyperMythsX random` — random cinema

## Local Development

```bash
npm install
npm run dev          # Next.js on :3000
npm run video:dev    # Video service on :8090 (separate terminal)
```

### Minimum Env (`.env.local`)

```bash
# Database (Supabase external connection string)
DATABASE_URL=postgresql://...

# xAI API (text + video)
XAI_API_KEY=xai-your-key-here
XAI_BASE_URL=https://api.x.ai/v1

# Video service
VIDEO_API_KEY=local-dev-key
VIDEO_API_BASE_URL=http://localhost:8090

# App
APP_BASE_URL=http://localhost:3000
ALLOW_IN_PROCESS_WORKER=true
```

### Telegram Bot (optional)

```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### X/Twitter Bot (optional)

```bash
X_API_BEARER_TOKEN=your-bearer-token
X_API_CONSUMER_KEY=...
X_API_CONSUMER_SECRET=...
X_API_ACCESS_TOKEN=...
X_API_ACCESS_TOKEN_SECRET=...
```

## Deployment

### Vercel (Frontend)

Push to `main` — Vercel auto-deploys from GitHub integration.

Required env vars:

- `DATABASE_URL` — Supabase Postgres external connection
- `XAI_API_KEY` — xAI API key
- `VIDEO_API_BASE_URL` — Railway video-service public HTTPS URL
- `VIDEO_API_KEY` — Shared secret (must match Railway)
- `WORKER_URL` — Railway worker public HTTPS URL
- `WORKER_TOKEN` — Worker auth secret
- `APP_BASE_URL` — Your Vercel URL
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — Supabase S3

### Railway (Worker Service)

Dockerfile: `workers/Dockerfile`

Required env vars:

- `DATABASE_URL` — Supabase Postgres internal connection
- `XAI_API_KEY` — xAI API key
- `VIDEO_API_BASE_URL` — `http://video.railway.internal:8090`
- `VIDEO_API_KEY` — Shared secret
- `WORKER_TOKEN` — Auth secret for Vercel→worker calls
- `APP_BASE_URL` — Vercel frontend URL
- `TELEGRAM_BOT_TOKEN` — For Telegram bot (polling, no webhook needed)
- `X_API_*` — For X bot (OAuth 1.0a + Bearer)

### Railway (Video Service)

Dockerfile: `video-service/Dockerfile`

Required env vars:

- `VIDEO_API_KEY` — Shared secret (must match worker)
- `XAI_API_KEY` — xAI API key for video generation
- `S3_ENDPOINT` — Supabase S3 endpoint
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — Supabase S3 credentials
- `S3_BUCKET` — `videos` (default)

## Project Structure

```
app/                    # Next.js pages + API routes
  api/
    jobs/               # Job CRUD
    video/              # Video creation/status
    render/             # Render proxy to video-service
    chat/               # AI chat stream
    worker/             # Job trigger
    autonomous/         # Autonomous mode
components/             # React UI
lib/
  ai/                   # Script generation
  analytics/            # Wallet analysis engine
  cinema/               # Cinematic prompt engineering
  generators/           # Prompt video artifacts
  inference/            # xAI text inference
  jobs/                 # Job lifecycle
  memecoins/            # DexScreener metadata
  network/              # HTTP + retry primitives
  social/               # MoltBook publisher
  storage/              # S3 upload
  video/                # Video render client
  x/                    # X/Twitter API
  env.ts                # Env validation
  db.ts                 # Prisma client
video-service/          # Standalone Fastify video service
  src/
    server.ts           # Fastify app
    render-service.ts   # Render orchestrator
    types.ts            # Request/response schemas
    providers/          # xAI video client
    pipeline/           # Scene planning, media ops
    env.ts              # Video-service env
workers/
  server.ts             # HTTP worker server
  process-job.ts        # Main pipeline
  telegram-bot.ts       # Telegram bot
  x-bot.ts              # X/Twitter bot
tests/                  # Vitest test suite
```

## Design

- **Font:** Fragment Mono (code-like, brutalist) + Space Grotesk (display)
- **Colors:** Seafoam (#6EEAB0) on pure black (#000000)
- **Style:** Compute-system aesthetic — high contrast, minimal, digital
- **All buttons:** Seafoam background, black text
- **Grid:** Subtle seafoam grid lines on dark background

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ci       # CI reporter
```

42 tests pass, 0 fail. Video-service contract, scene planning, render retry, client polling, job state machine, recovery, retry route, security, and analytics tests.

## Interface Assembly

See [docs/INTERFACE_ASSEMBLY.md](docs/INTERFACE_ASSEMBLY.md) for the full sovereign box inventory, shared contracts, boundary violations, and merkle state.

## License

Private. All rights reserved.
