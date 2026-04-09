"""
X (Twitter) API v2 client for @HyperMythsX bot.
https://x.com/HyperMythX

Uses Bearer Token for reading (user lookup, tweets).
Uses OAuth 1.0a for posting (replies).
"""
import requests
from requests_oauthlib import OAuth1
from config import (
    X_BEARER_TOKEN,
    X_API_KEY,
    X_API_SECRET,
    X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET,
    BOT_USERNAME,
    BOT_X_URL,
)

READ_HEADERS = {
    "Authorization": f"Bearer {X_BEARER_TOKEN}",
    "User-Agent": f"HyperMythsX/1.0 (+{BOT_X_URL})",
}

# ── User lookup ───────────────────────────────────────────────────────

def get_user_by_username(username: str) -> dict | None:
    """Return {id, name, username} or None."""
    username = username.lstrip("@")
    url = f"https://api.x.com/2/users/by/username/{username}"
    r = requests.get(url, headers=READ_HEADERS, timeout=10)
    if r.status_code == 200:
        return r.json().get("data")
    return None


def get_user_tweets(user_id: str, max_results: int = 16) -> tuple[str, bool]:
    """
    Fetch up to max_results recent tweets and return them as joined text.
    Returns (tweets_text, has_viral_tweet) where has_viral_tweet is True
    if any tweet has >100 likes.
    """
    url = f"https://api.x.com/2/users/{user_id}/tweets"
    params = {
        "max_results": min(max_results, 100),
        "tweet.fields": "text,created_at,public_metrics",
        "exclude": "retweets,replies",
    }
    r = requests.get(url, headers=READ_HEADERS, params=params, timeout=15)
    if r.status_code == 200:
        tweets = r.json().get("data", [])
        tweets_text = "\n\n".join(t["text"] for t in tweets)
        has_viral = any(
            t.get("public_metrics", {}).get("like_count", 0) > 100
            for t in tweets
        )
        return tweets_text, has_viral
    return "", False

# ── Posting (OAuth 1.0a) ─────────────────────────────────────────────

def _oauth() -> OAuth1:
    return OAuth1(X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)


def reply_to_tweet(tweet_id: str, text: str) -> bool:
    """Post a reply. Returns True on success."""
    url = "https://api.x.com/2/tweets"
    payload = {
        "text": text,
        "reply": {"in_reply_to_tweet_id": tweet_id},
    }
    r = requests.post(url, auth=_oauth(), json=payload, timeout=15)
    return r.status_code == 201


def post_tweet(text: str) -> bool:
    """Post a standalone tweet."""
    url = "https://api.x.com/2/tweets"
    r = requests.post(url, auth=_oauth(), json={"text": text}, timeout=15)
    return r.status_code == 201

# ── Filtered Stream (setup + listen) ─────────────────────────────────────────

# Just "mythx" as a reply to any tweet triggers the bot.
# The bot makes an autobiography of the person being replied TO.
STREAM_RULE = "(mythx) -is:retweet is:reply"


def get_stream_rules() -> list[dict]:
    url = "https://api.x.com/2/tweets/search/stream/rules"
    r = requests.get(url, headers=READ_HEADERS, timeout=10)
    return r.json().get("data", []) if r.status_code == 200 else []


def add_stream_rule(rule: str, tag: str = "mythx") -> bool:
    url = "https://api.x.com/2/tweets/search/stream/rules"
    payload = {"add": [{"value": rule, "tag": tag}]}
    r = requests.post(url, headers=READ_HEADERS, json=payload, timeout=10)
    return r.status_code == 201


def delete_stream_rules(rule_ids: list[str]) -> bool:
    url = "https://api.x.com/2/tweets/search/stream/rules"
    payload = {"delete": {"ids": rule_ids}}
    r = requests.post(url, headers=READ_HEADERS, json=payload, timeout=10)
    return r.status_code == 200


def ensure_stream_rule():
    """Make sure our MythX filter rule exists (idempotent)."""
    existing = get_stream_rules()
    for rule in existing:
        if rule.get("value") == STREAM_RULE:
            return  # already set
    add_stream_rule(STREAM_RULE, tag="mythx")


def stream_mentions(on_tweet):
    """
    Open the filtered stream and call on_tweet(tweet_data) for each match.
    tweet_data has: id, text, author_id, author_username,
                    in_reply_to_user_id, in_reply_to_tweet_id.
    Blocks forever — run in a thread.
    """
    ensure_stream_rule()

    url = "https://api.x.com/2/tweets/search/stream"
    params = {
        "tweet.fields": "author_id,text,created_at,in_reply_to_user_id,referenced_tweets,public_metrics",
        "expansions": "author_id",
        "user.fields": "username,name",
    }

    import json
    with requests.get(url, headers=READ_HEADERS, params=params, stream=True, timeout=90) as resp:
        for raw_line in resp.iter_lines():
            if not raw_line:
                continue
            try:
                data = json.loads(raw_line)
            except json.JSONDecodeError:
                continue

            tweet = data.get("data")
            includes = data.get("includes", {})
            users = {u["id"]: u for u in includes.get("users", [])}

            if tweet:
                author = users.get(tweet.get("author_id", ""), {})
                tweet["author_username"] = author.get("username", "")

                # Extract in_reply_to_user_id from referenced_tweets
                ref_tweets = tweet.get("referenced_tweets", [])
                reply_refs = [r for r in ref_tweets if r.get("type") == "replied_to"]
                if reply_refs:
                    tweet["in_reply_to_user_id"] = reply_refs[0].get("id")
                    tweet["in_reply_to_tweet_id"] = reply_refs[0].get("id")

                on_tweet(tweet)
