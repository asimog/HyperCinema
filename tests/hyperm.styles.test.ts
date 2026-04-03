import { describe, expect, it } from "vitest";

import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";
import { DEFAULT_HYPERM_STYLE_ID, HYPERM_STYLE_GROUPS } from "@/lib/hyperm/styles";

describe("HyperM style catalog", () => {
  it("exposes 42 grouped styles", () => {
    expect(CINEMA_PAGE_CONFIGS.hyperm.styleOptions).toHaveLength(42);
    expect(HYPERM_STYLE_GROUPS).toHaveLength(7);
  });

  it("defaults HyperM to the first film-era preset", () => {
    expect(CINEMA_PAGE_CONFIGS.hyperm.defaultStyle).toBe(DEFAULT_HYPERM_STYLE_ID);
    expect(DEFAULT_HYPERM_STYLE_ID).toBe("vhs_cinema");
  });
});
