import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildCardsAgentDeck } from "@/lib/cards-agent";

export const runtime = "nodejs";

const requestKindSchema = z.enum([
  "token_video",
  "generic_cinema",
  "mythx",
  "bedtime_story",
  "music_video",
  "scene_recreation",
]);

const requestedCompositionSchema = z.enum([
  "cards",
  "title_page",
  "end_page",
  "game_of_life",
  "three_js",
]);

const cardsAgentRequestSchema = z.object({
  requestKind: requestKindSchema.optional(),
  subjectName: z.string().min(1).max(160).optional(),
  subjectDescription: z.string().max(4000).optional(),
  requestedPrompt: z.string().max(4000).optional(),
  requestedComposition: requestedCompositionSchema.optional(),
  sourceTranscript: z.string().max(12000).optional(),
  sourceReferenceLabel: z.string().max(400).optional(),
  storyBeats: z.array(z.string().min(1).max(600)).optional(),
  audioEnabled: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = cardsAgentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const deck = buildCardsAgentDeck(parsed.data);

  return NextResponse.json({
    agent: {
      id: "hypercinema.cards-agent",
      label: "CardsAgent",
      mode: "remotion",
      requestField: "requestedComposition",
      requestedComposition: deck.requestedComposition,
    },
    deck,
  });
}
