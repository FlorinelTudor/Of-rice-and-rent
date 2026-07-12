import { phaseSoundCueFor, soundPatternFor, stopTabletopSounds } from "./tabletopSound";

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

  test("gives every phase a deliberate cue and celebrates the winner reveal", () => {
    const phaseIds = ["postwar", "recession_1921", "early_boom", "speculation", "crash", "deepening", "bank_holiday", "work_relief", "second", "defense_shift", "recovery"];
    phaseIds.forEach((phaseId) => expect(soundPatternFor(phaseSoundCueFor(phaseId)).length).toBeGreaterThan(0));
    expect(phaseSoundCueFor("results")).toBe("celebration");
    expect(soundPatternFor("celebration").length).toBeGreaterThanOrEqual(5);
  });

  test("suspends active playback when game sound is muted", async () => {
    const suspend = jest.fn().mockResolvedValue();
    window.AudioContext = jest.fn(() => ({ state: "running", suspend }));

    expect(stopTabletopSounds()).toBe(true);
    await Promise.resolve();

    expect(suspend).toHaveBeenCalledTimes(1);
  });
});
