const POLICY_VOTES = {
  bank_holiday: {
    id: "banking_crisis_vote",
    phaseId: "bank_holiday",
    title: "How should Washington answer the banking crisis?",
    detail: "Every family votes in secret. A tie preserves the historical policy.",
    statusQuoId: "bank_stabilization",
    options: [
      {
        id: "bank_stabilization",
        title: "Stabilize the banks",
        detail: "Reopen sound banks under federal oversight and restore confidence.",
        historical: "Historical status quo",
        impact: { bankTrust: 18, stability: 8, hope: 5 },
        favoredRoles: ["Main Street merchants", "Industrial wage earners"],
        favoredImpact: { savings: 4, stability: 2 },
      },
      {
        id: "household_assistance",
        title: "Emergency household aid",
        detail: "Direct scarce federal support toward food, medicine, and rent.",
        impact: { food: 9, health: 4, hope: 7, bankTrust: -5, stability: -2 },
        favoredRoles: ["Rural tenant farmers", "Urban service workers", "Migrant farm workers"],
        favoredImpact: { food: 3, health: 2 },
      },
    ],
  },
  work_relief: {
    id: "work_relief_vote",
    phaseId: "work_relief",
    title: "Where should the next relief dollars go?",
    detail: "Every family votes in secret. A tie preserves the historical policy.",
    statusQuoId: "public_works",
    options: [
      {
        id: "public_works",
        title: "Fund public works",
        detail: "Create paid jobs building roads, schools, parks, and public facilities.",
        historical: "Historical status quo",
        impact: { savings: 7, hope: 8, stability: 4, food: 3 },
        favoredRoles: ["Industrial wage earners", "Rail and transport workers", "Mining household"],
        favoredImpact: { savings: 4, hope: 2 },
      },
      {
        id: "direct_relief",
        title: "Expand direct relief",
        detail: "Send food and household support directly to families in need.",
        impact: { food: 10, health: 5, hope: 5, savings: 2 },
        favoredRoles: ["Rural tenant farmers", "Urban service workers", "Migrant farm workers", "Urban garment workers"],
        favoredImpact: { food: 3, health: 2 },
      },
    ],
  },
  defense_shift: {
    id: "mobilization_vote",
    phaseId: "defense_shift",
    title: "What should recovery investment prioritize?",
    detail: "Every family votes in secret. A tie preserves the historical policy.",
    statusQuoId: "defense_contracts",
    options: [
      {
        id: "defense_contracts",
        title: "Expand defense contracts",
        detail: "Direct orders toward factories, rail networks, mines, and shipyards.",
        historical: "Historical status quo",
        impact: { savings: 8, hope: 6, stability: 6, health: -2 },
        favoredRoles: ["Industrial wage earners", "Rail and transport workers", "Mining household"],
        favoredImpact: { savings: 4, stability: 2 },
      },
      {
        id: "civilian_recovery",
        title: "Invest in civilian recovery",
        detail: "Prioritize training, health, and a broader civilian labor recovery.",
        impact: { education: 8, health: 5, hope: 6, savings: 2 },
        favoredRoles: ["New arrival workers", "Urban garment workers", "Urban service workers", "Migrant farm workers"],
        favoredImpact: { education: 3, hope: 2 },
      },
    ],
  },
};

function policyVoteForPhase(phaseId) {
  return POLICY_VOTES[phaseId] || null;
}

function resolvePolicyVote(policy, votes = {}, eligibleIds = []) {
  if (!policy) return null;
  const eligible = new Set(eligibleIds);
  const tally = Object.fromEntries(policy.options.map((option) => [option.id, 0]));
  Object.entries(votes).forEach(([playerId, optionId]) => {
    if (eligible.has(playerId) && Object.hasOwn(tally, optionId)) tally[optionId] += 1;
  });
  const votesReceived = Object.values(tally).reduce((sum, count) => sum + count, 0);
  const resolved = votesReceived >= eligible.size && eligible.size > 0;
  const maxVotes = Math.max(...Object.values(tally));
  const leaders = Object.keys(tally).filter((optionId) => tally[optionId] === maxVotes);
  const tied = resolved && leaders.length !== 1;
  return {
    policyId: policy.id,
    phaseId: policy.phaseId,
    eligibleCount: eligible.size,
    votesReceived,
    tally,
    resolved,
    tied,
    winnerId: resolved ? (tied ? policy.statusQuoId : leaders[0]) : null,
  };
}

function communityOutcomeFor(pot, need, activeCount) {
  const safePot = Math.max(0, Number(pot) || 0);
  const safeNeed = Math.max(0, Number(need) || 0);
  const surplusNeed = safeNeed + Math.ceil(Math.max(0, Number(activeCount) || 0) / 2);
  if (safePot < safeNeed) return { tier: "shortfall", spend: 0, need: safeNeed, surplusNeed };
  if (safePot < surplusNeed) return { tier: "safety", spend: safeNeed, need: safeNeed, surplusNeed };
  return { tier: "surplus", spend: surplusNeed, need: safeNeed, surplusNeed };
}

function policyImpactForPlayer(policy, winnerId, player) {
  const option = policy?.options.find((candidate) => candidate.id === winnerId);
  if (!option) return {};
  const favored = option.favoredRoles.includes(player.role);
  return favored ? { ...option.impact, ...mergeImpacts(option.impact, option.favoredImpact) } : { ...option.impact };
}

const RECEIPT_METRICS = ["food", "health", "savings", "debt", "hope", "education", "stability", "bankTrust", "reputation"];

function metricSnapshot(player) {
  return Object.fromEntries(RECEIPT_METRICS.map((key) => [key, Number(player?.[key] ?? 0)]));
}

function metricDeltas(before, after) {
  return Object.fromEntries(RECEIPT_METRICS
    .map((key) => [key, Number(after?.[key] ?? 0) - Number(before?.[key] ?? 0)])
    .filter(([, value]) => value !== 0));
}

function mergeImpacts(base, extra) {
  return Object.fromEntries(
    new Set([...Object.keys(base || {}), ...Object.keys(extra || {})])
      .values()
      .map((key) => [key, (base?.[key] || 0) + (extra?.[key] || 0)])
  );
}

module.exports = {
  POLICY_VOTES,
  communityOutcomeFor,
  metricDeltas,
  metricSnapshot,
  policyImpactForPlayer,
  policyVoteForPhase,
  resolvePolicyVote,
};
