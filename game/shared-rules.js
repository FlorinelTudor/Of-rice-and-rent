const POLICY_VOTES = {
  deepening: {
    id: "relief_and_recovery_vote",
    phaseId: "deepening",
    title: "Should Washington lean on loans or direct relief?",
    detail: "Every family votes in secret. A tie preserves the historical policy.",
    statusQuoId: "reconstruction_loans",
    options: [
      {
        id: "reconstruction_loans",
        title: "Back reconstruction loans",
        detail: "Channel federal support through banks, railroads, and public works lenders to restart investment.",
        historical: "Historical status quo",
        impact: { bankTrust: 12, stability: 4, savings: 2, hope: -2 },
        favoredRoles: ["Main Street merchants", "Industrial wage earners", "Rail and transport workers", "Mining household"],
        favoredImpact: { savings: 3, stability: 2 },
      },
      {
        id: "direct_federal_relief",
        title: "Send direct federal relief",
        detail: "Put food, rent, and emergency household support ahead of financial reconstruction.",
        impact: { food: 9, health: 5, hope: 6, bankTrust: -4, stability: -2 },
        favoredRoles: ["Rural tenant farmers", "Urban service workers", "Migrant farm workers", "Urban garment workers", "New arrival workers"],
        favoredImpact: { food: 3, health: 2 },
      },
    ],
  },
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
  second: {
    id: "recovery_strategy_vote",
    phaseId: "second",
    title: "Should Washington pull back or sustain recovery spending?",
    detail: "Every family votes in secret. A tie preserves the historical policy.",
    statusQuoId: "fiscal_retrenchment",
    options: [
      {
        id: "fiscal_retrenchment",
        title: "Balance the federal budget",
        detail: "Reduce deficits and tighten spending to restore confidence in public finances.",
        historical: "Historical status quo",
        impact: { bankTrust: 9, savings: -3, hope: -5, stability: -4 },
        favoredRoles: ["Main Street merchants", "Rail and transport workers"],
        favoredImpact: { bankTrust: 3, stability: 1 },
      },
      {
        id: "sustain_recovery_spending",
        title: "Sustain recovery spending",
        detail: "Keep relief and public investment moving until jobs and demand hold on their own.",
        impact: { savings: 6, food: 3, hope: 7, stability: 4, bankTrust: -2 },
        favoredRoles: ["Industrial wage earners", "Urban service workers", "Urban garment workers", "Migrant farm workers", "New arrival workers"],
        favoredImpact: { savings: 3, hope: 2 },
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

const MIN_THINKING_TIME_MS = 5000;
const REPEAT_CHOICE_LIMIT = 3;
const PATTERN_CHOICE_LIMIT = 5;

function choicePattern(choice, actionDynamics = {}) {
  const dynamics = actionDynamics[choice] || [];
  if (choice.startsWith("emergency_")) return "emergency";
  if (choice.startsWith("final_")) return "final_bonus";
  if (["take_store_credit", "buy_radio_credit", "borrow_to_invest"].includes(choice)) return "credit";
  if (["invest_stocks", "sell_stocks_now", "withdraw_bank_cash"].includes(choice)) return "speculation";
  if (["cut_food_rent", "sell_possessions", "pawn_heirloom", "delay_medical_care"].includes(choice)) return "austerity";
  if (["move_to_city", "move_with_relatives", "move_for_work_camp", "seek_defense_work"].includes(choice) || dynamics.includes("mobility")) return "mobility";
  if (dynamics.includes("betray")) return "betrayal";
  if (dynamics.includes("cooperate")) return "community";
  if (dynamics.includes("relief")) return "relief";
  if (dynamics.includes("work")) return "work";
  if (["night_school", "fund_training", "keep_children_school"].includes(choice) || dynamics.includes("skills")) return "skills";
  return "household";
}

function antiGamingMultiplier(family = {}, choices = [], actionDynamics = {}) {
  const repeatCounts = family.choiceRepeatCounts || {};
  const patternCounts = family.choicePatternCounts || {};
  const hasRepeatedChoice = choices.some((choice) => (repeatCounts[choice] || 0) >= REPEAT_CHOICE_LIMIT);
  const hasRepeatedPattern = choices.some((choice) => (patternCounts[choicePattern(choice, actionDynamics)] || 0) >= PATTERN_CHOICE_LIMIT);
  if (hasRepeatedChoice && hasRepeatedPattern) return 0.8;
  if (hasRepeatedChoice || hasRepeatedPattern) return 0.9;
  return 1;
}

function positiveImpactMultiplier(rushedCount = 0, rushed = false) {
  if (!rushed) return 1;
  return Number(Math.max(0.55, 0.85 - Number(rushedCount || 0) * 0.1).toFixed(2));
}

function scaledImpact(key, value, multiplier) {
  if (multiplier >= 1) return value;
  if (key === "debt" && value < 0) return Math.round(value * multiplier);
  if (key !== "debt" && value > 0) return Math.round(value * multiplier);
  return value;
}

function consequenceWarningsFor(family = {}, choices = [], { elapsedMs = MIN_THINKING_TIME_MS } = {}, actionDynamics = {}) {
  const warnings = [];
  if (elapsedMs < MIN_THINKING_TIME_MS) warnings.push("Rushed choices reduce positive gains");
  const repeatCounts = family.choiceRepeatCounts || {};
  const patternCounts = family.choicePatternCounts || {};
  if (choices.some((choice) => (repeatCounts[choice] || 0) >= REPEAT_CHOICE_LIMIT)) warnings.push("Repeated action reduces this round's gains");
  if (choices.some((choice) => (patternCounts[choicePattern(choice, actionDynamics)] || 0) >= PATTERN_CHOICE_LIMIT)) warnings.push("Predictable strategy reduces this round's gains");
  if (choices.some((choice) => choicePattern(choice, actionDynamics) === "betrayal" && (patternCounts.betrayal || 0) >= 1)) warnings.push("Betrayal increases exploit risk and weakens reputation");
  if (family.communityMemoryHits) warnings.push("Community memory may reduce access to shared protection");
  return warnings;
}

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

function policyFollowThroughImpact(policy, winnerId, player) {
  return Object.fromEntries(
    Object.entries(policyImpactForPlayer(policy, winnerId, player))
      .map(([key, value]) => [key, Math.round(value * 0.35)])
      .filter(([, value]) => value !== 0)
  );
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
  MIN_THINKING_TIME_MS,
  PATTERN_CHOICE_LIMIT,
  REPEAT_CHOICE_LIMIT,
  antiGamingMultiplier,
  POLICY_VOTES,
  communityOutcomeFor,
  consequenceWarningsFor,
  choicePattern,
  metricDeltas,
  metricSnapshot,
  policyImpactForPlayer,
  policyFollowThroughImpact,
  policyVoteForPhase,
  positiveImpactMultiplier,
  resolvePolicyVote,
  scaledImpact,
};
