"""
MythX Engine — Production v5.8
Two-tier CRT system: Holographic CRT (default) or Truman Show Two-Layer (>100 likes).
CRT recording effect as absolute core + 16 classic 90s anime sub-styles.
Sentiment-aware sampling via Grok chat call for cinematic coherence.
16×16×16×16×2 = 131,072 combo variations (2 visual tiers).
"""
import random
import json
from typing import Tuple, Dict
from xai_sdk import Client
from config import XAI_API_KEY

_sentiment_client: Client | None = None

def _get_sentiment_client() -> Client:
    global _sentiment_client
    if _sentiment_client is None:
        _sentiment_client = Client(api_key=XAI_API_KEY)
    return _sentiment_client


# === CORE: HOLOGRAPHIC REAL-WORLD CRT SIMULATION ===
# (physics-accurate camcorder filming CRT displaying a "real" anime world)
# The anime world feels like a real physical place being holographically broadcast through an old TV.
HOLOGRAPHIC_CRT_CORE = (
    "the entire video is captured exactly as if a real 1990s consumer camcorder is filming a CRT television screen "
    "that is displaying a real physical world event in 90s anime style, "
    "strong visible horizontal scanlines across the entire frame, intense phosphor glow and bloom on bright areas especially energy blasts and hair, "
    "visible RGB color convergence fringing with red and blue shifts on high-contrast edges, "
    "soft analog video blur and slight ghosting on fast motion, warm nostalgic color grading with boosted reds and yellows, "
    "subtle barrel distortion and screen curvature, analog video noise and faint tracking lines, "
    "phosphor persistence trails on bright objects, slight moiré patterns from the camcorder recording the CRT, "
    "authentic late-90s broadcast CRT look, the anime world feels like a real physical place being holographically broadcast through an old TV"
)

# === CORE: TRUMAN SHOW TWO-LAYER (triggered when any tweet has >100 likes) ===
# Anime characters on a couch watching a CRT TV broadcasting the user's life as reality TV.
TRUMAN_CRT_CORE = (
    "the entire video is captured exactly as if a real 1990s consumer camcorder is filming a curved CRT television screen "
    "in a 90s anime living room. The scene has two clear layers: "
    "Anime Layer (slow, foreground): Classic 90s anime characters sitting on a couch watching the TV, reacting slowly with commentary, gasps, cheers, and emotional expressions. "
    "Human Layer (on the CRT TV screen): Fast-paced dramatic reality TV broadcast titled 'The Truman Show of the Planet' showing real human events based on @{username}'s last 16 tweets. "
    "Strong visible horizontal scanlines across the entire frame, intense phosphor glow and bloom on bright areas, "
    "visible RGB color convergence fringing with red and blue shifts on high-contrast edges, "
    "soft analog video blur and slight ghosting on fast motion, warm nostalgic color grading with boosted reds and yellows, "
    "subtle barrel distortion and screen curvature, analog video noise and faint tracking lines, "
    "phosphor persistence trails on bright objects, slight moiré patterns from the camcorder recording the CRT, "
    "authentic late-90s broadcast CRT look with holographic transmission feel"
)

# === 16 CLASSIC 90s ANIME SUB-STYLES (variations only - CRT recording effect always dominates) ===
NINETIES_ANIME_SUBSTYLES = [
    "Dragon Ball Z Goku epic shonen style",
    "Pokémon adventurous vibrant style",
    "Sailor Moon magical girl dramatic style",
    "Yu Yu Hakusho dark tournament style",
    "Berserk grimdark fantasy style",
    "Cowboy Bebop noir jazz style",
    "Neon Genesis Evangelion psychological mecha style",
    "Trigun western sci-fi style",
    "Hunter x Hunter adventurous style",
    "JoJo's Bizarre Adventure stylish pose style",
    "One Piece early pirate adventure style",
    "Rurouni Kenshin samurai action style",
    "Slam Dunk sports intensity style",
    "Ghost in the Shell cyberpunk style",
    "Cardcaptor Sakura cute magical style",
    "Inuyasha feudal fantasy style",
]

# ── 16 EPIC THEMES ──────────────────────────────────────────────────
EPIC_THEMES = [
    "glorious heroic saga", "epic arena battle legend", "anime fable destiny",
    "cinematic revenge odyssey", "mythic warrior ascension", "futuristic rebellion epic",
    "ancient prophecy fulfilled", "cosmic god-war chronicle", "noir shadow empire fall",
    "high-stakes tournament saga", "dreamlike fable awakening", "steampunk revolution tale",
    "post-apocalypse redemption arc", "cybernetic soul quest", "interstellar alliance war",
    "timeless love vs fate chronicle",
]

# ── 16 SUB-ARENAS ───────────────────────────────────────────────────
SUB_THEMES = [
    "colosseum of gods thunder arena", "neon-lit cyber arena deathmatch", "floating sky island tournament",
    "volcanic lava battle coliseum", "ancient ruin temple duel ground", "zero-gravity space station warzone",
    "underwater crystal arena clash", "desert sandstorm fortress siege", "ice crystal palace throne battle",
    "dream realm portal arena", "cybertruck convoy highway chase", "xAI colossus core chamber fight",
    "mars red dust gladiator pit", "tokyo rooftop neon showdown", "medieval dragon arena", "quantum realm rift battlefield",
]

