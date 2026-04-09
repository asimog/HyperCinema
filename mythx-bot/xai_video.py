"""
xAI Video generation via the xai-sdk.

Model: grok-imagine-video
Clips: 3 × 10 seconds → stitched to ~30s final video.
Format: 1:1 square, 480p.
Video URLs are TEMPORARY — download immediately after generation.
"""
import time
import requests
from xai_sdk import Client
from config import XAI_API_KEY

client = Client(api_key=XAI_API_KEY)

VIDEO_MODEL = "grok-imagine-video"
CLIP_DURATION = 10       # seconds — sweet spot for quality + speed
RESOLUTION = "480p"
ASPECT_RATIO = "1:1"
POLL_ATTEMPTS = 30
POLL_INTERVAL = 3        # seconds between polls


def generate_clip(prompt: str, duration: int = CLIP_DURATION) -> bytes:
    """
    Submit a video generation job and return the raw video bytes.
    Downloads immediately because xAI video URLs are temporary.
    """
    response = client.video.generate(
        model=VIDEO_MODEL,
        prompt=prompt,
        duration=duration,
        aspect_ratio=ASPECT_RATIO,
        resolution=RESOLUTION,
    )

    # Extract video URL from SDK response
    video_url = (
        response.video.url
        if hasattr(response, "video") and hasattr(response.video, "url")
        else (response.get("video", {}).get("url") if isinstance(response, dict) else None)
    )

    if not video_url:
        raise ValueError(f"No video URL in xAI response: {response!r}")

    # Poll until ready — URL is temporary
    for _ in range(POLL_ATTEMPTS):
        try:
            data = requests.get(video_url, timeout=30).content
            if len(data) > 200_000:
                return data
        except requests.RequestException:
            pass
        time.sleep(POLL_INTERVAL)

    raise TimeoutError(f"Video generation timed out after {POLL_ATTEMPTS * POLL_INTERVAL}s: {video_url}")
