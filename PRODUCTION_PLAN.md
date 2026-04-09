# HyperCinema — Production Plan

## Vision

Free AI video creation platform. No payments. No friction. Users create cinematic videos from X profiles, wallets, or memecoins. Rate-limited to keep it fair.

---

## Architecture

```
┌─────────────────────────────────┐
│  VERCEL                         │
│  Next.js Frontend               │
│  - Chat homepage                │
│  - Media Creator                │
│  - Gallery/Feed                 │
│  - Admin dashboard              │
│  - Logs                         │
└─────────┬───────────────────────┘
          │ API calls
          ▼
┌─────────────────────────────────┐
│  RAILWAY                        │
│                                 │
│  ┌─────────────┐ ┌────────────┐ │
│  │ Video Svc   │ │ Worker Svc │ │
│  │ (Docker)    │ │ (Node.js)  │ │
│  │ + ffmpeg    │ │ + agents   │ │
│  │ + OpenMontage│ │            │ │
│  └──────┬──────┘ └─────┬──────┘ │
│         │               │        │
│  ┌──────┴──────────────┴──────┐ │
│  │  PostgreSQL (Railway)     │ │
│  │  - Jobs, users, rate limits│ │
│  │  - Video metadata         │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Persistent Volume        │ │
│  │  /data/videos (rendered)  │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Storage:** Railway Persistent Volume (`/data/videos`) — video files saved here, served via HTTP endpoint.

---

## AI Providers

| Purpose          | Provider    | Model               |
| ---------------- | ----------- | ------------------- |
| Text Inference   | xAI         | grok-4.20-reasoning |
| Video Generation | xAI         | grok-imagine-video  |
| Fallback Text    | OpenRouter  | auto-routed         |
| Fallback Video   | OpenMontage | configurable        |

---

## Video Specifications

| Feature                      | Setting                            |
| ---------------------------- | ---------------------------------- |
| **Default Resolution**       | 720p                               |
| **Fallback Resolution**      | 480p (if 720p unavailable)         |
| **Sound**                    | Always enabled                     |
| **MythX Biography**          | 16:9 (from last 16 X tweets)       |
| **HashMyth Wallet Analysis** | 16:9 (24h trading history)         |
| **HashMyth Memecoin**        | 1:1 square (from coin metadata)    |
| **Random Videos**            | 9:16 vertical (TikTok/Reels style) |

---

## Features

### 1. Chat Homepage

- Conversational AI interface
- User types what they want → AI generates video
- Streaming responses via SSE
- Powered by xAI with multi-agent pipeline

### 2. Media Creator

#### MythX — Biography Generator

- Input: X/Twitter username or profile URL
- Scrapes last **16 tweets** from the profile
- Generates an **autobiography video** (16:9, 720p, with sound)
- **NEVER** about profits or money — focuses on personality, story, ideas
- **Rate limit:** 2 videos per X handle per day

#### HashMyth — Wallet/Memecoin Scanner

- **Wallet mode:** Enter wallet address → analyze 24h trading history → generate cinematic video (16:9)
- **Memecoin mode:** Enter contract address → fetch metadata → generate creative video about the coin (1:1)
- **Only accepted sources:**
  - `pump.fun` (Solana chain)
  - `four.meme` (BNB chain)
  - `clanker.world` (Base chain)
- **Rate limit:** 2 videos per wallet per day, 10 videos per contract address

#### Random Video Generator

- No user input required
- Generates a random TikTok/Reels-style vertical video (9:16)
- Random topic, random style
- **Rate limit:** 5 random videos per IP per day

### 3. Gallery/Feed

- TikTok-style vertical feed of all public videos
- Browse, search, filter by type
- Click to view full video

### 4. Admin Dashboard

- Provider configuration (switch xAI/OpenRouter/etc.)
- View all jobs, videos, rate limits
- Test connections
- Knowledge base management

### 5. Public Logs

- Activity feed showing recent video generations
- No personal data — just "MythX video created for @username" type entries

---

## Rate Limits

| Resource                    | Limit         |
| --------------------------- | ------------- |
| Videos per X handle         | 2/day         |
| Videos per wallet address   | 2/day         |
| Videos per contract address | 10 total      |
| Videos per IP (random)      | 5/day         |
| Chat messages per IP        | 20/hour       |
| OpenMontage renders         | 50/day per IP |

---

## Automation

### Telegram Bot

- `/start` — intro message
- `/mythx @username` — generate autobiography video
- `/hashmyth <address>` — scan wallet or memecoin
- `/random` — generate random video
- `/status <jobId>` — check job status
- Sends video file directly when ready

### X Bot (@HyperMythsX)

- Monitors mentions (`@HyperMythsX`)
- When mentioned, extracts the original poster's username
- Scrapes their last 16 tweets
- Generates autobiography video
- Posts the video as a reply
- Runs via Railway worker service polling every 30 seconds

---

## 4-Agent System

| Agent        | Role                                                                |
| ------------ | ------------------------------------------------------------------- |
| **Analyst**  | Scrapes data (X tweets, wallet history, coin metadata)              |
| **Writer**   | Creates narrative/script from the data                              |
| **Director** | Plans visual style, camera angles, scene composition                |
| **Producer** | Orchestrates video generation, handles retries, manages OpenMontage |

### Agent Flow

```
User Input → Analyst (scrape data) → Writer (script) → Director (visual plan) → Producer (generate video)
```

---

## OpenMontage Integration

- Used as fallback when xAI video generation fails
- Also used for complex multi-clip compositions
- Installed as Git submodule or cloned at build time
- Worker provider: configurable (xai, google_veo, elizaos, mythx)
- Renders complex multi-scene compositions that single-clip generators can't handle

---

## Database Schema (PostgreSQL via Prisma)

### Tables

| Table               | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `users`             | User profiles (IP hash, X handle, wallet, creation counts) |
| `jobs`              | Video generation jobs                                      |
| `videos`            | Generated video metadata + file paths                      |
| `rate_limits`       | Sliding window counters                                    |
| `x_mentions`        | Processed X bot mentions (deduplication)                   |
| `telegram_sessions` | Telegram chat state                                        |
| `config`            | Runtime provider settings                                  |

---

## Deployment

### Vercel (Frontend)

- Next.js App Router
- Chat, Media Creator, Gallery, Admin, Logs
- API routes for chat streaming

### Railway (Backend)

- **Video Service** (Docker): ffmpeg, xAI video API, OpenMontage
- **Worker Service** (Node.js): Job processing, X bot polling, Telegram bot
- **PostgreSQL**: Job tracking, rate limits, user data
- **Persistent Volume**: `/data/videos` — rendered video files

---

## File Structure (New)

```
HyperCinema/
├── app/                          # Next.js frontend (Vercel)
│   ├── (chat)/page.tsx           # Chat homepage
│   ├── creator/page.tsx          # Media Creator hub
│   ├── creator/mythx/page.tsx    # MythX biography
│   ├── creator/hashmyth/page.tsx # HashMyth scanner
│   ├── creator/random/page.tsx   # Random video generator
│   ├── gallery/page.tsx          # TikTok-style feed
│   ├── logs/page.tsx             # Public activity logs
│   ├── admin/page.tsx            # Admin dashboard
│   └── api/                      # API routes
│       ├── chat/stream/route.ts  # SSE chat stream
│       ├── video/[type]/route.ts # Video generation endpoints
│       └── webhook/              # X/Telegram webhooks
├── lib/                          # Shared utilities
│   ├── agents/                   # 4-agent system
│   │   ├── analyst.ts
│   │   ├── writer.ts
│   │   ├── director.ts
│   │   └── producer.ts
│   ├── inference/                # xAI text inference
│   ├── video/                    # Video generation clients
│   │   ├── xai-video.ts
│   │   ├── openmontage.ts
│   │   └── pipeline.ts
│   ├── rate-limit.ts             # Rate limiting (PostgreSQL)
│   ├── db.ts                     # Prisma client
│   └── x/                        # X/Twitter API
├── worker/                       # Railway worker service
│   ├── server.ts                 # Fastify server
│   ├── processor.ts              # Job processor
│   ├── x-bot.ts                  # X mention monitor
│   └── telegram-bot.ts           # Telegram bot
├── video-service/                # Railway video service
│   ├── Dockerfile
│   ├── src/
│   │   ├── server.ts
│   │   ├── render-service.ts
│   │   ├── providers/
│   │   │   ├── xai-video.ts
│   │   │   └── openmontage.ts
│   │   └── env.ts
├── prisma/
│   └── schema.prisma             # Database schema
├── PRODUCTION_PLAN.md            # This file
└── RAILWAY.md                    # Deployment guide
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [ ] Remove all Firebase/Firestore code
- [ ] Set up Prisma + PostgreSQL schema
- [ ] Create Railway Persistent Volume config
- [ ] Update Dockerfiles for Railway
- [ ] Remove payment/monetization code

