const {
  MIN_THINKING_TIME_MS,
  antiGamingMultiplier,
  communityOutcomeFor,
  consequenceWarningsFor,
  positiveImpactMultiplier,
  policyVoteForPhase,
  resolvePolicyVote,
  scaledImpact,
} = require("../game/shared-rules");

describe("shared multiplayer rules", () => {
  test("uses the historical status quo when a policy vote ties", () => {
    const policy = policyVoteForPhase("bank_holiday");
    const result = resolvePolicyVote(policy, {
      familyA: "bank_stabilization",
      familyB: "household_assistance",
    }, ["familyA", "familyB"]);

    expect(result.resolved).toBe(true);
    expect(result.tied).toBe(true);
    expect(result.winnerId).toBe("bank_stabilization");
  });

  test("uses the strict majority winner when one option leads", () => {
    const policy = policyVoteForPhase("work_relief");
    const result = resolvePolicyVote(policy, {
      familyA: "direct_relief",
      familyB: "direct_relief",
      familyC: "public_works",
    }, ["familyA", "familyB", "familyC"]);

    expect(result.tied).toBe(false);
    expect(result.winnerId).toBe("direct_relief");
    expect(result.tally).toEqual({ public_works: 1, direct_relief: 2 });
  });

  test("keeps voting open until every active family has voted", () => {
    const policy = policyVoteForPhase("defense_shift");
    const result = resolvePolicyVote(policy, { familyA: "defense_contracts" }, ["familyA", "familyB"]);

    expect(result.resolved).toBe(false);
    expect(result.votesReceived).toBe(1);
    expect(result.eligibleCount).toBe(2);
  });

  test.each([
    [7, 8, 8, "shortfall", 0],
    [8, 8, 8, "safety", 8],
    [12, 8, 8, "surplus", 12],
  ])("classifies pot %i against need %i", (pot, need, activeCount, tier, spend) => {
    expect(communityOutcomeFor(pot, need, activeCount)).toMatchObject({ tier, spend });
  });

  test("uses five seconds as the minimum thinking window", () => {
    expect(MIN_THINKING_TIME_MS).toBe(5000);
  });

  test("scales only positive gains when a family submits rushed choices", () => {
    expect(positiveImpactMultiplier(0, false)).toBe(1);
    expect(positiveImpactMultiplier(0, true)).toBe(0.85);
    expect(positiveImpactMultiplier(2, true)).toBe(0.65);
    expect(scaledImpact("savings", 20, 0.65)).toBe(13);
    expect(scaledImpact("health", -20, 0.65)).toBe(-20);
  });

  test("keeps repeated-pattern penalties bounded and visible", () => {
    expect(antiGamingMultiplier({ choiceRepeatCounts: { keep_cash: 3 }, choicePatternCounts: { household: 0 } }, ["keep_cash"])).toBe(0.9);
    expect(antiGamingMultiplier({ choiceRepeatCounts: { keep_cash: 3 }, choicePatternCounts: { household: 5 } }, ["keep_cash"])).toBe(0.8);
    expect(consequenceWarningsFor({ choiceRepeatCounts: { keep_cash: 3 }, choicePatternCounts: { household: 5 } }, ["keep_cash"], { elapsedMs: 2000 })).toEqual([
      "Rushed choices reduce positive gains",
      "Repeated action reduces this round's gains",
      "Predictable strategy reduces this round's gains",
    ]);
  });
});
