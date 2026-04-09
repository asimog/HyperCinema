"""
HyperMythsX bot — @HyperMythsX on X
https://x.com/HyperMythX

Production v6.2 — Two-tier CRT + Premium creative direction (>=100 likes) + Technical Prompting Bible v6.2 (3-Act storytelling).
ONLY posts replies, never standalone tweets.

FLOW:
  1. User A tweets something
  2. User B replies "mythx" (or "mythx japanese/chinese/russian") to User A's tweet
  3. Bot detects "mythx" in User B's reply
  4. Bot fetches User A's last 16 tweets (the person being replied TO)
  5. Bot checks visual tier:
     - Any of User A's tweets >100 likes → Truman Show Two-Layer
     - Otherwise → Holographic CRT (default)
  6. Bot checks premium: if the mythx reply itself has >=100 likes
     → appends "ultra-cinematic masterpiece" creative direction
  7. Bot generates 3×10s clips → stitches to ~30s CRT DBZ autobiography
  8. Bot replies in the thread with the video

Trigger: Just "mythx" as a reply to any tweet. No @mention needed.
Target: The author of the tweet being replied TO (not the person who typed mythx).

Language commands (just reply to any tweet):
  mythx          → English (default)
  mythx japanese → Japanese dialogue
  mythx chinese  → Chinese dialogue
  mythx russian  → Russian dialogue

Run on Railway (see Dockerfile).
"""
import os
import tempfile
import threading
import traceback
from config import BOT_USERNAME, BOT_X_URL
from mythx_engine import MythXEngine, LANGUAGE_OPTIONS
from x_client import (
    get_user_tweets,
    reply_to_tweet,
    stream_mentions,
)
from xai_video import generate_clip
from supabase_client import upload_video, log_job, job_already_processed

# Singleton engine
engine = MythXEngine()


# ── Helpers ───────────────────────────────────────────────────────────

def detect_language_command(text: str) -> str:
    """Detect language command from tweet text. Returns language code."""
    text_lower = text.lower()
    for cmd, lang in LANGUAGE_OPTIONS.items():
        if cmd in text_lower:
            return lang
    return "english"  # default


def _stitch_clips(clip1: bytes, clip2: bytes, clip3: bytes) -> bytes:
    """Concatenate 3 clips into ~30s mp4 using moviepy. Returns bytes."""
    from moviepy.editor import VideoFileClip, concatenate_videoclips

    temp_paths = []
    video_clips = []
    out_path = None

    try:
        for clip_bytes in (clip1, clip2, clip3):
            f = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
            f.write(clip_bytes)
            f.close()
            temp_paths.append(f.name)
            video_clips.append(VideoFileClip(f.name))

        final = concatenate_videoclips(video_clips)

        out_f = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        out_path = out_f.name
        out_f.close()

        final.write_videofile(
            out_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            logger=None,
        )

        with open(out_path, "rb") as f:
            return f.read()

    finally:
        for vc in video_clips:
            try:
                vc.close()
            except Exception:
                pass
        for p in temp_paths:
            try:
                os.unlink(p)
            except OSError:
                pass
        if out_path:
            try:
                os.unlink(out_path)
            except OSError:
                pass


# ── Core processing ───────────────────────────────────────────────────

