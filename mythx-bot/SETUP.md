# HyperMythsX Bot – Complete Setup Guide (v5.9)

**Date**: April 9, 2026  
**Bot**: @HyperMythsX · https://x.com/HyperMythX  
**Core**: Two-tier CRT (Holographic default + Truman Show for viral users)  
**Premium**: Ultra-cinematic creative direction when mythx reply has ≥100 likes

---

## 1. X (Twitter) API Setup

1. Go to https://developer.x.com
2. Create a Project → Create an App inside it
3. In App settings:
   - Enable **OAuth 2.0** with **Read + Write** permissions
   - Generate and copy **Bearer Token** (for reading)
   - Generate **OAuth 1.0a** keys (for posting replies):
     - API Key (Consumer Key)
     - API Secret (Consumer Secret)
     - Access Token
     - Access Token Secret

**Required Environment Variables:**
```env
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAA...
X_API_KEY=your_consumer_key
X_API_SECRET=your_consumer_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret
```

**Filtered Stream Rule** (set once via POST `/2/tweets/search/stream/rules`):
```json
{
  "add": [
    { "value": "(mythx) -is:retweet is:reply" }
  ]
}
```

> **Note**: The stream requests `tweet.fields=public_metrics` to read `like_count` for the premium feature.

---

## 2. xAI API Setup (Grok Imagine Video)

1. Go to https://console.x.ai
2. Create API Key (name it e.g. "HyperMythsX Bot")

**Required Environment Variable:**
```env
XAI_API_KEY=xai-...
```

**Video Parameters** (verified against official docs):
- Model: `grok-imagine-video`
- `duration=10` (within 1–15s limit)
- `aspect_ratio="1:1"`
- `resolution="480p"`

---

## 3. Supabase Setup

1. Create a project at https://supabase.com
2. **Storage** → Create public bucket named `videos`
3. **Database** → Create table `mythx_jobs`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Auto-generated |
| `x_user_id` | text | Target user's X ID |
| `username` | text | Display handle |
| `tweet_id` | text | The mythx reply tweet ID |
| `video_url` | text | Supabase public URL |
| `status` | text | completed/failed |
| `combo_theme` | text | e.g. "glorious heroic saga" |
| `combo_arena` | text | e.g. "colosseum of gods thunder arena" |
| `combo_style` | text | holographic_crt / truman_show |
| `combo_sub_style` | text | e.g. "Dragon Ball Z Goku epic shonen style" |
| `combo_sentiment` | jsonb | {flavor, intensity, overall} |
| `bot` | text | @HyperMythsX |
| `bot_url` | text | https://x.com/HyperMythX |
| `created_at` | timestamptz | Default now() |

**Required Environment Variables:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # Use service_role key
```

---

## 4. Full `.env` File

```env
# xAI API (video generation + sentiment analysis)
XAI_API_KEY=xai-...

# X API - Bearer Token (reading)
X_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAA...

# X API - OAuth 1.0a (posting replies)
X_API_KEY=your_consumer_key
X_API_SECRET=your_consumer_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

# Supabase (storage + job logging)
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...

# Bot identity (hardcoded, but overridable)
BOT_USERNAME=HyperMythsX
```

---

## 5. Key Features

| Feature | Trigger | Description |
|---|---|---|
| **Holographic CRT** | Default | User as anime hero in arena, holographically broadcast through old TV |
| **Truman Show** | Any user tweet >100 likes | Anime chars on couch watching CRT broadcasting user's life as reality TV |
| **Premium Boost** | Mythx reply tweet ≥100 likes | Appends "ultra-cinematic masterpiece, maximum emotional impact, award-winning direction..." |
| **Multi-language** | `mythx japanese/chinese/russian` | Dialogue/text in requested language |
| **Sentiment-aware** | Auto-detected via Grok | Biased theme sampling (positive→heroic, negative→revenge, etc.) |
| **16 Anime Sub-Styles** | Random per video | DBZ, Pokémon, Sailor Moon, Berserk, Bebop, Eva, etc. |
| **Caveman Replies** | Auto-generated | Viral, humorous replies referencing real tweets + sentiment |

---

## 6. How It Works

```
User A tweets something
       ↓
User B replies "mythx" to User A's tweet
       ↓
Bot detects "mythx" in the reply (filtered stream)
       ↓
Bot checks: does the mythx reply have ≥100 likes? → premium flag
       ↓
Bot fetches User A's last 16 tweets
       ↓
Bot checks: does any of User A's tweets have >100 likes? → visual tier
       ↓
┌─────────────────────┬──────────────────────────────────┐
│ Default             │ Any user tweet >100 likes        │
│ Holographic CRT     │ Truman Show Two-Layer            │
│ (anime hero arena)  │ (anime chars watching reality TV)│
└─────────────────────┴──────────────────────────────────┘
       ↓
If premium (reply ≥100 likes): append creative direction
       ↓
Sentiment analysis → biased combo sampling → 3×10s prompts
       ↓
Generate 3 clips via xAI grok-imagine-video → stitch to ~30s
       ↓
Upload to Supabase → log job → reply with caveman text + video URL
```

---

## 7. Deployment (Railway)

1. Push `mythx-bot/` as a separate service or add to existing project
2. Add all env vars from section 4
3. Railway auto-detects the `Dockerfile` and deploys
4. Verify stream rule is set: `(mythx) -is:retweet is:reply`

**Project structure:**
```
mythx-bot/
├── config.py             # Bot identity hardcoded
├── mythx_engine.py       # v5.9 prompt + reply engine
├── xai_video.py          # 3×10s 1:1 480p clip generation
├── x_client.py           # OAuth 1.0a posting + filtered stream
├── supabase_client.py    # Video upload + job logging
├── main.py               # Orchestrator
├── requirements.txt
├── Dockerfile            # Python 3.11 + ffmpeg
└── .env.example
```

---

## 8. Verification Status

All endpoints, parameters, and SDK usage match official **X API v2** and **xAI API** documentation as of **April 9, 2026**.
