import { buildContinuationPrompt, buildStoryCards } from "@/lib/cinema/storyCards";

describe("cinema story cards", () => {
  it("builds a music video continuation prompt from beats and transcript hints", () => {
    const cards = buildStoryCards({
      requestKind: "music_video",
      subjectName: "Neon Anthem",
      subjectDescription: "A synthwave single gets trailer treatment.",
      requestedPrompt: "Make the chorus feel enormous.",
      sourceTranscript: "1 - Open on the hook.\n2 - Ride the beat.",
      storyBeats: [
        "Open on the hook",
        "Ride the beat",
        "Land on a poster frame.",
      ],
      audioEnabled: true,
    });

    expect(cards).toHaveLength(4);
    expect(cards[0]?.visualCue).toContain("performance-first");
    expect(cards[3]?.narrationCue).toContain("Carry forward these prior beats");
    expect(cards[3]?.narrationCue).toContain("Open on the hook");
    expect(cards[3]?.narrationCue).toContain("Ride the beat");

    const continuation = buildContinuationPrompt({
      requestKind: "music_video",
      subjectName: "Neon Anthem",
      subjectDescription: "A synthwave single gets trailer treatment.",
      requestedPrompt: "Make the chorus feel enormous.",
      sourceTranscript: "1 - Open on the hook.\n2 - Ride the beat.",
      storyBeats: ["Open on the hook", "Ride the beat"],
    });

    expect(continuation).toContain("Carry forward these prior beats");
    expect(continuation).toContain("Open on the hook");
    expect(continuation).toContain("Ride the beat");
    expect(continuation).toContain("Open on the hook.");
  });

  it("builds a scene recreation card set that preserves source-scene language", () => {
    const cards = buildStoryCards({
      requestKind: "scene_recreation",
      subjectName: "The Last Scene",
      subjectDescription: "A source scene gets rebuilt at higher voltage.",
      requestedPrompt: "Preserve the blocking and dialogue cadence.",
      storyBeats: [
        "Open by naming the source scene.",
        "Preserve the dialogue spine.",
        "Land on a remembered frame.",
      ],
      audioEnabled: true,
    });

    expect(cards).toHaveLength(4);
    expect(cards[0]?.visualCue).toContain("trailer-sharp");
    expect(cards[1]?.teaser).toContain("Preserve the dialogue spine");
    expect(cards[3]?.narrationCue).toContain("Carry forward these prior beats");
    expect(cards[3]?.narrationCue).toContain("Open by naming the source scene");
  });
});
