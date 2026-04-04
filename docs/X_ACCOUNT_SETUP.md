# Connect X (Twitter) Account for Posting

## Overview

The MythXEliza agent can automatically post generated videos to X. To enable this, you need **OAuth 1.0a credentials** from the X Developer Portal. Bearer tokens are read-only — posting requires OAuth 1.0a signing.

## Step 1: Get X Developer Access

1. Go to **[https://developer.x.com/](https://developer.x.com/)**
2. Sign in with the X account you want to post **from**
3. Click **"Sign up for Free Account"** (or use your existing developer account)
4. Choose **Basic** or higher tier (posting requires at least Basic)

## Step 2: Create a Project & App

1. In the Developer Portal, go to **Projects & Apps**
2. Click **"+ Add App"**
3. Name it (e.g., `MythXEliza Poster`)
4. Note your **API Key** and **API Key Secret** (these become `X_API_CONSUMER_KEY` and `X_API_CONSUMER_SECRET`)

## Step 3: Enable OAuth 1.0a Permissions

1. Go to your App settings → **User authentication settings**
2. Click **Set up**
3. Enable **OAuth 1.0a**
4. Set permissions:
   - ✅ **Read** — to fetch tweets and mentions
   - ✅ **Write** — to post videos and reply
   - ✅ **Direct Message** (optional)
5. Set your **Callback URL** (can be `https://localhost:3000` for testing)
6. Set your **Website URL**

## Step 4: Get Access Token & Secret

After enabling OAuth 1.0a:

1. Go to **Keys and tokens** tab
2. Scroll to **OAuth 1.0a** section
3. Under your app, you'll see:
   - **Consumer Keys** (API Key + API Key Secret)
   - **Authentication Tokens** (Access Token + Access Token Secret)
4. Click **Generate** for Access Token if not yet created
5. **Save all 4 values securely** — you won't see the secrets again

## Step 5: Configure Environment Variables

Add these to your `.env.local` (or Firebase App Hosting secrets):

```bash
# X API OAuth 1.0a for POSTING (required for tweet posting)
X_API_CONSUMER_KEY=your_api_key_from_step_2
X_API_CONSUMER_SECRET=your_api_key_secret_from_step_2
X_API_ACCESS_TOKEN=your_access_token_from_step_4
X_API_ACCESS_TOKEN_SECRET=your_access_token_secret_from_step_4

# X API Bearer Token (optional, for read-only operations)
X_API_BEARER_TOKEN=your_bearer_token
X_API_BASE_URL=https://api.x.com/2
```

### Firebase App Hosting

If deploying via Firebase App Hosting, add as secrets:

```bash
firebase apphosting:secrets:set X_API_CONSUMER_KEY
firebase apphosting:secrets:set X_API_CONSUMER_SECRET
firebase apphosting:secrets:set X_API_ACCESS_TOKEN
firebase apphosting:secrets:set X_API_ACCESS_TOKEN_SECRET
firebase apphosting:secrets:set X_API_BEARER_TOKEN
```

## Step 6: Verify Connection

Test that posting works:

```bash
# Start your dev server
npm run dev

# Check if OAuth is configured
curl http://localhost:3000/api/mythx-eliza/status
```

Then generate a video with `triggerFromTwitter: true` or via Twitter mention. The agent will:
1. Check if OAuth credentials exist (`canPost()` → `true`)
2. Build OAuth 1.0a signed POST request
3. Post the video to X
4. Return the tweet URL

## Troubleshooting

### "OAuth 1.0a credentials required for posting"
- One or more of the 4 OAuth env vars is missing
- Check `.env.local` has all 4 values set

### "Failed to post tweet (403)"
- Your app doesn't have **Write** permission enabled
- Go to Developer Portal → App → User authentication settings → Enable Write

### "Failed to post tweet (401)"
- Access Token or Secret is wrong/expired
- Regenerate in Developer Portal → Keys and tokens → OAuth 1.0a

### "Failed to post tweet (400)"
- Tweet text is too long (280 chars) or contains invalid content
- Check the generated post text length

## What Gets Posted

When a video is generated via Twitter command or with `triggerFromTwitter: true`:

```
🎬 New MythX Drop: @username

AI Cinema

An autobiographical video in "VHS Cinema" style, crafted from 42 tweets...

Watch: https://yoursite.com/job/...

#MythX #ElizaOS #AICinema #Autobiographical
```

## Security Notes

- ⚠️ **NEVER** commit these credentials to Git
- ✅ Use Firebase App Hosting secrets for production
- ✅ Rotate tokens periodically
- ✅ Monitor your X Developer Portal usage dashboard