# ── 16 CINEMATIC TECHNIQUES ─────────────────────────────────────────
CINEMATIC_TECH = [
    "slow majestic dolly zoom on subject dominating arena",
    "dynamic orbiting camera circling intense battle interaction",
    "fast whip-pan following subject charging through chaos",
    "slow-motion heroic push-in as world reacts to subject",
    "epic overhead crane reveal of massive arena scale",
    "first-person immersive glide through battlefield",
    "low-angle upward shot of subject unleashing power",
    "circular orbit around subject clashing with arena forces",
    "rapid dramatic zoom during critical strike moments",
    "elegant slow pan across subject face amid destruction",
    "shaky intense action cam tracking furious combat",
    "intimate eye-level tracking of emotional arena moments",
    "sweeping wide crane rise as subject claims victory",
    "futuristic floating glitch cam pursuing subject",
    "dramatic light-flare tracking through smoke and fire",
    "volumetric god-ray push through arena debris",
]

# ── LANGUAGE OPTIONS ────────────────────────────────────────────────
LANGUAGE_OPTIONS = {
    "mythx": "english",
    "mythx japanese": "japanese",
    "mythx chinese": "chinese",
    "mythx russian": "russian",
}

# ── Sentiment-biased theme pools ────────────────────────────────────
_POSITIVE_THEMES = [t for t in EPIC_THEMES if any(w in t for w in ("heroic", "redemption", "awakening", "destiny", "fable", "ascension"))]
_NEGATIVE_THEMES = [t for t in EPIC_THEMES if any(w in t for w in ("revenge", "empire fall", "war", "rebellion", "shadow", "odyssey"))]


