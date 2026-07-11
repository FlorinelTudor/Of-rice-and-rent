import { soundPatternFor } from "./tabletopSound";

describe("tabletop sound patterns", () => {
  test.each(["paper", "newspaper", "cards", "stamp", "telegram"])(
    "defines a playable %s cue",
    (cue) => {
      const pattern = soundPatternFor(cue);
      expect(pattern.length).toBeGreaterThan(0);
      expect(pattern.every((event) => event.duration > 0)).toBe(true);
    }
  );

  test("falls back to a quiet paper cue for unknown sounds", () => {
    expect(soundPatternFor("unknown")).toEqual(soundPatternFor("paper"));
  });
});
