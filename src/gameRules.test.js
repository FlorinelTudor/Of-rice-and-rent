const {
  communityOutcomeFor,
  policyVoteForPhase,
  resolvePolicyVote,
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
});
