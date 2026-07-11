const crypto = require("crypto");
const express = require("express");
const {
  communityOutcomeFor,
  metricDeltas,
  metricSnapshot,
  policyImpactForPlayer,
  policyVoteForPhase,
  resolvePolicyVote,
} = require("../game/shared-rules");
const path = require("path");

const MAX_PLAYERS = 8;
const MIN_THINKING_TIME_MS = 7000;
const BETRAYAL_POT_DRAIN = 3;
const BETRAYAL_EXPLOIT_MARKERS = 2;
const BETRAYAL_REPUTATION_HIT = -24;
const RIVAL_WINDOW_PHASES = new Set(["speculation", "deepening"]);
const SABOTAGE_CHOICES = new Set(["rival_undercut_work", "rival_spread_bank_rumors", "rival_call_in_debt", "rival_block_relief"]);
const SABOTAGE_EFFECTS = {
  rival_undercut_work: {
    title: "Wages undercut",
    attacker: { savings: 8, reputation: -14, hope: -4, exploitMarkers: 1 },
    target: { savings: -10, stability: -9, hope: -4 },
  },
  rival_spread_bank_rumors: {
    title: "Bank rumors spread",
    attacker: { bankTrust: 6, reputation: -12, hope: -5, exploitMarkers: 1 },
    target: { bankTrust: -16, stability: -6, hope: -7 },
  },
  rival_call_in_debt: {
    title: "Debt called in",
    attacker: { savings: 10, reputation: -16, stability: -4, exploitMarkers: 1 },
    target: { savings: -14, debt: 12, hope: -6 },
  },
  rival_block_relief: {
    title: "Relief access blocked",
    attacker: { food: 8, reputation: -18, hope: -5, exploitMarkers: 1 },
    target: { food: -13, health: -5, hope: -7 },
  },
};
const REPEAT_CHOICE_LIMIT = 3;
const PATTERN_CHOICE_LIMIT = 5;
const MAX_PATTERN_PENALTY = 8;
const UNEMPLOYMENT_SHOCK_PHASE = "deepening";
const COLLAPSE_REASONS = {
  health: {
    title: "Family health collapsed",
    detail: "Health stayed at zero for more than a phase. The family can no longer keep up with the demands of the crisis.",
  },
  food: {
    title: "The pantry ran empty",
    detail: "Food stayed at zero for more than a phase. Survival choices have overtaken every other goal.",
  },
  hope: {
    title: "Hope gave out",
    detail: "Hope stayed at zero for more than a phase. The family withdraws from the race and focuses only on getting through the day.",
  },
  debt: {
    title: "Debt overwhelmed the household",
    detail: "Debt stayed at or above 100 for more than a phase. Creditors, rent, and obligations have overtaken the household plan.",
  },
};
const EMERGENCY_ACTIONS = {
  health: {
    id: "emergency_health",
    title: "Emergency clinic visit",
    detail: "Spend everything you can to get the family treated now.",
    impact: { health: 38, savings: -18, debt: 12, hope: 4 },
  },
  food: {
    id: "emergency_food",
    title: "Emergency food line",
    detail: "Ask for immediate food help, even if pride and reputation suffer.",
    impact: { food: 38, hope: -6, reputation: -8 },
  },
  hope: {
    id: "emergency_hope",
    title: "Emergency family reset",
    detail: "Stop chasing gains and spend the round rebuilding morale.",
    impact: { hope: 38, savings: -10, stability: 8 },
  },
  debt: {
    id: "emergency_debt",
    title: "Emergency debt settlement",
    detail: "Liquidate what you can and renegotiate before creditors close in.",
    impact: { debt: -38, savings: -20, hope: -6, stability: 5 },
  },
};
const PORT = Number(process.env.PORT || 4173);
const PHASE_IDS = [
  "postwar",
  "recession_1921",
  "early_boom",
  "speculation",
  "crash",
  "deepening",
  "bank_holiday",
  "work_relief",
  "second",
  "defense_shift",
  "recovery",
  "results",
];

const SCENARIOS = [
  {
    id: "easy_credit",
    title: "Easy Credit",
    detail: "Installment plans and loans feel unusually tempting. Early comfort is easier, but debt pressure bites harder later.",
    rematchPrompt: "Try Harsh Winter next if the table thinks easy money was too kind.",
  },
  {
    id: "harsh_winter",
    title: "Harsh Winter",
    detail: "Food and health pressure hit harder. Mutual aid and cash cushions become more valuable.",
    rematchPrompt: "Try Bank Panic next for a run where trust in institutions matters more.",
  },
  {
    id: "bank_panic",
    title: "Bank Panic",
    detail: "Bank confidence is fragile. Cash, trust, and timing matter more than usual.",
    rematchPrompt: "Try Relief Politics next for a run about contested public help.",
  },
  {
    id: "relief_politics",
    title: "Relief Politics",
    detail: "Public help is stronger, but access is uneven and reputation matters more.",
    rematchPrompt: "Try Easy Credit next for a run where early optimism is dangerous.",
  },
];

const EVENT_VARIANTS = {
  postwar: [
    { id: "demobilized_workers", title: "Demobilized workers crowd hiring lines", detail: "Work competition rises as soldiers and wartime workers return." },
    { id: "price_swings", title: "Prices swing week to week", detail: "Families feel uncertainty before anyone knows whether prosperity will hold." },
  ],
  recession_1921: [
    { id: "factory_orders_fall", title: "Factory orders fall sharply", detail: "Short hours force families to choose between cash and stability." },
    { id: "local_credit_tightens", title: "Local credit tightens", detail: "Store credit remains possible, but debt becomes harder to ignore." },
  ],
  early_boom: [
    { id: "installment_boom", title: "Installment buying spreads", detail: "Modern comforts feel newly reachable for families willing to borrow." },
    { id: "night_school_growth", title: "Night schools advertise opportunity", detail: "Skill-building becomes a tempting path out of fragile work." },
  ],
  speculation: [
    { id: "broker_tips", title: "Broker tips reach Main Street", detail: "Speculation sounds less like gambling and more like common sense." },
    { id: "consumer_credit_pitch", title: "Salesmen push easy terms", detail: "Comfort now competes with resilience later." },
  ],
  crash: [
    { id: "margin_calls", title: "Margin calls hit households", detail: "Families exposed to stocks must decide what to salvage." },
    { id: "bank_whispers", title: "Bank whispers spread", detail: "Fear travels faster than facts." },
  ],
  deepening: [
    { id: "winter_relief_lines", title: "Winter relief lines lengthen", detail: "Private charity and local aid cannot cover everyone." },
    { id: "rent_pressure", title: "Rent pressure grows", detail: "Keeping a roof overhead competes with food, health, and schooling." },
  ],
  bank_holiday: [
    { id: "reopened_banks", title: "Reopened banks test public trust", detail: "Federal action steadies some families but not every household." },
    { id: "first_relief_forms", title: "Relief forms arrive", detail: "Help expands, but pride and access still shape who benefits." },
  ],
  work_relief: [
    { id: "road_crews", title: "Road crews hire locally", detail: "Public work creates wages, but not enough slots for every family." },
    { id: "relief_board_choices", title: "Relief boards make hard choices", detail: "Reputation and need both matter." },
  ],
  second: [
    { id: "relief_cutback", title: "Relief cutbacks worry families", detail: "A fragile recovery stumbles and the room has to adjust." },
    { id: "jobless_rise_again", title: "Jobless rolls rise again", detail: "Families learn that recovery can reverse." },
  ],
  defense_shift: [
    { id: "new_orders", title: "New factory orders arrive", detail: "Industrial households see a path forward, if they can reach it." },
    { id: "training_posts", title: "Training notices appear", detail: "Skills and mobility matter as factories change." },
  ],
  recovery: [
    { id: "hiring_surge", title: "Hiring surges unevenly", detail: "The long crisis eases, but family outcomes remain unequal." },
    { id: "new_beginnings", title: "Families count what survived", detail: "Savings, health, schooling, and trust tell different stories." },
  ],
  results: [
    { id: "family_ledgers", title: "Families compare ledgers", detail: "Final scores reveal how risk, trust, debt, and hardship shaped different outcomes." },
    { id: "table_debrief", title: "The room reviews its choices", detail: "The same timeline produced different incentives, sacrifices, and survival stories." },
  ],
};

