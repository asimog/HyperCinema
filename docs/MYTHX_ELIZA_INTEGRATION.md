# MythXEliza - ElizaOS Integration Guide

## Overview

MythXEliza is an autobiographical video generation system powered by **ElizaOS AI agents**. It transforms X (Twitter) profiles into cinematic videos by analyzing tweets and generating visual narratives.

## Architecture

```
User Input (X Profile)
         ↓
MythXElizaGeneratorClient (UI)
         ↓
API Route: /api/mythx-eliza/generate
         ↓
MythXEliza Agent Orchestrator
         ↓
    ┌────┴────┐
    ↓         ↓
ElizaOS   ElizaOS
Chat API   Video API
    ↓         ↓
Tweet    Video Clips
Data     Generation
    ↓         ↓
    └────┬────┘
         ↓
Cinematic Video Output
```

## Files Created

### Core Integration
- `lib/elizaos/client.ts` - ElizaOS API client (Chat, Video, Knowledge)
- `lib/elizaos/mythx-character.ts` - Agent personality configuration
- `lib/elizaos/mythx-agent.ts` - Main orchestration logic

### API Routes
- `app/api/mythx-eliza/generate/route.ts` - Generation endpoint

### UI Components
- `components/mythx/MythXElizaGeneratorClient.tsx` - Frontend interface
- `app/MythX/page.tsx` - Updated to use ElizaOS generator

### Video Service
- `video-service/src/providers/elizaos-video.ts` - ElizaOS video provider

### Environment Configuration
- `lib/env.ts` - Added ELIZAOS_API_KEY, ELIZAOS_BASE_URL
- `video-service/src/env.ts` - Added ELIZAOS_* variables for video service

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` or deployment environment:

```bash
# ElizaOS Configuration (Required)
ELIZAOS_API_KEY=eliza_8e58f245e0ac3dab48205b477a33a1b88c1e0e44825c52f9d2c0c5106cd1204f
ELIZAOS_BASE_URL=https://api.elizacloud.ai

# Optional: Video model selection
ELIZAOS_VIDEO_MODEL=default
```

### 2. ElizaOS Agent Setup

The MythXEliza agent will automatically register itself on first use with the following configuration:

- **Agent ID**: `mythx-eliza-autobiographical-agent`
- **Name**: MythXEliza
- **Purpose**: Autobiographical video generation from X profiles

### 3. X API Fallback

The system maintains backward compatibility with the X API for tweet fetching:

```bash
# X API (Optional - if ElizaOS doesn't have X integration)
X_API_CONSUMER_KEY=your_key
X_API_CONSUMER_SECRET=your_secret
X_API_ACCESS_TOKEN=your_token
X_API_ACCESS_TOKEN_SECRET=your_secret
X_API_BASE_URL=https://api.x.com/2
```

If X API credentials are present, the system will use them for reliable tweet fetching while still using ElizaOS for narrative generation and video production.

## API Usage

### Generate Video

```bash
POST /api/mythx-eliza/generate
Content-Type: application/json

{
  "profileInput": "@username or https://x.com/username",
  "style": "vhs_cinema",
  "maxTweets": 42
}
```

**Response:**
```json
{
  "success": true,
  "videoUrl": "https://...",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualPrompt": "...",
      "narration": "...",
      "style": "vhs_cinema",
      "durationSeconds": 8
    }
  ],
  "metadata": {
    "profile": {
      "displayName": "...",
      "username": "...",
      "profileUrl": "...",
      "description": "...",
      "profileImageUrl": "..."
    },
    "style": "vhs_cinema",
    "totalScenes": 4,
    "totalDurationSeconds": 32
  }
}
```

### Check Agent Status

```bash
GET /api/mythx-eliza/status
```

## Available Cinematic Styles

| Style ID | Description |
|----------|-------------|
| `hyperflow_assembly` | Fluid, interconnected visual flow |
| `vhs_cinema` | VHS aesthetic, analog warmth |
| `black_and_white_noir` | B&W, high contrast, film noir |
| `double_exposure` | Layered imagery, dreamlike |
| `glitch_digital` | Digital glitches, cyberpunk |
| `found_footage_raw` | Raw, documentary-style |
| `split_screen_diptych` | Split screen compositions |
| `film_grain_70s` | 1970s film stock, vintage look |

## How It Works

### Step 1: Agent Initialization
The ElizaOS agent is automatically created/updated with a cinematic storyteller personality.

### Step 2: Tweet Collection
- **Primary**: Uses ElizaOS knowledge base if available
- **Fallback**: Direct X API fetch (if credentials present)
- Fetches last 42 tweets (configurable)

### Step 3: Narrative Generation
ElizaOS analyzes the tweets and creates:
- Overall story arc
- 4-6 cinematic scenes
- Visual prompts for each scene
- Optional narration text

### Step 4: Video Generation
For each scene:
1. Sends visual prompt to ElizaOS video API
2. Polls for completion (10s intervals, max 5 min)
3. Collects video URLs

### Step 5: Response
Returns complete video URL with scene metadata and breakdown.

## Testing

### Local Development

1. Start the Next.js development server:
```bash
npm run dev
```

2. Visit: `http://localhost:3000/MythX`

3. Enter an X profile handle and generate a video

### Programmatic Testing

```bash
curl -X POST http://localhost:3000/api/mythx-eliza/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profileInput": "@elonmusk",
    "style": "vhs_cinema",
    "maxTweets": 42
  }'
```

## Troubleshooting

### "ELIZAOS_API_KEY is required"
- Ensure `ELIZAOS_API_KEY` is set in your environment
- Verify the key is valid via `GET /api/mythx-eliza/status`

### "No tweets available"
- Check X profile handle is valid
- Ensure profile is public and has tweets
- Verify X API credentials if using fallback

### Video generation timeout
- ElizaOS video generation can take 2-5 minutes per scene
- Check `ELIZAOS_BASE_URL` is correct
- Verify video model supports your requested duration

### Agent not found
- Agent auto-registers on first use
- Check `GET /api/mythx-eliza/status` for registration
- Manually trigger by making a generation request

## Migration from Old System

The old MythX implementation used:
- Direct X API for tweets
- xAI/Google Veo for video

**New MythXEliza uses:**
- ElizaOS agent for orchestration
- ElizaOS video API for generation
- Maintains X API as optional fallback

### Breaking Changes
- UI now uses `MythXElizaGeneratorClient` instead of `HyperMGeneratorClient`
- API response format changed to include ElizaOS metadata
- Agent-based processing may be slower but more intelligent

## Production Deployment

### Environment Checklist
- [ ] `ELIZAOS_API_KEY` set
- [ ] `ELIZAOS_BASE_URL` configured
- [ ] X API credentials (optional but recommended)
- [ ] Firebase configured for storage
- [ ] Video service deployed with ElizaOS provider

### Performance Considerations
- Video generation: 2-5 minutes per scene
- 4-6 scenes typical = 8-30 minutes total
- Consider async job processing for production
- Implement progress polling for better UX

## Future Enhancements

- [ ] Async job processing with webhooks
- [ ] Video concatenation via FFmpeg
- [ ] Knowledge base upload for tweet context
- [ ] Multi-agent collaboration (writer + director)
- [ ] Custom style training data
- [ ] Real-time generation progress API

## Support

For issues or questions:
- Check ElizaOS docs: https://www.elizacloud.ai/.well-known/llms.txt
- Review logs for detailed error messages
- Test agent status endpoint first
