"""
Supabase client for video storage and job logging.
Bucket: videos (public)
Table: mythx_jobs
"""
import uuid
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def upload_video(video_bytes: bytes, filename: str | None = None) -> str:
    """Upload mp4 to Supabase storage bucket 'videos'. Returns public URL."""
    if not filename:
        filename = f"{uuid.uuid4()}.mp4"

    sb = get_client()
    sb.storage.from_("videos").upload(
        filename,
        video_bytes,
        file_options={"content-type": "video/mp4"},
    )
    return sb.storage.from_("videos").get_public_url(filename)


def log_job(
    x_user_id: str,
    username: str,
    tweet_id: str,
    video_url: str,
    combo: dict | None = None,
    status: str = "completed",
) -> None:
    """Insert a job record into the mythx_jobs table."""
    payload = {
        "x_user_id": x_user_id,
        "username": username,
        "tweet_id": tweet_id,
        "video_url": video_url,
        "status": status,
        "bot": "@HyperMythsX",
        "bot_url": "https://x.com/HyperMythX",
    }
    if combo:
        payload["combo_theme"] = combo.get("theme")
        payload["combo_arena"] = combo.get("arena")
        payload["combo_style"] = combo.get("style")
        payload["combo_sub_style"] = combo.get("sub_style")
        payload["combo_sentiment"] = combo.get("sentiment")

    get_client().table("mythx_jobs").insert(payload).execute()


def job_already_processed(tweet_id: str) -> bool:
    """Return True if we already processed this tweet (deduplication)."""
    res = (
        get_client()
        .table("mythx_jobs")
        .select("tweet_id")
        .eq("tweet_id", tweet_id)
        .limit(1)
        .execute()
    )
    return len(res.data) > 0