const OBJECTIVE_VARIANTS = {
  industrial_stability: [
    { id: "industrial_stability", theme: "Stability", title: "Hold the household together", detail: "Finish with Stability 60+ while keeping trust at 45+." },
    { id: "industrial_emergency_fund", theme: "Emergency fund", title: "Build a factory-family cushion", detail: "Finish with Savings 50+ and Debt 55 or lower." },
    { id: "industrial_skill_path", theme: "Skills", title: "Turn work into advancement", detail: "Finish with Education 65+ or choose a skills action at least once." },
  ],
  shopkeeper_debt: [
    { id: "shopkeeper_debt", theme: "Solvency", title: "Keep the shop solvent", detail: "Finish with Debt 45 or lower and Hope 45+." },
    { id: "shopkeeper_trust", theme: "Customer trust", title: "Keep Main Street loyal", detail: "Finish with Trust 65+ and Debt 60 or lower." },
    { id: "shopkeeper_cash", theme: "Cash drawer", title: "Protect the cash drawer", detail: "Finish with Savings 55+." },
  ],
  tenant_food: [
    { id: "tenant_food", theme: "Food", title: "Keep food on the table", detail: "Finish with Food 50+ or successfully use a migration/work-camp path." },
    { id: "tenant_health", theme: "Health", title: "Keep the family healthy", detail: "Finish with Health 55+ and Food 45+." },
    { id: "tenant_mobility", theme: "Mobility", title: "Find a better route", detail: "Use at least 2 mobility or work actions and finish with Hope 45+." },
  ],
  immigrant_trust: [
    { id: "immigrant_trust", theme: "Standing", title: "Build standing", detail: "Finish with Trust 65+ or Education 60+." },
    { id: "immigrant_schooling", theme: "Schooling", title: "Make education the bridge", detail: "Finish with Education 68+." },
    { id: "immigrant_savings", theme: "Security", title: "Build security in a new city", detail: "Finish with Savings 45+ and Stability 50+." },
  ],
  railroad_mobility: [
    { id: "railroad_mobility", theme: "Mobility", title: "Keep moving, stay healthy", detail: "Use at least 2 work or mobility actions and finish with Health 45+." },
    { id: "railroad_health", theme: "Health", title: "Avoid being broken by the rails", detail: "Finish with Health 58+." },
    { id: "railroad_cash", theme: "Pay envelope", title: "Keep the pay envelope coming", detail: "Finish with Savings 50+ and Stability 50+." },
  ],
  garment_solidarity: [
    { id: "garment_solidarity", theme: "Solidarity", title: "Stand with the neighborhood", detail: "Use at least 2 community/labor actions and finish with Hope 55+." },
    { id: "garment_education", theme: "Next generation", title: "Protect the next generation", detail: "Finish with Education 65+ and Hope 45+." },
    { id: "garment_trust", theme: "Shop-floor trust", title: "Become a trusted organizer", detail: "Finish with Trust 65+." },
  ],
  service_respect: [
    { id: "service_respect", theme: "Respect", title: "Earn respect under pressure", detail: "Finish with Stability 50+ and Trust 60+." },
    { id: "service_schooling", theme: "Schooling", title: "Keep school within reach", detail: "Finish with Education 62+ and Hope 45+." },
    { id: "service_stability", theme: "Stable home", title: "Hold a stable home base", detail: "Finish with Stability 58+." },
  ],
  miner_health: [
    { id: "miner_health", theme: "Health", title: "Survive dangerous work", detail: "Finish with Health 45+ and Debt 55 or lower." },
    { id: "miner_union", theme: "Solidarity", title: "Lean on the coal town", detail: "Use at least 2 community/labor actions and finish with Trust 55+." },
    { id: "miner_food", theme: "Food", title: "Keep the pantry stocked", detail: "Finish with Food 55+." },
  ],
  seasonal_work: [
    { id: "seasonal_work", theme: "Work", title: "Find enough work", detail: "Finish with Food 45+ and use at least 2 work or relief actions." },
    { id: "seasonal_mobility", theme: "Mobility", title: "Follow the harvest", detail: "Use at least 2 mobility/work actions and finish with Stability 40+." },
    { id: "seasonal_health", theme: "Health", title: "End the season standing", detail: "Finish with Health 55+ and Food 45+." },
  ],
};

const IMPACTS = {
  factory_overtime: { savings: 15, health: -8, stability: 5 },
  shopkeeper_extend_credit: { reputation: 13, hope: 7, savings: -12 },
  tenant_sell_crop_early: { savings: 16, food: -10, hope: -4 },
  immigrant_english_classes: { education: 15, reputation: 7, savings: -8 },
  railroad_follow_work: { savings: 14, stability: -9, health: -4 },
  garment_piecework_home: { savings: 12, education: -7, hope: -5 },
  service_laundry_clients: { savings: 12, reputation: 9, health: -6 },
  miner_company_store: { food: 13, debt: 13, hope: -5 },
  seasonal_follow_harvest: { food: 12, savings: 11, stability: -11 },
  keep_factory_job: { food: 6, savings: 9, hope: -5, stability: 16 },
  use_savings_food: { food: 18, health: 9, savings: -17 },
  move_to_city: { savings: -10, hope: 7, stability: -9 },
  take_store_credit: { food: 8, debt: 17, hope: 5 },
  pull_child_school: { savings: 13, education: -24, hope: -14 },
  join_mutual_aid: { hope: 12, stability: 11, savings: -5 },
  build_emergency_fund: { savings: 16, hope: -4, stability: 11 },
  invest_stocks: { savings: 22, stock: 26, hope: 10, stability: -4 },
  borrow_to_invest: { savings: 28, stock: 38, debt: 24, hope: 12, stability: -12 },
  buy_radio_credit: { hope: 15, debt: 16, savings: -5 },
  pay_down_debt: { debt: -24, savings: -9, stability: 10 },
  night_school: { education: 17, savings: -9, hope: 4 },
  keep_cash: { savings: 13, stability: 8, hope: -3 },
  move_better_rental: { health: 13, hope: 10, debt: 9 },
  sell_stocks_now: { savings: -14, stock: -28, stability: 10 },
  withdraw_bank_cash: { savings: 9, bankTrust: -22, stability: 7 },
  cut_food_rent: { food: -20, health: -14, savings: 16, stability: -12 },
  search_any_work: { savings: 12, health: -8, hope: 5 },
  move_with_relatives: { debt: -10, stability: 9, hope: -16 },
  keep_children_school: { education: 18, savings: -13, hope: 6 },
  sell_possessions: { savings: 18, hope: -15, stability: -7 },
  apply_public_works: { food: 15, savings: 13, health: -5, hope: 16 },
  trust_reopened_bank: { bankTrust: 22, stability: 12 },
  accept_relief: { food: 19, health: 10, hope: -7 },
  move_for_work_camp: { savings: 14, education: 7, hope: -10 },
  organize_neighbors: { hope: 14, stability: 13, savings: -5 },
  delay_medical_care: { savings: 13, health: -22 },
  stay_public_works: { savings: 11, stability: 12 },
  seek_defense_work: { savings: 20, hope: 16, stability: -5 },
  rebuild_savings: { savings: 20, hope: 5, stability: 5 },
  repair_health: { health: 21, savings: -12 },
  support_union: { hope: 11, stability: -10, savings: 11 },
  older_child_fulltime: { savings: 16, education: -21, hope: -11 },
  seek_charity_clinic: { health: 24, savings: -12, hope: -8 },
  send_family_to_country: { health: 16, food: 12, stability: -16, hope: -5 },
  pawn_heirloom: { savings: 24, hope: -18, stability: -6 },
  take_desperate_work: { food: 16, savings: 14, health: -15, stability: -6 },
  sponsor_neighbor: { hope: 12, stability: 8, savings: -14 },
  fund_training: { education: 20, savings: -18, hope: 6 },
  contribute_community_pot: { food: -8, savings: -5, hope: 6, stability: 7, reputation: 10 },
  hoard_relief: { food: 18, savings: 8, hope: -5, reputation: -14 },
  undercut_wages: { savings: 19, stability: -12, hope: -8, reputation: -12 },
  inform_on_black_market: { savings: 16, stability: 8, hope: -10, reputation: -16 },
  final_food_surplus: { food: -8, stability: 12, hope: 8, reputation: 8 },
  final_health_shift: { savings: 16, hope: 8, health: -6 },
  final_savings_invest: { stability: 14, debt: -8, savings: -8 },
  final_hope_leadership: { hope: 8, stability: 9, reputation: 12 },
  final_education_training: { education: 10, savings: 14, stability: 8 },
  final_stability_settle: { stability: 12, debt: -12, hope: 6 },
  rival_undercut_work: SABOTAGE_EFFECTS.rival_undercut_work.attacker,
  rival_spread_bank_rumors: SABOTAGE_EFFECTS.rival_spread_bank_rumors.attacker,
  rival_call_in_debt: SABOTAGE_EFFECTS.rival_call_in_debt.attacker,
  rival_block_relief: SABOTAGE_EFFECTS.rival_block_relief.attacker,
  emergency_health: EMERGENCY_ACTIONS.health.impact,
  emergency_food: EMERGENCY_ACTIONS.food.impact,
  emergency_hope: EMERGENCY_ACTIONS.hope.impact,
  emergency_debt: EMERGENCY_ACTIONS.debt.impact,
};

