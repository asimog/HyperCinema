# HyperCinema — Railway + Vercel Deployment Guide

## Architecture

HyperCinema is split across two platforms:

```
┌─────────────────────┐
│   Vercel (Frontend) │
│   Next.js app       │
│   SSR / Edge        │
└─────────┬───────────┘
          │  HTTPS
          ▼
┌─────────────────────────────────────┐
│        Railway (Backend)            │
│                                     │
│  ┌──────────┐  ┌─────────────────┐ │
│  │  worker  │  │  video-service  │ │
│  │ Docker   │  │  Docker         │ │
│  │ :8080    │  │  :8090 + ffmpeg │ │
│  │          │  │  + OpenMontage  │ │
│  └────┬─────┘  └────────┬────────┘ │
│       │                  │          │
│       └────────┬─────────┘          │
│                ▼                    │
│  ┌─────────────────────────┐        │
│  │  PostgreSQL (managed)   │        │
│  │  DATABASE_URL           │        │
│  └─────────────────────────┘        │
│                                     │
│  ┌─────────────────────────┐        │
│  │  Persistent Volume      │        │
│  │  /app/data/media        │        │
│  └─────────────────────────┘        │
└─────────────────────────────────────┘
```

**Key points:**

- **Frontend:** Deployed on Vercel (Next.js with `output: "standalone"`)
- **Backend services:** Deployed on Railway via Docker
- **Database:** Railway managed PostgreSQL
- **Media storage:** Railway Persistent Volume (local filesystem)
- **No Firebase** — everything uses PostgreSQL + local storage

---

## Step-by-Step Deployment

### Prerequisites

1. Push your code to a **GitHub repo**
2. Install Railway CLI: `npm i -g @railway/cli`
3. Create a Vercel account and link your GitHub repo

---

### Step 1: Create Railway Project

```bash
railway login
railway init
# Name it: hypercinema
```