### Phase 2: Backend API

- [ ] Video generation endpoints
- [ ] Rate limiting (PostgreSQL-based)
- [ ] xAI text inference (chat streaming)
- [ ] xAI video generation client
- [ ] OpenMontage integration

### Phase 3: Frontend

- [ ] Chat homepage (Tianezha-style)
- [ ] Media Creator with sub-pages
- [ ] Gallery/Feed (TikTok-style)
- [ ] Public logs
- [ ] Admin dashboard

### Phase 4: Automation

- [ ] Telegram bot
- [ ] X bot (@HyperMythsX mention responder)
- [ ] 4-agent system

### Phase 5: Polish

- [ ] Error handling, retries, fallbacks
- [ ] Video serving from Persistent Volume
- [ ] Testing, deployment docs

---

## Implementation Status

### ✅ Completed

- [x] Remove all Firebase/Firestore code
- [x] Remove all payment/monetization code (Solana, x402, Helius, sweep, discount codes)
- [x] Simplify job state machine (pending → processing → complete → failed)
- [x] Set up Prisma schema (PostgreSQL)
- [x] Create chat homepage (Tianezha-style)
- [x] Create Media Creator hub + MythX page
- [x] Create HashMyth page (wallet + memecoin)
- [x] Create Random video generator page
- [x] Create Gallery/Feed page
- [x] Create video API routes (/api/video/mythx, /hashmyth, /random, /[jobId])
- [x] Create chat streaming API (/api/chat/stream)
- [x] Implement 4-agent system (Analyst, Writer, Director, Producer, Orchestrator)
- [x] Implement Telegram bot
- [x] Implement X bot (@HyperMythsX mention responder)
- [x] Integrate OpenMontage (Dockerfile includes clone + install)
- [x] Update Dockerfiles for Railway (multi-stage, OpenMontage included)
- [x] Update RAILWAY.md deployment docs
- [x] Update deploy.bat for Vercel + Railway
- [x] Update .env.example.railway
- [x] TypeScript compiles clean (0 errors)
- [x] Video-service builds clean