const ACTION_DYNAMICS = {
  factory_overtime: ["work"],
  shopkeeper_extend_credit: ["cooperate"],
  tenant_sell_crop_early: ["household"],
  immigrant_english_classes: ["skills"],
  railroad_follow_work: ["work", "mobility"],
  garment_piecework_home: ["work"],
  service_laundry_clients: ["work"],
  miner_company_store: ["relief"],
  seasonal_follow_harvest: ["work", "mobility"],
  keep_factory_job: ["work"],
  search_any_work: ["work"],
  apply_public_works: ["work", "relief"],
  stay_public_works: ["work"],
  seek_defense_work: ["work"],
  take_desperate_work: ["work"],
  older_child_fulltime: ["work"],
  accept_relief: ["relief"],
  seek_charity_clinic: ["relief"],
  join_mutual_aid: ["cooperate"],
  organize_neighbors: ["cooperate"],
  support_union: ["cooperate"],
  sponsor_neighbor: ["cooperate"],
  contribute_community_pot: ["cooperate"],
  final_food_surplus: ["cooperate"],
  final_hope_leadership: ["cooperate"],
  final_education_training: ["work"],
  final_health_shift: ["work"],
  hoard_relief: ["relief", "betray"],
  undercut_wages: ["work", "betray"],
  inform_on_black_market: ["betray"],
  rival_undercut_work: ["sabotage", "betray"],
  rival_spread_bank_rumors: ["sabotage", "betray"],
  rival_call_in_debt: ["sabotage", "betray"],
  rival_block_relief: ["sabotage", "betray"],
};

function choicePattern(choice) {
  if (choice.startsWith("emergency_")) return "emergency";
  if (choice.startsWith("final_")) return "final_bonus";
  if (["take_store_credit", "buy_radio_credit", "borrow_to_invest"].includes(choice)) return "credit";
  if (["invest_stocks", "sell_stocks_now", "withdraw_bank_cash"].includes(choice)) return "speculation";
  if (["cut_food_rent", "sell_possessions", "pawn_heirloom", "delay_medical_care"].includes(choice)) return "austerity";
  if (["move_to_city", "move_with_relatives", "move_for_work_camp", "seek_defense_work"].includes(choice) || ACTION_DYNAMICS[choice]?.includes("mobility")) return "mobility";
  if (ACTION_DYNAMICS[choice]?.includes("betray")) return "betrayal";
  if (ACTION_DYNAMICS[choice]?.includes("cooperate")) return "community";
  if (ACTION_DYNAMICS[choice]?.includes("relief")) return "relief";
  if (ACTION_DYNAMICS[choice]?.includes("work")) return "work";
  if (["night_school", "fund_training", "keep_children_school"].includes(choice) || ACTION_DYNAMICS[choice]?.includes("skills")) return "skills";
  return "household";
}

function antiGamingMultiplier(family, choices) {
  const repeatCounts = family.choiceRepeatCounts || {};
  const patternCounts = family.choicePatternCounts || {};
  const hasRepeatedChoice = choices.some((choice) => (repeatCounts[choice] || 0) >= REPEAT_CHOICE_LIMIT);
  const hasRepeatedPattern = choices.some((choice) => (patternCounts[choicePattern(choice)] || 0) >= PATTERN_CHOICE_LIMIT);
  if (hasRepeatedChoice && hasRepeatedPattern) return 0.8;
  if (hasRepeatedChoice || hasRepeatedPattern) return 0.9;
  return 1;
}

const PHASE_PRESSURE = {
  postwar: { work: 0.7, relief: 0.2, need: 0.55 },
  recession_1921: { work: 0.45, relief: 0.25, need: 0.7 },
  early_boom: { work: 0.85, relief: 0.2, need: 0.45 },
  speculation: { work: 0.85, relief: 0.2, need: 0.45 },
  crash: { work: 0.35, relief: 0.25, need: 0.85 },
  deepening: { work: 0.3, relief: 0.35, need: 1 },
  bank_holiday: { work: 0.45, relief: 0.55, need: 0.85 },
  work_relief: { work: 0.65, relief: 0.6, need: 0.65 },
  second: { work: 0.5, relief: 0.45, need: 0.75 },
  defense_shift: { work: 0.75, relief: 0.35, need: 0.5 },
  recovery: { work: 0.9, relief: 0.3, need: 0.35 },
  results: { work: 0.9, relief: 0.3, need: 0.35 },
};

const POLICY_EFFECTS = {
  bank_holiday: {
    id: "emergency_banking_act",
    title: "Emergency Banking Act and federal deposit insurance",
    detail: "Banks reopen under federal oversight. Families regain some confidence in banks, though jobs remain scarce.",
    impact: { bankTrust: 18, stability: 8, hope: 5 },
  },
  work_relief: {
    id: "new_deal_work_relief",
    title: "Public work relief expands",
    detail: "New relief and work programs bring wages, food support, and cautious hope to many households.",
    impact: { food: 6, savings: 7, hope: 8, stability: 4 },
  },
  second: {
    id: "recovery_pullback",
    title: "Relief pullback and renewed downturn",
    detail: "A stumble in recovery makes jobs and relief feel less secure again.",
    impact: { savings: -5, hope: -7, stability: -5 },
  },
  defense_shift: {
    id: "defense_orders",
    title: "Defense orders revive factories",
    detail: "Government contracts begin lifting industrial demand and open new work paths.",
    impact: { savings: 7, hope: 6, stability: 4 },
  },
};

