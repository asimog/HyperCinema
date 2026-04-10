# HyperMyths

**Autonomous AI cinema engine.** Turns X profiles, wallet addresses, token contracts, and creative prompts into short-form cinematic videos. Free. No payments.

---

## Quick Start

See [docs/OPERATOR_SETUP.md](docs/OPERATOR_SETUP.md) for the full clean install guide.

**TL;DR — 4 steps:**

1. Fork this repo
2. Create a Supabase project → get DB string, create `videos` bucket (public), get S3 keys
3. Run `npm install && npx prisma migrate deploy`
4. Deploy to Vercel → set env vars → done

### One-Click Deploy

```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fasimog%2FHyperCinema&integrationIds=supabase
```

Auto-links Vercel + Supabase. You still need to add:

| Variable                  | Value                                             |
| ------------------------- | ------------------------------------------------- |
| `XAI_API_KEY`             | Your xAI API key                                  |
| `VIDEO_API_KEY`           | Any random string                                 |
| `WORKER_TOKEN`            | Any random string                                 |
| `ALLOW_IN_PROCESS_WORKER` | `true`                                            |
| `S3_ENDPOINT`             | `https://[project-ref].supabase.co/storage/v1/s3` |
| `S3_ACCESS_KEY_ID`        | From Supabase S3 settings                         |
| `S3_SECRET_ACCESS_KEY`    | From Supabase S3 settings                         |
| `APP_BASE_URL`            | Your Vercel URL                                   |

---

## Stack

| Layer    | Tech                                                        | Where              |
| -------- | ----------------------------------------------------------- | ------------------ |
| Frontend | Next.js 16, Tailwind, Fragment Mono + Space Grotesk         | Vercel             |
| Database | PostgreSQL (Supabase)                                       | Supabase           |
| Storage  | S3-compatible (Supabase Storage)                            | Supabase           |
| AI       | xAI (grok-3 text + grok-imagine-video), OpenRouter fallback | xAI API            |
| Bots     | Telegram + X/Twitter (optional)                             | Railway (optional) |

## Architecture

```
Vercel (yourdomain.com)
├── Next.js pages + API routes
├── Worker trigger (runs jobs in-process)
└── Direct xAI calls for text + video

Supabase
├── PostgreSQL (jobs, reports, videos, rate limits)
└── S3 Storage (video blobs in "videos" bucket)

xAI
├── grok-3 — script generation, chat
└── grok-imagine-video — video generation (720p, 1:1)
```

## What It Does

| Input                | Flow                                       | Output              |
| -------------------- | ------------------------------------------ | ------------------- |
| `@username`          | Scrapes X profile → autobiography video    | 30s cinematic short |
| Wallet/token address | DexScreener metadata → trading story video | 30s cinematic short |
| Creative prompt      | Builds story from prompt → generates video | 30s cinematic short |
| "random"             | Picks random prompt → generates video      | 30s cinematic short |

## Project Structure

```
app/               # Next.js pages + API routes
components/        # React UI
lib/
  ai/              # Script generation
  analytics/       # Wallet analysis engine
  cinema/          # Cinematic prompt engineering
  generators/      # Prompt video artifacts
  inference/       # xAI + OpenRouter text inference
  jobs/            # Job lifecycle
  memecoins/       # DexScreener metadata
  network/         # HTTP + retry primitives
  social/          # MoltBook publisher
  storage/         # S3 upload
  video/           # Video render client
  x/               # X/Twitter API
  env.ts           # Env validation
  db.ts            # Prisma client
video-service/     # Standalone Fastify video service (Railway, optional)
workers/           # Telegram bot + X bot + worker server (Railway, optional)
tests/             # Vitest test suite (42 passing)
```

## Design

- **Font:** Fragment Mono + Space Grotesk
- **Colors:** Seafoam (#6EEAB0) on pure black (#000000)
- **Style:** Compute-system aesthetic — high contrast, minimal, digital
- **Buttons:** Seafoam background, black text

## Testing

```bash
npm test              # 42 tests pass, 0 fail
npm run test:watch    # Watch mode
```

## Docs

- [Operator Setup](docs/OPERATOR_SETUP.md) — clean install guide
- [Codebase Review](docs/CODEBASE_REVIEW.md) — pipeline architecture, video stitching, bug log
- [Interface Assembly](docs/INTERFACE_ASSEMBLY.md) — sovereign box inventory

## License

Private. All rights reserved.
