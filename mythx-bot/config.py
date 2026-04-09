import os
from dotenv import load_dotenv

load_dotenv()

# ── xAI ──────────────────────────────────────────────────────────────────────
XAI_API_KEY = os.getenv("XAI_API_KEY")

# ── X (Twitter) API ───────────────────────────────────────────────────────────
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")
X_API_KEY = os.getenv("X_API_KEY")
X_API_SECRET = os.getenv("X_API_SECRET")
X_ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN")
X_ACCESS_TOKEN_SECRET = os.getenv("X_ACCESS_TOKEN_SECRET")

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ── Bot identity — hardcoded, do not change ───────────────────────────────────
BOT_USERNAME = "HyperMythsX"               # @HyperMythsX
BOT_X_URL = "https://x.com/HyperMythX"    # Profile page
BOT_DISPLAY_NAME = "HyperMythsX"