const STARTING_FAMILIES = [
  { name: "Carter", profile: "Cleveland factory household", role: "Industrial wage earners", objectiveId: "industrial_stability", objectiveTitle: "Hold the household together", objectiveDetail: "Finish with Stability 60+ while keeping trust at 45+.", food: 55, health: 62, savings: 30, debt: 42, hope: 58, education: 62, stability: 56, bankTrust: 55, stock: 0 },
  { name: "Rosen", profile: "Small shop owners", role: "Main Street merchants", objectiveId: "shopkeeper_debt", objectiveTitle: "Keep the shop solvent", objectiveDetail: "Finish with Debt 45 or lower and Hope 45+.", food: 61, health: 58, savings: 58, debt: 52, hope: 63, education: 70, stability: 52, bankTrust: 66, stock: 0 },
  { name: "Williams", profile: "Tenant farm family", role: "Rural tenant farmers", objectiveId: "tenant_food", objectiveTitle: "Keep food on the table", objectiveDetail: "Finish with Food 50+ or successfully use a migration/work-camp path.", food: 56, health: 54, savings: 16, debt: 58, hope: 52, education: 46, stability: 40, bankTrust: 42, stock: 0 },
  { name: "Novak", profile: "Recent immigrant industrial household", role: "New arrival workers", objectiveId: "immigrant_trust", objectiveTitle: "Build standing", objectiveDetail: "Finish with Trust 65+ or Education 60+.", food: 52, health: 59, savings: 20, debt: 36, hope: 58, education: 61, stability: 44, bankTrust: 48, stock: 0 },
  { name: "O'Connor", profile: "Railroad worker household", role: "Rail and transport workers", objectiveId: "railroad_mobility", objectiveTitle: "Keep moving, stay healthy", objectiveDetail: "Use at least 2 work or mobility actions and finish with Health 45+.", food: 58, health: 58, savings: 30, debt: 36, hope: 57, education: 59, stability: 55, bankTrust: 54, stock: 0 },
  { name: "Bianchi", profile: "Garment district family", role: "Urban garment workers", objectiveId: "garment_solidarity", objectiveTitle: "Stand with the neighborhood", objectiveDetail: "Use at least 2 community/labor actions and finish with Hope 55+.", food: 54, health: 56, savings: 26, debt: 44, hope: 62, education: 63, stability: 45, bankTrust: 51, stock: 0 },
  { name: "Johnson", profile: "Black urban service family", role: "Urban service workers", objectiveId: "service_respect", objectiveTitle: "Earn respect under pressure", objectiveDetail: "Finish with Stability 50+ and Trust 60+.", food: 49, health: 56, savings: 14, debt: 46, hope: 56, education: 61, stability: 38, bankTrust: 40, stock: 0 },
  { name: "Kowalski", profile: "Coal town mining family", role: "Mining household", objectiveId: "miner_health", objectiveTitle: "Survive dangerous work", objectiveDetail: "Finish with Health 45+ and Debt 55 or lower.", food: 54, health: 47, savings: 22, debt: 50, hope: 50, education: 50, stability: 44, bankTrust: 47, stock: 0 },
  { name: "Martinez", profile: "Seasonal farm labor family", role: "Migrant farm workers", objectiveId: "seasonal_work", objectiveTitle: "Find enough work", objectiveDetail: "Finish with Food 45+ and use at least 2 work or relief actions.", food: 45, health: 53, savings: 12, debt: 38, hope: 55, education: 45, stability: 36, bankTrust: 41, stock: 0 },
];

const rooms = new Map();

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampReputation(value) {
  return Math.max(-30, Math.min(100, Math.round(value)));
}

function hashIndex(seed, length) {
  if (!length) return 0;
  return crypto.createHash("sha256").update(seed).digest().readUInt32BE(0) % length;
}

function scenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || SCENARIOS[0];
}

function scenarioForRoom(code) {
  return SCENARIOS[hashIndex(code, SCENARIOS.length)];
}

function rematchScenario(currentScenarioId) {
  const currentIndex = SCENARIOS.findIndex((scenario) => scenario.id === currentScenarioId);
  return SCENARIOS[(Math.max(0, currentIndex) + 1) % SCENARIOS.length];
}

function eventVariantForRoom(room, phaseId) {
  const variants = EVENT_VARIANTS[phaseId] || [];
  if (!variants.length) return null;
  return variants[hashIndex(`${room.room_code}:${room.scenario_id || "standard"}:${phaseId}`, variants.length)];
}

function objectiveVariantForFamily(family, index, clientId) {
  const variants = OBJECTIVE_VARIANTS[family.objectiveId] || [];
  if (!variants.length) return null;
  return variants[hashIndex(`${family.name}:${clientId || ""}:${index}`, variants.length)];
}

function positiveImpactMultiplier(family, rushed) {
  if (!rushed) return 1;
  return Math.max(0.55, 0.85 - (family.rushedChoiceCount || 0) * 0.1);
}

function scaledImpact(key, value, multiplier) {
  if (multiplier >= 1) return value;
  if (key === "debt" && value < 0) return Math.round(value * multiplier);
  if (key !== "debt" && value > 0) return Math.round(value * multiplier);
  return value;
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i += 1) code += alphabet[crypto.randomInt(alphabet.length)];
  return code;
}

function publicRoom(room) {
  const phaseId = PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)];
  const scenario = { ...scenarioById(room.scenario_id), hardMode: Boolean(room.hard_mode) };
  return {
    roomCode: room.room_code,
    phaseIndex: room.phase_index,
    players: room.players || [],
    scenario,
    rematchScenario: room.phase_index >= PHASE_IDS.length - 1 ? rematchScenario(scenario.id) : null,
    nextRoomCode: room.next_room_code || null,
    shared: sharedSnapshot(room, phaseId),
    updatedAt: room.updated_at,
  };
}

function emergencyActionForReason(reason) {
  return EMERGENCY_ACTIONS[reason] || null;
}

function pickFamily(playerName, index, clientId, overrides = null) {
  const family = { ...STARTING_FAMILIES[index % STARTING_FAMILIES.length] };
  const objective = objectiveVariantForFamily(family, index, clientId);
  if (objective) {
    family.baseObjectiveId = family.objectiveId;
    family.objectiveId = objective.id;
    family.objectiveVariantId = objective.id;
    family.objectiveTheme = objective.theme;
    family.objectiveTitle = objective.title;
    family.objectiveDetail = objective.detail;
  }
  Object.assign(family, {
    id: crypto.randomUUID(),
    playerName,
    clientId: clientId || crypto.randomUUID(),
    choices: {},
    score: 0,
    slot: index,
    reputation: 50,
    exploitMarkers: 0,
    rivalTokensRemaining: 2,
    rivalChoicePhases: [],
    rivalHistory: [],
    sabotageHistory: [],
  });
  ["food", "health", "savings", "hope", "education", "stability", "bankTrust"].forEach((key) => {
    family[key] = clamp(family[key] + crypto.randomInt(17) - 8);
  });
  family.debt = Math.max(0, Math.round(family.debt + crypto.randomInt(21) - 10));
  if (overrides && typeof overrides === "object") {
    Object.entries(overrides).forEach(([key, value]) => {
      if (["food", "health", "savings", "hope", "education", "stability", "bankTrust"].includes(key)) family[key] = clamp(value);
      if (key === "debt") family.debt = Math.max(0, Math.min(100, Math.round(value)));
    });
  }
  family.initialHardship = Math.round(100 - (family.food + family.health + family.savings + family.hope + family.education + family.stability) / 6 + family.debt * 0.25);
  return family;
}

