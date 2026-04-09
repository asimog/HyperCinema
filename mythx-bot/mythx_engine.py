"""
MythX Engine — Production v6.2
Two-tier CRT system: Holographic CRT (default) or Truman Show Two-Layer (user tweets >100 likes).
Premium creative direction: appended when the mythx mention tweet itself has >=100 likes.
Technical Prompting Bible v6.2: 3-Act storytelling structure, flexible artistic approach, emotional arc.
CRT recording effect as absolute core + 16 classic 90s anime sub-styles.
Sentiment-aware sampling via Grok chat call for cinematic coherence.
16×16×16×16×2 = 131,072 combo variations (2 visual tiers) + premium boost.
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


# === FULL CRT PHYSICS BLOCK (repeat verbatim in every single clip) ===
# This is the compound physical system description the model treats as hard rules.
CRT_PHYSICS_BLOCK = (
    "strong visible horizontal scanlines across the entire frame, "
    "intense phosphor glow and bloom on bright areas especially energy and highlights, "
    "visible RGB color convergence fringing with red and blue shifts on high-contrast edges, "
    "soft analog video blur and slight ghosting on fast motion, "
    "warm nostalgic color grading with boosted reds and yellows, "
    "subtle barrel distortion and screen curvature, "
    "analog video noise and faint tracking lines, "
    "phosphor persistence trails on bright objects, "
    "slight moiré patterns from the camcorder recording the CRT, "
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

# ── Premium creative direction (triggered when mention tweet has >= 100 likes)
PREMIUM_CREATIVE_DIRECTION = (
    "ultra-cinematic masterpiece, maximum emotional impact, "
    "highly detailed keyframe animation, award-winning direction, "
    "epic scale, breathtaking visuals, perfect composition"
)

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
        has_viral: bool = False, is_premium: bool = False,
    ) -> Tuple[str, str, str, Dict]:
        """
        Returns (prompt1, prompt2, prompt3, combo_dict).
        Each prompt is for a 10s 1:1 480p clip.

        Args:
            has_viral: True if any of the user's tweets has >100 likes
                       → triggers Truman Show Two-Layer style.
            is_premium: True if the mythx mention tweet itself has >=100 likes
                       → appends ultra-cinematic creative direction.
        """
        sentiment = self._advanced_sentiment(tweets_text)
        combo = self._sample_combo(sentiment)

        combo["style"] = "truman_show" if has_viral else "holographic_crt"

        # Language instruction for dialogue/text in generated video
        lang_instruction = ""
        if language == "japanese":
            lang_instruction = " All spoken dialogue and on-screen text must be in natural Japanese."
        elif language == "chinese":
            lang_instruction = " All spoken dialogue and on-screen text must be in natural Mandarin Chinese."
        elif language == "russian":
            lang_instruction = " All spoken dialogue and on-screen text must be in natural Russian."

        # ── Quality boosters base (shared across all clips)
        quality_base = (
            "Ultra detailed, 24fps smooth natural motion, accurate physics simulation, "
            "cinematic masterpiece, maximum emotional impact, highly detailed keyframe animation"
        )

        # ── Premium creative direction (100+ likes on mention tweet)
        premium_creative = ""
        if is_premium:
            combo["premium"] = True
            premium_creative = (
                ", award-winning direction, epic scale, breathtaking visuals, perfect composition"
            )

        # ── Build base openings for both tiers ─────────────────────────
        base_opening_truman = (
            f"10 second 1:1 square 480p video captured exactly as if a real 1990s consumer "
            f"camcorder is filming a curved CRT television screen in a 90s anime living room. "
            f"Anime Layer (slow, emotional, foreground): Classic 90s anime characters sitting on "
            f"a couch watching the TV, reacting with commentary, gasps, cheers, and genuine emotion. "
            f"Human Layer (on the CRT TV screen): Dramatic reality TV broadcast titled "
            f"'The Truman Show of the Planet' showing real human events from @{username}'s last 16 tweets."
        )

        base_opening_holo = (
            f"10 second 1:1 square 480p video captured exactly as if a real 1990s consumer "
            f"camcorder is filming a CRT television screen that is displaying a real physical "
            f"world event in 90s anime style. "
            f"Central subject is @{username}."
        )

        # ── Narrative context (shared across all clips)
        narrative = (
            f"@{username} is the powerful hero in a {combo['theme']} "
            f"set in the {combo['arena']}. "
            f"Style: {combo['sub_style']} visual influences."
        )

        if has_viral:
            # ── TRUMAN SHOW TWO-LAYER TIER — 3-Act Structure ──

            p1 = (
                f"{base_opening_truman} "
                f"This is Act 1 — The Setup. "
                f"Introduce @{username}'s personality and world through their recent tweets. "
                f"Show the beginning of their story with curiosity and emotional foundation. "
                f"Show the anime characters settling on the couch and beginning to watch "
                f"the Truman Show broadcast of @{username}'s life. "
                f"{narrative} "
                f"Camera and motion: {combo['tech']}. "
                f"{CRT_PHYSICS_BLOCK}. "
                f"{quality_base}.{lang_instruction}"
            )

            p2 = (
                f"{base_opening_truman} "
                f"This is Act 2 — The Rising Action. "
                f"Seamlessly continue directly from the exact last frame of the previous clip. "
                f"Maintain identical character appearance, lighting, color grading, scanlines, "
                f"phosphor glow, RGB fringing, curvature, and all analog CRT effects. "
                f"Build tension and emotional depth. "
                f"Show conflict, struggle, key moments, and rising intensity from "
                f"@{username}'s tweets as the human story unfolds on the TV while the anime "
                f"characters react more strongly. "
                f"{narrative} "
                f"Camera and motion: {combo['tech']}. "
                f"{CRT_PHYSICS_BLOCK}. "
                f"{quality_base}.{lang_instruction}"
            )

            p3 = (
                f"{base_opening_truman} "
                f"This is Act 3 — The Climax and Resolution. "
                f"Seamlessly continue directly from the exact last frame of the previous clip. "
                f"Maintain identical character appearance, lighting, color grading, scanlines, "
                f"phosphor glow, RGB fringing, curvature, and all analog CRT effects. "
                f"Deliver a powerful, memorable ending. "
                f"Show the payoff, reflection, victory, or emotional close from "
                f"@{username}'s tweets. Let the anime characters react with strong emotion or catharsis. "
                f"{narrative} "
                f"Camera and motion: {combo['tech']}. "
                f"{CRT_PHYSICS_BLOCK}. "
                f"{quality_base}{premium_creative}.{lang_instruction}"
            )
        else:
            # ── HOLOGRAPHIC CRT TIER — 3-Act Structure ──

            p1 = (
                f"{base_opening_holo} "
                f"This is Act 1 — The Setup. "
                f"Introduce @{username}'s personality and the arena environment. "
                f"Show the beginning of their heroic journey with curiosity and emotional foundation. "
                f"First powerful interaction with arena forces begins. "
                f"{narrative} "
                f"Camera and motion: {combo['tech']}. "
                f"{CRT_PHYSICS_BLOCK}. "
                f"{quality_base}.{lang_instruction}"
            )

            p2 = (
                f"{base_opening_holo} "
                f"This is Act 2 — The Rising Action. "
                f"Seamlessly continue directly from the exact last frame of the previous clip. "
                f"Maintain identical character appearance, lighting, color grading, scanlines, "
                f"phosphor glow, RGB fringing, curvature, and all analog CRT effects. "
                f"Build tension and emotional depth. "
                f"Show key moments from recent tweets as @{username} battles and interacts "
                f"with arena forces. Escalation of conflict and emotional depth. "
                f"{narrative} "
                f"Camera and motion: {combo['tech']}. "
                f"{CRT_PHYSICS_BLOCK}. "
                f"{quality_base}.{lang_instruction}"
            )

            p3 = (
                f"{base_opening_holo} "
                f"This is Act 3 — The Climax and Resolution. "
                f"Seamlessly continue directly from the exact last frame of the previous clip. "
                f"Maintain identical character appearance, lighting, color grading, scanlines, "
                f"phosphor glow, RGB fringing, curvature, and all analog CRT effects. "
                f"Deliver a powerful, memorable ending. "
                f"@{username} claims victory or achieves their destiny. "
                f"Epic memorable ending with powerful emotional resonance. "
                f"{narrative} "
                f"Camera and motion: {combo['tech']}. "
                f"{CRT_PHYSICS_BLOCK}. "
                f"{quality_base}{premium_creative}.{lang_instruction}"
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