class MythXEngine:
    """Pure, stateless prompt + reply engine with sentiment-aware combo sampling."""

    def _advanced_sentiment(self, tweets_text: str) -> Dict:
        """
        Grok-based advanced sentiment analysis.
        Returns: {'flavor': str, 'intensity': str, 'overall': str}
        """
        try:
            client = _get_sentiment_client()
            resp = client.chat.completions.create(
                model="grok-beta",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Return ONLY valid JSON with keys: "
                            "'flavor' (heroic/chaotic/reflective/savage/triumphant/melancholic/furious/serene), "
                            "'intensity' (low/medium/high), "
                            "'overall' (positive/neutral/negative)."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Analyze these tweets and return JSON:\n{tweets_text[:2000]}",
                    },
                ],
                max_tokens=80,
            )
            return json.loads(resp.choices[0].message.content.strip())
        except Exception:
            return {"flavor": "heroic", "intensity": "medium", "overall": "neutral"}

    def _sample_combo(self, sentiment: Dict) -> Dict:
        """Sentiment-biased combo sampling for cinematic coherence."""
        flavor = sentiment.get("flavor", "heroic")

        if flavor in ("heroic", "triumphant", "serene"):
            theme_pool = _POSITIVE_THEMES if _POSITIVE_THEMES else EPIC_THEMES
            theme = random.choice(theme_pool)
        elif flavor in ("savage", "furious", "chaotic"):
            theme_pool = _NEGATIVE_THEMES if _NEGATIVE_THEMES else EPIC_THEMES
            theme = random.choice(theme_pool)
        else:
            theme = random.choice(EPIC_THEMES)

        return {
            "theme": theme,
            "arena": random.choice(SUB_THEMES),
            "sub_style": random.choice(NINETIES_ANIME_SUBSTYLES),
            "tech": random.choice(CINEMATIC_TECH),
            "sentiment": sentiment,
        }

    def generate_3_slice_prompts(
        self, tweets_text: str, username: str, language: str = "english",
        has_viral: bool = False,
    ) -> Tuple[str, str, str, Dict]:
        """
        Returns (prompt1, prompt2, prompt3, combo_dict).
        Each prompt is for a 10s 1:1 480p clip.
        If has_viral is True (any tweet >100 likes), uses Truman Show two-layer style.
        """
        sentiment = self._advanced_sentiment(tweets_text)
        combo = self._sample_combo(sentiment)

        # Pick CRT core based on viral status
        crt_core = TRUMAN_CRT_CORE if has_viral else HOLOGRAPHIC_CRT_CORE
        combo["style"] = "truman_show" if has_viral else "holographic_crt"

        # Language instruction for dialogue/text in generated video
        lang_instruction = ""
        if language == "japanese":
            lang_instruction = " All spoken dialogue and on-screen text must be in natural Japanese."
        elif language == "chinese":
            lang_instruction = " All spoken dialogue and on-screen text must be in natural Mandarin Chinese."
        elif language == "russian":
            lang_instruction = " All spoken dialogue and on-screen text must be in natural Russian."

        if has_viral:
            # Truman Show two-layer prompts
            base = (
                f"10 second 1:1 square 480p video. "
                f"The scene is captured as if a 1990s camcorder is filming a CRT TV in a 90s anime living room. "
                f"Anime Layer (slow, foreground): Classic 90s anime characters sitting on a couch watching the TV and reacting with commentary, gasps, and emotions. "
                f"Human Layer (on the CRT TV screen): Fast-paced dramatic reality TV broadcast titled 'The Truman Show of the Planet' showing real human events based on @{username}'s last 16 tweets. "
                f"Style: {crt_core} with {combo['sub_style']} visual influences. "
                f"Camera and motion: {combo['tech']}. "
                f"24fps smooth motion, natural physics, ultra detailed, glorious battles, emotional depth."
                f"{lang_instruction}"
            )

            p1 = base + (
                " Start strong. Show the anime characters settling on the couch and beginning "
                "to watch the Truman Show broadcast of @{username}'s life."
            )
            p2 = (
                base
                + " Seamlessly continue directly from the exact last frame of the "
                "previous clip. Maintain identical character appearance, lighting, "
                "color grading, CRT scanlines, phosphor glow, RGB fringing, curvature, "
                "and analog effects. "
                "Show key moments from @{username}'s recent tweets as dramatic real human events "
                "on the TV while the anime characters react and comment."
            )
            p3 = (
                base
                + " Seamlessly continue directly from the exact last frame of the "
                "previous clip. Maintain identical character appearance, lighting, "
                "color grading, CRT scanlines, phosphor glow, RGB fringing, curvature, "
                "and analog effects. "
                "Build to an epic memorable ending with the anime characters cheering or "
                "reacting strongly to the powerful finale of @{username}'s story."
            )
        else:
            # Holographic CRT prompts
            base = (
                f"10 second 1:1 square 480p video. "
                f"Central subject is @{username}. "
                f"@{username} is the powerful hero in a {combo['theme']} "
                f"set in the {combo['arena']}. "
                f"Style: {crt_core} with {combo['sub_style']} visual influences. "
                f"Camera and motion: {combo['tech']}. "
                f"24fps smooth motion, natural physics, ultra detailed, "
                f"glorious battles, emotional depth, high energy shonen vibes."
                f"{lang_instruction}"
            )

            p1 = base + (
                " Start strong. Introduce personality and first powerful "
                "interaction with the arena."
            )
            p2 = (
                base
                + " Seamlessly continue directly from the exact last frame of the "
                "previous clip. Maintain identical character appearance, lighting, "
                "color grading, CRT scanlines, phosphor glow, RGB fringing, curvature, "
                "and analog effects. "
                "Show key moments from recent tweets as the subject battles and "
                "interacts with arena forces."
            )
            p3 = (
                base
                + " Seamlessly continue directly from the exact last frame of the "
                "previous clip. Maintain identical character appearance, lighting, "
                "color grading, CRT scanlines, phosphor glow, RGB fringing, curvature, "
                "and analog effects. "
                "Build to an epic memorable ending with powerful final arena "
                "interaction and victory."
            )

        return p1, p2, p3, combo

    def generate_caveman_reply(
        self, tweets_text: str, username: str, combo: Dict
    ) -> str:
        """Dynamic caveman reply — always in English, references tweets + combo."""
        snippet = tweets_text[:130].replace("\n", " ").strip() if tweets_text else "tweets"
        flavor = combo["sentiment"].get("flavor", "heroic")
        style = combo.get("style", "holographic_crt")

        if style == "truman_show":
            hooks = [
                f"CAVEMAN READ @{username} TWEETS ({flavor}). SAW {snippet}... UGH CHAOS BUT TRUMAN SHOW CRT ANIME! 🔥",
                f"CAVEMAN MAKE @{username} LIFE INTO REAL TV SHOW FOR 90s ANIME CHARACTERS. VIDEO SLAPS HARD! 💥",
                f"CAVEMAN SEE @{username} ON CRT TV. ANIME PEOPLE WATCHING AND REACTING. GLORIOUS NOSTALGIA MYTH! 🚀",
                f"CAVEMAN READ @{username} TWEETS. BUILT TRUMAN SHOW OF THE PLANET IN CRT ANIME. WATCH 30 SECOND LEGEND! ✨",
            ]
        else:
            hooks = [
                f"CAVEMAN READ @{username} TWEETS ({flavor}). SAW {snippet}... UGH CHAOS BUT LEGENDARY CRT ANIME! 🔥",
                f"CAVEMAN MAKE @{username} INTO CRT 90s ANIME MYTH IN {combo['arena']}. TWEETS WILD. VIDEO SLAPS HARD! 💥",
                f"CAVEMAN SEE @{username} FIGHTING LIFE. TURNED INTO GLORIOUS CRT ANIME BATTLE. UGH POWERFUL MYTH! 🚀",
                f"CAVEMAN READ @{username} TWEETS. BUILT EPIC CRT 90s ANIME LEGEND. WATCH 30 SECOND NOSTALGIA NOW! ✨",
            ]

        template = random.choice(hooks)
        text = template.format(
            username=username,
            flavor=flavor,
            snippet=snippet,
            arena=combo["arena"],
        )
        return text