function applyChoices(family, choices, phaseId, options = {}) {
  const next = { ...family, choices: { ...(family.choices || {}) } };
  const warning = family.collapseWarning;
  const emergencyAction = warning ? emergencyActionForReason(warning.reason) : null;
  if (emergencyAction && choices.includes(emergencyAction.id)) {
    delete next.collapseWarning;
    delete next.ignoredCollapseWarning;
    next.emergencyRescues = (next.emergencyRescues || 0) + 1;
  } else if (warning) {
    next.ignoredCollapseWarning = {
      reason: warning.reason,
      phaseId: warning.phaseId,
      title: warning.title,
      detail: warning.detail,
    };
  }
  const patternMultiplier = antiGamingMultiplier(family, choices);
  const multiplier = positiveImpactMultiplier(family, options.rushed) * patternMultiplier;
  next.choiceRepeatCounts = { ...(family.choiceRepeatCounts || {}) };
  next.choicePatternCounts = { ...(family.choicePatternCounts || {}) };
  choices.forEach((choice) => {
    const pattern = choicePattern(choice);
    next.choiceRepeatCounts[choice] = (next.choiceRepeatCounts[choice] || 0) + 1;
    next.choicePatternCounts[pattern] = (next.choicePatternCounts[pattern] || 0) + 1;
    if (next.choiceRepeatCounts[choice] > REPEAT_CHOICE_LIMIT) {
      next.patternPenalty = Math.min(MAX_PATTERN_PENALTY, (next.patternPenalty || 0) + 1);
      next.hope = clamp((next.hope || 0) - 1);
    }
    if (next.choicePatternCounts[pattern] > PATTERN_CHOICE_LIMIT) {
      next.patternPenalty = Math.min(MAX_PATTERN_PENALTY, (next.patternPenalty || 0) + 1);
      next.stability = clamp((next.stability || 0) - 1);
    }
    if (pattern === "betrayal" && next.choicePatternCounts[pattern] > 1) {
      next.exploitMarkers = (next.exploitMarkers || 0) + 1;
      next.reputation = clampReputation((next.reputation ?? 50) - 6);
    }
    Object.entries(IMPACTS[choice] || {}).forEach(([key, value]) => {
      const impact = scaledImpact(key, value, multiplier);
      const current = next[key] || 0;
      if (key === "debt" || key === "stock") next[key] = Math.max(0, current + impact);
      else if (key === "reputation") next[key] = clampReputation((next[key] ?? 50) + impact);
      else next[key] = clamp(current + impact);
    });
  });
  if (phaseId === "crash" && next.stock > 0) {
    next.savings = clamp(next.savings - Math.ceil(next.stock * 0.55));
    next.hope = clamp(next.hope - 8);
    next.stock = Math.max(0, Math.floor(next.stock * 0.25));
  }
  next.minFood = Math.min(next.minFood ?? next.food, next.food);
  next.minHealth = Math.min(next.minHealth ?? next.health, next.health);
  next.minHope = Math.min(next.minHope ?? next.hope, next.hope);
  next.minEducation = Math.min(next.minEducation ?? next.education, next.education);
  next.minStability = Math.min(next.minStability ?? next.stability, next.stability);
  next.minSavings = Math.min(next.minSavings ?? next.savings, next.savings);
  next.rushedChoiceCount = (next.rushedChoiceCount || 0) + (options.rushed ? 1 : 0);
  next.lastChoiceRushed = Boolean(options.rushed);
  next.lastChoiceMultiplier = multiplier;
  next.lastPatternLimited = patternMultiplier < 1;
  return next;
}

function phaseCapacity(phaseId, playerCount, scenarioId = "easy_credit", hardMode = false) {
  const pressure = PHASE_PRESSURE[phaseId] || PHASE_PRESSURE.postwar;
  const capacity = {
    workSlots: Math.max(1, Math.round(playerCount * pressure.work)),
    reliefSlots: Math.max(1, Math.round(playerCount * pressure.relief)),
    communityNeed: Math.max(2, Math.ceil(playerCount * pressure.need)),
  };
  if (scenarioId === "easy_credit" && (phaseId === "early_boom" || phaseId === "speculation")) {
    capacity.workSlots += 1;
    capacity.communityNeed = Math.max(2, capacity.communityNeed - 1);
  }
  if (scenarioId === "easy_credit" && (phaseId === "crash" || phaseId === "deepening")) capacity.communityNeed += 1;
  if (scenarioId === "harsh_winter" && (phaseId === "deepening" || phaseId === "bank_holiday")) capacity.communityNeed += 1;
  if (scenarioId === "bank_panic" && (phaseId === "crash" || phaseId === "bank_holiday")) capacity.communityNeed += 1;
  if (scenarioId === "relief_politics" && (phaseId === "bank_holiday" || phaseId === "work_relief")) {
    capacity.reliefSlots += 1;
    capacity.communityNeed = Math.max(2, capacity.communityNeed - 1);
  }
  if (hardMode && phaseId !== "postwar" && phaseId !== "results") {
    capacity.workSlots = Math.max(1, Math.floor(capacity.workSlots * 0.75));
    capacity.reliefSlots = Math.max(1, Math.floor(capacity.reliefSlots * 0.75));
    capacity.communityNeed += 1;
  }
  return capacity;
}

function choiceHasTag(choices, tag) {
  return choices.some((choice) => (ACTION_DYNAMICS[choice] || []).includes(tag));
}

function hasMultipleWorkChoices(choices) {
  return choices.filter((choice) => (ACTION_DYNAMICS[choice] || []).includes("work")).length > 1;
}

function hasMultipleSabotageChoices(choices) {
  return choices.filter((choice) => (ACTION_DYNAMICS[choice] || []).includes("sabotage")).length > 1;
}

function applySharedImpact(family, impact) {
  const next = { ...family };
  Object.entries(impact).forEach(([key, value]) => {
    const current = key === "reputation" ? next[key] ?? 50 : next[key] || 0;
    if (key === "debt" || key === "stock" || key === "exploitMarkers") next[key] = Math.max(0, current + value);
    else if (key === "reputation") next[key] = clampReputation(current + value);
    else next[key] = clamp(current + value);
  });
  next.minFood = Math.min(next.minFood ?? next.food, next.food);
  next.minHealth = Math.min(next.minHealth ?? next.health, next.health);
  next.minHope = Math.min(next.minHope ?? next.hope, next.hope);
  next.minEducation = Math.min(next.minEducation ?? next.education, next.education);
  next.minStability = Math.min(next.minStability ?? next.stability, next.stability);
  next.minSavings = Math.min(next.minSavings ?? next.savings, next.savings);
  return next;
}

function collapseReason(family) {
  if ((family.health ?? 100) <= 0) return "health";
  if ((family.food ?? 100) <= 0) return "food";
  if ((family.hope ?? 100) <= 0) return "hope";
  if ((family.debt ?? 0) >= 100) return "debt";
  return null;
}

function applyCollapseChecks(room, phaseId, { allowGameOver = true } = {}) {
  room.players = (room.players || []).map((player) => {
    if (player.gameOver) return player;
    if (player.ignoredCollapseWarning && player.ignoredCollapseWarning.phaseId !== phaseId) {
      const reason = player.ignoredCollapseWarning.reason;
      return {
        ...player,
        gameOver: {
          reason,
          phaseId,
          title: COLLAPSE_REASONS[reason].title,
          detail: COLLAPSE_REASONS[reason].detail,
        },
      };
    }
    const reason = collapseReason(player);
    if (!reason) {
      const { collapseWarning, ignoredCollapseWarning, ...rest } = player;
      return rest;
    }
    if (player.collapseWarning && !allowGameOver) return player;
    if (allowGameOver && player.collapseWarning && player.collapseWarning.phaseId !== phaseId) {
      return {
        ...player,
        gameOver: {
          reason,
          phaseId,
          title: COLLAPSE_REASONS[reason].title,
          detail: COLLAPSE_REASONS[reason].detail,
        },
      };
    }
    return {
      ...player,
      collapseWarning: {
        reason,
        phaseId,
        title: COLLAPSE_REASONS[reason].title,
        detail: `Danger zone: choose "${emergencyActionForReason(reason).title}" this phase or this family will receive a closing screen next phase.`,
        emergencyChoiceId: emergencyActionForReason(reason).id,
        emergencyTitle: emergencyActionForReason(reason).title,
        emergencyDetail: emergencyActionForReason(reason).detail,
      },
    };
  });
}

