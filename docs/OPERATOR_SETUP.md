# HyperCinema — Operator Setup Guide

**Clean install. No pre-configured accounts. No migrations from old systems.**

---

## Prerequisites

1. **GitHub account** → [github.com](https://github.com)
2. **Vercel account** → [vercel.com](https://vercel.com)
3. **Supabase account** → [supabase.com](https://supabase.com)
4. **xAI API key** → [console.x.ai](https://console.x.ai)
5. **OpenRouter API key** (optional, text fallback) → [openrouter.ai](https://openrouter.ai)

Optional (for social bots):
- **Telegram Bot Token** → [@BotFather](https://t.me/BotFather)
- **X/Twitter API credentials** → [developer.x.com](https://developer.x.com)
- **Railway account** → [railway.com](https://railway.com)

---

## Step 1: Fork the Repo

```bash
git clone https://github.com/asimog/HyperCinema.git
cd HyperCinema
```

Or fork on GitHub and clone your fork.

---

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `hypercinema`
3. Set a **database password** — save it
4. Choose region close to your users
5. Wait for provisioning (~2 minutes)

### Get Connection String

1. Go to **Project Settings → Database**
2. Under **Connection string**, select **URI** mode
3. Copy the string. It looks like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

### Create Storage Bucket

1. Go to **Storage** → **New bucket**
2. Name: `videos`
3. **Public**: toggle ON
4. Create

### Get S3 Credentials

1. Go to **Project Settings → Storage → S3 API**
2. Copy these 3 values:
   - **S3 Endpoint**: `https://[project-ref].supabase.co/storage/v1/s3`
   - **Access Key ID**
   - **Secret Access Key**

### Get Supabase API Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** (e.g., `https://[project-ref].supabase.co`)
   - **anon public** key
   - **service_role** key (secret — never expose to client)

---

## Step 3: Run Database Migration

```bash
# In your cloned repo
npm install

# Create .env.local with just DATABASE_URL
echo "DATABASE_URL=postgresql://..." > .env.local

# Run Prisma migration
npx prisma migrate deploy
```

This creates all tables: `Job`, `Report`, `Video`, `RateLimit`, etc.

---

## Step 4: Deploy to Vercel

### Option A: One-Click Deploy (Recommended)

Go to:
```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fasimog%2FHyperCinema&integrationIds=supabase
```

This auto-links Vercel + Supabase and pre-fills 4 env vars.

### Option B: Manual Deploy

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Click **Deploy**

---

## Step 5: Set Environment Variables

In Vercel → **Settings → Environment Variables**:

### Auto-filled by Supabase Integration (if using Option A)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Supabase connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key |

### You Must Add These Manually

| Variable | Value | Required? |
|----------|-------|-----------|
| `XAI_API_KEY` | Your xAI API key from console.x.ai | ✅ |
| `OPENROUTER_API_KEY` | Your OpenRouter key (fallback for text) | Optional |
| `VIDEO_API_KEY` | Any random string (e.g., `vk-abc123`) | ✅ |
| `WORKER_TOKEN` | Any random string (e.g., `wt-xyz789`) | ✅ |
| `ALLOW_IN_PROCESS_WORKER` | `true` | ✅ |
| `APP_BASE_URL` | Your Vercel deployment URL | ✅ |
| `VIDEO_API_BASE_URL` | Same as `APP_BASE_URL` | ✅ |
| `S3_ENDPOINT` | `https://[project-ref].supabase.co/storage/v1/s3` | ✅ |
| `S3_ACCESS_KEY_ID` | From Supabase S3 settings | ✅ |
| `S3_SECRET_ACCESS_KEY` | From Supabase S3 settings | ✅ |

### Optional (for social bots)

| Variable | Value |
|----------|-------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `X_API_BEARER_TOKEN` | X API Bearer token |
| `X_API_CONSUMER_KEY` | X OAuth 1.0a consumer key |
| `X_API_CONSUMER_SECRET` | X OAuth 1.0a consumer secret |
| `X_API_ACCESS_TOKEN` | X OAuth 1.0a access token |
| `X_API_ACCESS_TOKEN_SECRET` | X OAuth 1.0a access token secret |

After setting env vars, **redeploy** on Vercel.

---

## Step 6: Verify

1. Open your Vercel URL
2. **Chat** — type "hello" → AI should respond via xAI
3. **Generate** — type `@elonmusk` or a wallet address → click GENERATE → video queues
4. **Job status** — navigate to `/job/[jobId]` to watch progress

---

## Step 7: Railway (Optional — For 24/7 Bots)

Only needed if you want Telegram/X bots running continuously.

### Worker Service

1. New service on Railway → connect GitHub repo
2. Dockerfile path: `workers/Dockerfile`
3. Set env vars from `.env.worker` template
4. `DATABASE_URL` → use Supabase external connection (not Railway Postgres)

### Video Service (Optional — Vercel handles video via /api/render/*)

1. New service on Railway → connect GitHub repo
2. Dockerfile path: `video-service/Dockerfile`
3. Set env vars from `.env.video-service` template
4. `VIDEO_API_KEY` must match Vercel's value

---

## Architecture

```
Vercel (www.yourdomain.com)
├── Next.js pages (frontend)
├── API routes (/api/jobs, /api/video/*, /api/render/*, /api/chat/*)
├── Worker trigger (/api/worker/trigger) — runs jobs in-process
└── Direct xAI calls for text + video

Supabase
├── PostgreSQL (jobs, reports, videos, rate limits)
└── S3 Storage (video blobs in "videos" bucket)

xAI
├── grok-3 (text inference, script generation)
└── grok-imagine-video (video generation)

Railway (optional)
├── Telegram bot (polling, 24/7)
└── X bot (mention polling, 24/7)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `DATABASE_URL` connection fails | Use Session mode (port 5432) instead of Transaction (6543) |
| Chat returns errors | Check `XAI_API_KEY` is valid; add `OPENROUTER_API_KEY` as fallback |
| Video generation fails | Verify `XAI_API_KEY` has video generation access |
| S3 upload fails | Verify `videos` bucket is **Public** and S3 credentials are correct |
| Job stuck in "pending" | Check `ALLOW_IN_PROCESS_WORKER=true` is set |
| Rate limit hit | Wait 1 minute, or increase limits in `lib/security/rate-limit.ts` |

---

## Env Var Templates

Three template files are included in the repo:

| File | Purpose |
|------|---------|
| `.env.vercel` | Vercel frontend + API routes |
| `.env.worker` | Railway worker service |
| `.env.video-service` | Railway video service |

Copy the one you need, fill placeholders, paste into platform env settings.

---

## Security Notes

- Never commit `.env.*` files — they're in `.gitignore`
- `SUPABASE_SERVICE_KEY` is server-side only — never expose to client
- `VIDEO_API_KEY` and `WORKER_TOKEN` should be random, unguessable strings
- All sensitive endpoints require Bearer auth