Or do it in the [Railway dashboard](https://railway.com/new).

---

### Step 2: Add PostgreSQL Database

1. In the Railway project canvas, click **+ New** → **Database** → **Add PostgreSQL**
2. Railway will provision a managed PostgreSQL instance
3. Note the `DATABASE_URL` — it will be auto-injected as an environment variable

---

### Step 3: Add Persistent Volume (for media storage)

1. Click **+ New** → **Persistent Volume**
2. Name: `media-storage`
3. Mount path: `/app/data/media`
4. Size: `10 GB` (adjust based on your needs)
5. Attach to both `worker` and `video-service` after creating them

---

### Step 4: Add 2 Backend Services

On the Railway Project Canvas, click **+ New** → **GitHub Repo** → select your repo.

#### Service 1: `worker` (Job processor)

| Setting             | Value                |
| ------------------- | -------------------- |
| **Root Directory**  | `.` (leave blank)    |
| **Dockerfile Path** | `workers/Dockerfile` |
| **Port**            | `8080`               |

After the service is created, attach the `media-storage` persistent volume.

#### Service 2: `video` (Video rendering)

| Setting             | Value                      |
| ------------------- | -------------------------- |
| **Root Directory**  | `.` (leave blank)          |
| **Dockerfile Path** | `video-service/Dockerfile` |
| **Port**            | `8090`                     |

After the service is created, attach the `media-storage` persistent volume.

> **Note:** OpenMontage is cloned and installed at build time inside the video-service Dockerfile. No manual setup needed.

---

### Step 5: Set Environment Variables

Go to the **`worker`** service → **Variables** tab.

Set these variables:

#### Required

| Variable             | Where to get it                             |
| -------------------- | ------------------------------------------- |
| `DATABASE_URL`       | Auto-set by Railway (from PostgreSQL)       |
| `XAI_API_KEY`        | [console.x.ai](https://console.x.ai/)       |
| `XAI_VIDEO_MODEL`    | `grok-imagine-video`                        |
| `XAI_BASE_URL`       | `https://api.x.ai/v1`                       |
| `X_API_BEARER_TOKEN` | [developer.x.com](https://developer.x.com/) |

#### Application

| Variable             | Value / Notes                                                   |
| -------------------- | --------------------------------------------------------------- |
| `APP_BASE_URL`       | Your Vercel deployment URL (e.g. `https://your-app.vercel.app`) |
| `VIDEO_API_BASE_URL` | Railway internal DNS: `http://video.railway.internal:8090`      |
| `VIDEO_API_KEY`      | Generate: `openssl rand -hex 32`                                |
| `COCKPIT_USERNAME`   | Admin username (e.g. `admin`)                                   |
| `COCKPIT_PASSWORD`   | Admin password                                                  |

#### Optional

| Variable                    | Purpose                             |
| --------------------------- | ----------------------------------- |
| `TELEGRAM_BOT_TOKEN`        | Telegram bot (get from @BotFather)  |
| `X_API_CONSUMER_KEY`        | X posting (OAuth 1.0a)              |
| `X_API_CONSUMER_SECRET`     | X posting (OAuth 1.0a)              |
| `X_API_ACCESS_TOKEN`        | X posting (OAuth 1.0a)              |
| `X_API_ACCESS_TOKEN_SECRET` | X posting (OAuth 1.0a)              |
| `OPENROUTER_API_KEY`        | Fallback text provider              |
| `MYTHX_API_KEY`             | Fallback video provider             |
| `MYTHX_BASE_URL`            | Fallback video provider base        |
| `OPENMONTAGE_PATH`          | `/app/openmontage` (default)        |
| `OPENMONTAGE_OUTPUT`        | `/app/openmontage/output` (default) |
| `MEDIA_BACKEND`             | `local`                             |
| `MEDIA_LOCAL_ROOT`          | `/app/data/media`                   |

> **After setting on `worker`:** Use Railway's **Copy Variables** feature to copy all variables to the `video` service.

---

### Step 6: Deploy Backend (Railway)

Railway auto-deploys when you push to your connected GitHub branch.

```bash
# Or trigger manually with CLI:
railway up
```

Each service deploys independently. Docker builds take 2-5 minutes.

---

### Step 7: Deploy Frontend (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Set the root directory to `.` (blank)
4. Build command: `npm run build`
5. Output directory: `.next`
6. Add environment variables for the frontend (see below)
7. Deploy

**Frontend environment variables on Vercel:**

| Variable             | Value                                         |
| -------------------- | --------------------------------------------- |
| `APP_BASE_URL`       | Your Vercel URL (auto-set by Vercel)          |
| `VIDEO_API_BASE_URL` | Railway video service public URL              |
| `VIDEO_API_KEY`      | Same key as set on Railway                    |
| `DATABASE_URL`       | Railway PostgreSQL external connection string |

> Use Railway's **external connection string** for `DATABASE_URL` on Vercel (not the internal one).

---

### Step 8: Verify Deployment

1. **Frontend (Vercel):** Open your Vercel URL — should show the homepage
2. **Worker:** Check Railway logs for the worker starting
3. **Video service:** `curl https://your-video-domain.railway.app/healthz` — should return `{"status":"ok"}`

---

## Bot Setup

### Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the bot token
4. Set `TELEGRAM_BOT_TOKEN` in Railway variables
5. Redeploy the worker service

### X (Twitter) Bot

1. Go to [developer.x.com](https://developer.x.com/)
2. Create a project and app
3. Generate a Bearer Token (for reading/tweet scraping)
4. Set up OAuth 1.0a if posting (Consumer Key/Secret + Access Token/Secret)
5. Set the corresponding `X_API_*` variables in Railway
6. Redeploy the worker service

---

## Cost Estimate

| Resource                      | Estimated Cost    |
| ----------------------------- | ----------------- |
| Vercel (Next.js frontend)     | Free tier (Hobby) |
| Railway worker (Docker)       | $5-10/mo          |
| Railway video (Docker+ffmpeg) | $10-20/mo         |
| Railway PostgreSQL            | $5-10/mo          |
| Persistent Volume (10 GB)     | $1-2/mo           |
| **Total**                     | **$21-42/mo**     |

Railway gives $5 credit/month, so effective cost is **$16-37/mo**.

---

## CI/CD

- **Railway:** Auto-deploys on every push to the connected GitHub branch. Use PR deploys for preview environments.
- **Vercel:** Auto-deploys on every push to the connected branch. Preview deployments for every PR.

---

## Troubleshooting

### Service won't start

```bash
railway logs --service worker
```

- Missing env vars? Check `DATABASE_URL`, `XAI_API_KEY`
- Docker build fail? Check Dockerfile paths and ensure `package.json` is at repo root

### Video rendering fails

- Check `VIDEO_API_BASE_URL` points to the video service (Railway internal DNS: `http://video.railway.internal:8090`)
- Check video service logs for ffmpeg or OpenMontage errors
- Verify the Persistent Volume is attached to the video service

### Worker not processing jobs

- Check `DATABASE_URL` is correct
- Check worker logs for database connection errors
- Ensure `VIDEO_API_BASE_URL` and `VIDEO_API_KEY` are set correctly

### OpenMontage not found

- OpenMontage is cloned at build time in the Dockerfile. Check build logs for git clone errors.
- Verify `/app/openmontage` exists: `railway ssh --service video` then `ls /app/openmontage`

---

## What Was Removed (PostgreSQL Migration)

| Removed                 | Replacement           |
| ----------------------- | --------------------- |
| Firebase Firestore      | Railway PostgreSQL    |
| Firebase Storage        | Local filesystem + PV |
| Firebase Admin SDK      | Prisma ORM            |
| Firebase App Hosting    | Vercel (frontend)     |
| Helius / Solana pay     | N/A (payment removed) |
| x402 / sweep / discount | N/A                   |