function addPolicyHistory(family, policy) {
  const history = family.policyHistory || [];
  if (history.some((entry) => entry.id === policy.id)) return family;
  return {
    ...family,
    policyHistory: [...history, { id: policy.id, title: policy.title, phaseId: policy.phaseId }],
  };
}

function applyPolicyEffect(family, phaseId) {
  const policy = POLICY_EFFECTS[phaseId];
  if (!policy) return family;
  const next = applySharedImpact(family, policy.impact);
  return addPolicyHistory(next, { ...policy, phaseId });
}

function scenarioPhaseImpact(scenarioId, phaseId) {
  if (scenarioId === "easy_credit" && phaseId === "speculation") return { hope: 5, debt: 7 };
  if (scenarioId === "easy_credit" && phaseId === "crash") return { debt: 8, hope: -5, stability: -4 };
  if (scenarioId === "harsh_winter" && phaseId === "deepening") return { food: -8, health: -5, hope: -3 };
  if (scenarioId === "bank_panic" && phaseId === "crash") return { bankTrust: -18, stability: -5 };
  if (scenarioId === "bank_panic" && phaseId === "bank_holiday") return { bankTrust: 8, hope: 3 };
  if (scenarioId === "relief_politics" && phaseId === "work_relief") return { food: 5, hope: 4, reputation: 3 };
  if (scenarioId === "relief_politics" && phaseId === "second") return { hope: -5, stability: -3 };
  return null;
}

function shockScore(room, player, phaseId) {
  return crypto.createHash("sha256").update(`${room.room_code}:${phaseId}:${player.id}`).digest().readUInt32BE(0);
}

function applyUnemploymentShock(room, phaseId) {
  if (phaseId !== UNEMPLOYMENT_SHOCK_PHASE || !room.players.length) return;
  const shockCount = Math.max(1, Math.round(room.players.length * 0.25));
  const capacity = phaseCapacity(phaseId, room.players.length, room.scenario_id, room.hard_mode);
  const communityCushion = (room.shared?.communityPot ?? 0) >= capacity.communityNeed;
  const selected = [...room.players]
    .sort((a, b) => shockScore(room, a, phaseId) - shockScore(room, b, phaseId))
    .slice(0, shockCount);
  const selectedIds = new Set(selected.map((player) => player.id));
  const impact = communityCushion
    ? { savings: -9, hope: -8, stability: -7, food: -2 }
    : { savings: -18, hope: -14, stability: -13, food: -5 };

  room.players = room.players.map((player) => {
    if (!selectedIds.has(player.id)) return player;
    const next = applySharedImpact(player, impact);
    return {
      ...next,
      hiringResult: null,
      employmentShock: {
        phaseId,
        title: "Main job lost",
        detail: communityCushion
          ? "Your family lost its main job, but the community pot softened part of the blow."
          : "Your family lost its main job with little community cushion available.",
      },
    };
  });

  room.shared = {
    ...(room.shared || {}),
    communityPot: communityCushion ? Math.max(0, (room.shared?.communityPot ?? 0) - shockCount) : room.shared?.communityPot ?? 0,
    lastShock: {
      phaseId,
      count: shockCount,
      title: "Unemployment shock",
      detail: `${shockCount} of ${room.players.length} families lost their main job, reflecting unemployment near one quarter of workers at the crisis peak.`,
      cushioned: communityCushion,
    },
  };
}

function applyPhaseEntryEvents(room, phaseId) {
  room.entry_events = room.entry_events || {};
  if (room.entry_events[phaseId]) return;
  const policyVote = policyVoteForPhase(phaseId);
  const policy = policyVote ? null : POLICY_EFFECTS[phaseId];
  if (policy) {
    room.players = room.players.map((player) => applyPolicyEffect(player, phaseId));
    room.shared = {
      ...(room.shared || {}),
      activePolicy: { id: policy.id, title: policy.title, detail: policy.detail, phaseId },
    };
  }
  const scenarioImpact = scenarioPhaseImpact(room.scenario_id, phaseId);
  if (scenarioImpact) {
    const scenario = scenarioById(room.scenario_id);
    room.players = room.players.map((player) => applySharedImpact(player, scenarioImpact));
    room.shared = {
      ...(room.shared || {}),
      scenarioEvent: {
        id: `${scenario.id}_${phaseId}`,
        title: scenario.title,
        detail: scenario.detail,
        phaseId,
      },
    };
  }
  applyUnemploymentShock(room, phaseId);
  applyCollapseChecks(room, phaseId, { allowGameOver: false });
  room.entry_events[phaseId] = true;
}

function resolveScarcity(contenders, slots) {
  return [...contenders]
    .sort((a, b) => (b.player.reputation ?? 50) - (a.player.reputation ?? 50) || a.player.slot - b.player.slot)
    .slice(0, slots)
    .reduce((winners, item) => winners.add(item.player.id), new Set());
}

function sharedSnapshot(room, phaseId) {
  const playerCount = Math.max(1, (room.players || []).length);
  const capacity = phaseCapacity(phaseId, playerCount, room.scenario_id, room.hard_mode);
  const policy = policyVoteForPhase(phaseId);
  const policyState = room.policy_votes?.[phaseId] || null;
  return {
    trust: room.shared?.trust ?? 55,
    communityPot: room.shared?.communityPot ?? 3,
    lastRound: room.shared?.lastRound || "No shared decision has resolved yet.",
    activePolicy: room.shared?.activePolicy || null,
    lastShock: room.shared?.lastShock || null,
    scenarioEvent: room.shared?.scenarioEvent || null,
    eventVariant: eventVariantForRoom(room, phaseId),
    policyVote: policy ? {
      id: policy.id,
      phaseId,
      title: policy.title,
      detail: policy.detail,
      options: policy.options.map(({ id, title, detail, historical }) => ({ id, title, detail, historical })),
      votesReceived: policyState?.result?.votesReceived || Object.keys(policyState?.votes || {}).length,
      eligibleCount: policyState?.result?.eligibleCount || room.players.filter((player) => !player.gameOver).length,
      resolved: Boolean(policyState?.result?.resolved),
      result: policyState?.result || null,
    } : null,
    ...capacity,
    communitySurplusNeed: communityOutcomeFor(room.shared?.communityPot ?? 3, capacity.communityNeed, playerCount).surplusNeed,
  };
}