def process_mention(tweet: dict) -> None:
    """
    Process a 'mythx' reply tweet.
    The TARGET is the author of the tweet being replied TO (in_reply_to_user_id).
    The REQUESTER is the person who typed 'mythx'.
    """
    mythx_tweet_id = tweet["id"]
    requester_username = tweet.get("author_username", "user")
    mythx_text = tweet.get("text", "")

    # Must be a reply — skip standalone tweets
    target_user_id = tweet.get("in_reply_to_user_id")
    in_reply_to_tweet_id = tweet.get("in_reply_to_tweet_id")

    if not target_user_id:
        print(f"[MythX] Standalone 'mythx' tweet from @{requester_username}, "
              f"ignoring (bot only processes replies).")
        return

    print(f"[MythX v5.3] Reply from @{requester_username}: {mythx_text[:100]}")
    print(f"[MythX] Target user ID (being replied to): {target_user_id}")

    # Dedup on the mythx reply tweet
    if job_already_processed(mythx_tweet_id):
        print(f"[MythX] Already processed tweet {mythx_tweet_id}, skipping.")
        return

    # Detect language command
    language = detect_language_command(mythx_text)

    # Check likes for premium creative direction
    like_count = tweet.get("public_metrics", {}).get("like_count", 0)
    is_premium = like_count >= 100

    # Acknowledge immediately
    lang_label = f" ({language})" if language != "english" else ""
    premium_label = " [PREMIUM]" if is_premium else ""
    ack_text = (
        f"@{requester_username} 🎬 Generating MythX autobiography{lang_label}{premium_label}… "
        f"Will reply with the video shortly."
    )
    reply_to_tweet(mythx_tweet_id, ack_text)

    try:
        # Fetch target user's tweets (the person being replied TO)
        tweets_text, has_viral = get_user_tweets(target_user_id, max_results=16)
        if not tweets_text:
            reply_to_tweet(
                mythx_tweet_id,
                f"@{requester_username} ❌ Couldn't fetch that user's tweets. "
                f"They might be private or deleted.",
            )
            return

        # Use user_id as handle (we don't resolve the username without an extra API call)
        target_handle = f"user_{target_user_id}"

        # Core engine — sentiment analysis + 3-slice prompts + combo
        style_label = "TRUMAN SHOW" if has_viral else "HOLOGRAPHIC CRT"
        print(f"[MythX] Running {style_label} engine for user {target_user_id} "
              f"(language={language}, viral={has_viral}, premium={is_premium}, "
              f"likes={like_count})…")
        p1, p2, p3, combo = engine.generate_3_slice_prompts(
            tweets_text, target_handle, language, has_viral=has_viral,
            is_premium=is_premium,
        )

        print(f"[MythX] Combo: {combo['theme']} | {combo['arena']} | "
              f"sentiment={combo['sentiment']} | style={combo.get('style', '?')}")

        # Generate 3 clips
        print(f"[MythX] Generating clip 1/3…")
        clip1 = generate_clip(p1, duration=10)

        print(f"[MythX] Generating clip 2/3…")
        clip2 = generate_clip(p2, duration=10)

        print(f"[MythX] Generating clip 3/3…")
        clip3 = generate_clip(p3, duration=10)

        # Stitch
        print(f"[MythX] Stitching 3 clips to ~30s…")
        final_video = _stitch_clips(clip1, clip2, clip3)

        # Upload
        print(f"[MythX] Uploading video…")
        video_url = upload_video(final_video)

        # Log with combo metadata
        log_job(
            x_user_id=target_user_id,
            username=target_handle,
            tweet_id=mythx_tweet_id,
            video_url=video_url,
            combo=combo,
        )

        # Dynamic caveman reply — always in English
        caveman_text = engine.generate_caveman_reply(
            tweets_text, target_handle, combo
        )
        reply_text_final = (
            f"@{requester_username} {caveman_text}\n"
            f"📹 {video_url}\n\n"
            f"Made by @{BOT_USERNAME} · {BOT_X_URL}"
        )
        reply_to_tweet(mythx_tweet_id, reply_text_final)

        print(f"[MythX] Delivered {language} video to @{requester_username}: "
              f"{video_url}")

    except Exception as e:
        traceback.print_exc()
        try:
            reply_to_tweet(
                mythx_tweet_id,
                f"@{requester_username} ❌ Video generation failed. "
                f"Retry mythx shortly.",
            )
        except Exception:
            pass


def on_tweet(tweet: dict) -> None:
    """Called for each matching tweet from the filtered stream."""
    threading.Thread(target=process_mention, args=(tweet,), daemon=True).start()


def main():
    print(f"[HyperMythsX] Bot v6.2 starting — @{BOT_USERNAME}")
    print(f"[HyperMythsX] X profile: {BOT_X_URL}")
    print(f"[HyperMythsX] Stream rule: (mythx) -is:retweet is:reply")
    print(f"[HyperMythsX] 3x10s 1:1 480p | CRT DBZ | 16 anime sub-styles | 3-Act storytelling")
    print(f"[HyperMythsX] HOLOGRAPHIC CRT (default) | TRUMAN SHOW (user tweets >100 likes)")
    print(f"[HyperMythsX] PREMIUM boost (mythx reply itself >=100 likes)")
    print(f"[HyperMythsX] Languages: english (default), japanese, chinese, russian")
    print(f"[HyperMythsX] Bot ONLY posts replies. User replies 'mythx' to trigger.")

    import time
    while True:
        try:
            stream_mentions(on_tweet)
        except Exception as e:
            print(f"[HyperMythsX] Stream error: {e} — reconnecting in 10s…")
            time.sleep(10)


if __name__ == "__main__":
    main()