### ⚠️ Needs Attention

- [ ] Test suite cleanup — 19 test files reference deleted modules (payments, Helius, x402). Need to delete or rewrite these tests.
- [ ] Prisma migration — Run `npx prisma migrate dev` to create the actual PostgreSQL tables
- [ ] Video file serving — /api/video/[jobId] serves from /data/videos/ but the directory needs to be created on Railway
- [ ] Next.js build — Some pages reference deleted components (PaymentInstructionsCard) that need UI cleanup
- [ ] Memecoin validation — HashMyth coin mode needs actual pump.fun/four.meme/clanker.world API integration
- [ ] Rate limit enforcement — Rate limit checks return 429 but need to be wired to the UI

### 🔜 Next Steps

1. Run `npx prisma migrate dev` to create database tables
2. Fix remaining UI references to deleted components
3. Delete/rewrite obsolete test files
4. Deploy to Railway for testing
5. Set up Telegram bot with @BotFather
6. Set up X bot with @HyperMythsX account
7. Test full video generation pipeline

---

## What's Removed from Current Code

- ❌ All payment processing (Solana, x402, Helius webhooks, sweep, dedicated addresses)
- ❌ Firebase Admin SDK (Firestore + Storage)
- ❌ Discount codes, promo codes
- ❌ MoltBook social network integration
- ❌ PDF report generation
- ❌ All monetization logic

## What's Kept

- ✅ xAI text inference (upgraded to primary)
- ✅ xAI video generation (upgraded to primary)
- ✅ OpenMontage (as fallback)
- ✅ Job state machine (adapted for PostgreSQL)
- ✅ Admin panel (repurposed)
- ✅ X API client (for tweet scraping)
- ✅ Video rendering pipeline