function resolveSharedRound(room, phaseId) {
  room.resolved_phases = room.resolved_phases || {};
  if (room.resolved_phases[phaseId]) return;

  const capacity = phaseCapacity(phaseId, room.players.length, room.scenario_id, room.hard_mode);
  const round = room.players
    .filter((player) => !player.gameOver)
    .map((player) => ({
      player,
      choices: player.choices?.[phaseId] || [],
    }));
  const work = round.filter((entry) => choiceHasTag(entry.choices, "work"));
  const relief = round.filter((entry) => choiceHasTag(entry.choices, "relief"));
  const cooperate = round.filter((entry) => choiceHasTag(entry.choices, "cooperate"));
  const betray = round.filter((entry) => choiceHasTag(entry.choices, "betray"));
  const sabotage = room.hard_mode ? round
    .map((entry) => ({ ...entry, choice: entry.choices.find((choice) => SABOTAGE_CHOICES.has(choice)) }))
    .filter((entry) => entry.choice && entry.player.rivalId) : [];
  const workWinners = resolveScarcity(work, capacity.workSlots);
  const reliefWinners = resolveScarcity(relief, capacity.reliefSlots);
  const betrayalDrain = room.hard_mode ? BETRAYAL_POT_DRAIN + 1 : BETRAYAL_POT_DRAIN;
  const communityPot = Math.max(0, (room.shared?.communityPot ?? 3) + cooperate.length * 2 - betray.length * betrayalDrain);
  const communityOutcome = communityOutcomeFor(communityPot, capacity.communityNeed, round.length);
  const potMetNeed = communityOutcome.tier !== "shortfall";
  const trustedByDanger = round
    .filter(({ player, choices }) => !choiceHasTag(choices, "betray") && (player.exploitMarkers || 0) < 4 && (player.reputation ?? 50) >= 20)
    .sort((a, b) => (a.player.food + a.player.health + a.player.hope + a.player.stability) - (b.player.food + b.player.health + b.player.hope + b.player.stability));
  const surplusRecipients = new Set(communityOutcome.tier === "surplus" ? trustedByDanger.slice(0, 2).map(({ player }) => player.id) : []);

  room.players = room.players.map((player) => {
    if (player.gameOver) return player;
    const choices = player.choices?.[phaseId] || [];
    let next = player;
    if (choiceHasTag(choices, "work")) {
      const hired = workWinners.has(player.id);
      next = {
        ...next,
        hiringResult: {
          phaseId,
          hired,
          title: hired ? "Work slot secured" : "No work slot this round",
          detail: hired
            ? `Your family was selected from ${work.length} applicants for ${capacity.workSlots} work slots. Reputation and family conditions helped; clicking faster did not.`
            : `Your family joined ${work.length} applicants for ${capacity.workSlots} work slots and was not selected. The hiring board resolved after all choices were in, not by submission speed.`,
        },
      };
      if (!hired) next = applySharedImpact(next, { savings: -8, hope: -5 });
    }
    if (choiceHasTag(choices, "relief") && !reliefWinners.has(player.id)) next = applySharedImpact(next, { food: -7, hope: -4 });
    if (choiceHasTag(choices, "cooperate")) next = applySharedImpact(next, { reputation: 5 });
    if (choiceHasTag(choices, "betray")) {
      next = applySharedImpact(next, {
        reputation: BETRAYAL_REPUTATION_HIT,
        exploitMarkers: BETRAYAL_EXPLOIT_MARKERS,
        hope: -4,
        stability: -3,
      });
    }
    if (potMetNeed) {
      const excludedFromTrust = choiceHasTag(choices, "betray") || (next.exploitMarkers || 0) >= 4 || (next.reputation ?? 50) < 20;
      if (excludedFromTrust) {
        next = applySharedImpact(next, { food: 1, hope: -2 });
        next.communityMemoryHits = (next.communityMemoryHits || 0) + 1;
      } else {
        next = applySharedImpact(next, { food: 4, hope: 5, stability: 3 });
        if (surplusRecipients.has(player.id)) next = applySharedImpact(next, { food: 6, health: 4, hope: 3 });
      }
    } else {
      next = applySharedImpact(next, { food: -4, hope: -8, stability: -7 });
    }
    return next;
  });

  if (sabotage.length) {
    const playerIndexById = new Map(room.players.map((player, index) => [player.id, index]));
    sabotage.forEach(({ player, choice }) => {
      const attackerIndex = playerIndexById.get(player.id);
      const targetIndex = playerIndexById.get(player.rivalId);
      const effect = SABOTAGE_EFFECTS[choice];
      if (attackerIndex == null || targetIndex == null || !effect || room.players[targetIndex].gameOver) return;
      const targetBefore = room.players[targetIndex];
      const attackerBefore = room.players[attackerIndex];
      const target = applySharedImpact(targetBefore, effect.target);
      const attacker = {
        ...attackerBefore,
        sabotageHistory: [
          ...(attackerBefore.sabotageHistory || []),
          { phaseId, choice, targetId: targetBefore.id, targetName: targetBefore.name, title: effect.title },
        ],
      };
      room.players[targetIndex] = {
        ...target,
        rivalHit: {
          phaseId,
          title: effect.title,
          detail: `${attackerBefore.playerName || "A rival"} (${attackerBefore.name} Family) targeted your family this round.`,
        },
      };
      room.players[attackerIndex] = attacker;
    });
  }

  const trustDelta = cooperate.length * 4 - betray.length * (room.hard_mode ? 22 : 18) + (communityOutcome.tier === "surplus" ? 7 : potMetNeed ? 4 : -8) - Math.max(0, work.length - capacity.workSlots) * 2;
  room.shared = {
    trust: clamp((room.shared?.trust ?? 55) + trustDelta),
    communityPot: Math.max(0, communityPot - communityOutcome.spend),
    lastRound: `${cooperate.length} helped the community, ${betray.length} stole from the shared pool. ${
      communityOutcome.tier === "surplus" ? "The pot reached a surplus and protected the families in greatest danger." : potMetNeed ? "The community pot held." : "The pot fell short."
    }`,
    last: {
      phaseId,
      cooperate: cooperate.length,
      betray: betray.length,
      workDemand: work.length,
      reliefDemand: relief.length,
      workSlots: capacity.workSlots,
      reliefSlots: capacity.reliefSlots,
      potMetNeed,
      potTier: communityOutcome.tier,
      surplusRecipients: [...surplusRecipients],
      sabotage: sabotage.length,
    },
  };
  room.resolved_phases[phaseId] = true;
  room.players = room.players.map((player) => {
    const before = player.roundSnapshots?.[phaseId];
    if (!before) return player;
    const choices = player.choices?.[phaseId] || [];
    return {
      ...player,
      roundReceipt: {
        phaseId,
        choices,
        deltas: metricDeltas(before, metricSnapshot(player)),
        hiring: player.hiringResult?.phaseId === phaseId ? player.hiringResult : null,
        communityTier: communityOutcome.tier,
        communityDetail: communityOutcome.tier === "surplus"
          ? "The shared pool reached surplus protection. The most endangered trusted families received extra aid."
          : communityOutcome.tier === "safety" ? "The shared pool funded basic protection for trusted families." : "The shared pool could not meet the town's minimum need.",
        rival: player.rivalHit?.phaseId === phaseId ? player.rivalHit : null,
        historical: "Household choices mattered, but jobs, relief access, public policy, and collective trust also shaped survival.",
      },
    };
  });
  applyCollapseChecks(room, phaseId);
}

function getRoom(req, res) {
  const room = rooms.get(String(req.params.roomCode || "").trim().toUpperCase());
  if (!room) {
    res.status(404).json({ detail: "Room not found" });
    return null;
  }
  return room;
}

const app = express();
app.use(express.json());

app.post("/api/game/rooms", (req, res) => {
  for (let i = 0; i < 12; i += 1) {
    const code = roomCode();
    if (rooms.has(code)) continue;
    const now = new Date().toISOString();
    const scenario = req.body?.scenario_id ? scenarioById(req.body.scenario_id) : scenarioForRoom(code);
    const room = {
      room_code: code,
      host_token: crypto.randomBytes(32).toString("base64url"),
      scenario_id: scenario.id,
      hard_mode: Boolean(req.body?.hard_mode),
      test_family_overrides: req.body?.test_family_overrides || null,
      phase_index: 0,
      players: [],
      created_at: now,
      phase_started_at: now,
      shared: { trust: 55, communityPot: 3, lastRound: "No shared decision has resolved yet." },
      resolved_phases: {},
      updated_at: now,
    };
    rooms.set(code, room);
    const previousCode = String(req.body?.previous_room_code || "").trim().toUpperCase();
    const previousRoom = previousCode ? rooms.get(previousCode) : null;
    if (previousRoom && req.body?.host_token === previousRoom.host_token) {
      previousRoom.next_room_code = code;
      previousRoom.updated_at = now;
    }
    res.json({ room: publicRoom(room), hostToken: room.host_token });
    return;
  }
  res.status(500).json({ detail: "Could not create a unique room code" });
});

app.get("/api/game/rooms/:roomCode", (req, res) => {
  const room = getRoom(req, res);
  if (room) res.json({ room: publicRoom(room) });
});

app.post("/api/game/rooms/:roomCode/join", (req, res) => {
  const room = getRoom(req, res);
  if (!room) return;
  const clientId = req.body.client_id || crypto.randomUUID();
  const existing = room.players.find((player) => player.clientId === clientId);
  if (existing) {
    res.json({ room: publicRoom(room), playerId: existing.id });
    return;
  }
  if (room.players.length >= MAX_PLAYERS) {
    res.status(409).json({ detail: `Room is full (${MAX_PLAYERS} players max).` });
    return;
  }
  const player = pickFamily(String(req.body.player_name || "Player").trim() || "Player", room.players.length, clientId, room.test_family_overrides);
  room.players.push(player);
  applyCollapseChecks(room, PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)], { allowGameOver: false });
  room.updated_at = new Date().toISOString();
  res.json({ room: publicRoom(room), playerId: player.id });
});

app.post("/api/game/rooms/:roomCode/policy-vote", (req, res) => {
  const room = getRoom(req, res);
  if (!room) return;
  const phaseId = PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)];
  const policy = policyVoteForPhase(phaseId);
  const player = room.players.find((candidate) => candidate.id === req.body.player_id && !candidate.gameOver);
  const option = policy?.options.find((candidate) => candidate.id === req.body.option_id);
  if (!policy || !player || !option) {
    res.status(400).json({ detail: "This policy vote is not available." });
    return;
  }
  room.policy_votes = room.policy_votes || {};
  const state = room.policy_votes[phaseId] || { votes: {}, result: null };
  if (!state.result?.resolved) {
    state.votes[player.id] = option.id;
    player.policyVotes = { ...(player.policyVotes || {}), [phaseId]: option.id };
  }
  const eligibleIds = room.players.filter((candidate) => !candidate.gameOver).map((candidate) => candidate.id);
  state.result = resolvePolicyVote(policy, state.votes, eligibleIds);
  room.policy_votes[phaseId] = state;
  if (state.result.resolved && !state.applied) {
    room.players = room.players.map((candidate) => {
      if (candidate.gameOver) return candidate;
      const impacted = applySharedImpact(candidate, policyImpactForPlayer(policy, state.result.winnerId, candidate));
      const winningOption = policy.options.find((candidateOption) => candidateOption.id === state.result.winnerId);
      return addPolicyHistory(impacted, { id: policy.id, title: winningOption.title, phaseId });
    });
    const winningOption = policy.options.find((candidateOption) => candidateOption.id === state.result.winnerId);
    room.shared = {
      ...(room.shared || {}),
      activePolicy: {
        id: policy.id,
        title: winningOption.title,
        detail: state.result.tied ? `${winningOption.detail} The vote tied, so the historical status quo prevailed.` : winningOption.detail,
        phaseId,
      },
    };
    state.applied = true;
    applyCollapseChecks(room, phaseId, { allowGameOver: false });
  }
  room.updated_at = new Date().toISOString();
  res.json({ room: publicRoom(room) });
});

app.post("/api/game/rooms/:roomCode/choices", (req, res) => {
  const room = getRoom(req, res);
  if (!room) return;
  const phaseId = PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)];
  const policy = policyVoteForPhase(phaseId);
  if (policy && !room.policy_votes?.[phaseId]?.result?.resolved) {
    res.status(409).json({ detail: "Every active family must vote on public policy before decisions open." });
    return;
  }
  const index = room.players.findIndex((player) => player.id === req.body.player_id);
  if (index < 0) {
    res.status(404).json({ detail: "Player not found in this room" });
    return;
  }
  if (room.players[index].gameOver) {
    res.json({ room: publicRoom(room) });
    return;
  }
  if ((room.players[index].choices?.[phaseId] || []).length !== 2) {
    const choices = (req.body.choices || []).slice(0, 2);
    if (hasMultipleWorkChoices(choices)) {
      res.status(400).json({ detail: "Choose only one work action this round." });
      return;
    }
    if (hasMultipleSabotageChoices(choices)) {
      res.status(400).json({ detail: "Choose only one sabotage action this round." });
      return;
    }
    if (choices.some((choice) => SABOTAGE_CHOICES.has(choice)) && (!room.hard_mode || !room.players[index].rivalId)) {
      res.status(400).json({ detail: "Choose a rival before using sabotage." });
      return;
    }
    const phaseStartedAt = Date.parse(room.phase_started_at || room.updated_at || room.created_at || new Date().toISOString());
    const rushed = Date.now() - phaseStartedAt < MIN_THINKING_TIME_MS;
    const startingPlayer = room.players[index];
    const updated = applyChoices(startingPlayer, choices, phaseId, { rushed });
    updated.roundSnapshots = { ...(startingPlayer.roundSnapshots || {}), [phaseId]: metricSnapshot(startingPlayer) };
    updated.choices = { ...(room.players[index].choices || {}), [phaseId]: choices };
    room.players[index] = updated;
    const activePlayers = room.players.filter((player) => !player.gameOver);
    if (activePlayers.length && activePlayers.every((player) => (player.choices?.[phaseId] || []).length === 2)) {
      resolveSharedRound(room, phaseId);
      room.phase_index = Math.min(room.phase_index + 1, PHASE_IDS.length - 1);
      room.phase_started_at = new Date().toISOString();
      applyPhaseEntryEvents(room, PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)]);
    }
    room.updated_at = new Date().toISOString();
  }
  res.json({ room: publicRoom(room) });
});

app.post("/api/game/rooms/:roomCode/rival", (req, res) => {
  const room = getRoom(req, res);
  if (!room) return;
  if (!room.hard_mode) {
    res.status(400).json({ detail: "Rival choices are only available in Hard Mode." });
    return;
  }
  const phaseId = PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)];
  if (!RIVAL_WINDOW_PHASES.has(phaseId)) {
    res.status(400).json({ detail: "Rival nominations open during the speculation and deepening phases." });
    return;
  }
  const playerIndex = room.players.findIndex((player) => player.id === req.body.player_id);
  const rival = room.players.find((player) => player.id === req.body.rival_id);
  if (playerIndex < 0 || !rival) {
    res.status(404).json({ detail: "Player or rival not found in this room." });
    return;
  }
  const player = room.players[playerIndex];
  if (player.id === rival.id || player.gameOver || rival.gameOver) {
    res.status(400).json({ detail: "Choose a living rival family other than your own." });
    return;
  }
  const usedPhases = player.rivalChoicePhases || [];
  if ((player.rivalTokensRemaining ?? 0) <= 0 || usedPhases.includes(phaseId)) {
    res.status(400).json({ detail: "No rival nomination token is available this phase." });
    return;
  }
  room.players[playerIndex] = {
    ...player,
    rivalId: rival.id,
    rivalName: rival.name,
    rivalPlayerName: rival.playerName,
    rivalTokensRemaining: Math.max(0, (player.rivalTokensRemaining ?? 0) - 1),
    rivalChoicePhases: [...usedPhases, phaseId],
    rivalHistory: [
      ...(player.rivalHistory || []),
      { phaseId, rivalId: rival.id, rivalName: rival.name, rivalPlayerName: rival.playerName },
    ],
  };
  room.updated_at = new Date().toISOString();
  res.json({ room: publicRoom(room) });
});

app.post("/api/game/rooms/:roomCode/advance", (req, res) => {
  const room = getRoom(req, res);
  if (!room) return;
  if (!req.body.host_token || req.body.host_token !== room.host_token) {
    res.status(403).json({ detail: "Only the host can advance this room." });
    return;
  }
  room.phase_index = Math.min(room.phase_index + 1, PHASE_IDS.length - 1);
  room.phase_started_at = new Date().toISOString();
  applyPhaseEntryEvents(room, PHASE_IDS[Math.min(room.phase_index, PHASE_IDS.length - 1)]);
  room.updated_at = new Date().toISOString();
  res.json({ room: publicRoom(room) });
});

const buildDir = path.join(__dirname, "..", "build");
app.use(express.static(buildDir));
app.get("*", (_req, res) => res.sendFile(path.join(buildDir, "index.html")));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Playtest server listening on http://localhost:${PORT}`);
});
