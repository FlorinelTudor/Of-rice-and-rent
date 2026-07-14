const ACTION_IMPACTS = Object.freeze({
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
  rival_undercut_work: { savings: 8, reputation: -14, hope: -4 },
  rival_spread_bank_rumors: { bankTrust: 6, reputation: -12, hope: -5 },
  rival_call_in_debt: { savings: 10, reputation: -16, stability: -4 },
  rival_block_relief: { food: 8, reputation: -18, hope: -5 },
  emergency_health: { health: 38, savings: -18, debt: 12, hope: 4 },
  emergency_food: { food: 38, hope: -6, reputation: -8 },
  emergency_hope: { hope: 38, savings: -10, stability: 8 },
  emergency_debt: { debt: -38, savings: -20, hope: -6, stability: 5 },
});

const ACTION_COPY = Object.fromEntries([
  ["keep_factory_job", "Keep factory job", "Accept shorter hours and protect stability."],
  ["use_savings_food", "Use savings for food", "Protect health, but reduce your cushion."],
  ["move_to_city", "Move closer to work", "Higher wage chance, higher rent."],
  ["take_store_credit", "Buy on store credit", "Preserve cash now, add debt later."],
  ["pull_child_school", "Older child works", "Raise income, harm education and morale."],
  ["join_mutual_aid", "Join mutual aid", "Build support, spend time and small dues."],
  ["contribute_community_pot", "Share supplies", "Help the community pot at a short-term cost."],
  ["hoard_relief", "Take extra relief", "Gain food now, but damage trust if exposed."],
  ["buy_radio_credit", "Buy a radio on credit", "Raise hope and status, add debt."],
  ["pay_down_debt", "Pay down debt", "Less exciting, more resilient."],
  ["night_school", "Night school", "Improve future job options, lose income now."],
  ["keep_cash", "Keep cash cushion", "A cautious choice in an optimistic time."],
  ["move_better_rental", "Move to better rental", "Improve health and morale, raise rent."],
  ["build_emergency_fund", "Build emergency fund", "Delay comfort, strengthen resilience."],
  ["invest_stocks", "Invest savings in stocks", "Join the boom and chase returns."],
  ["borrow_to_invest", "Borrow to invest", "Bigger upside, dangerous leverage."],
  ["undercut_wages", "Undercut wages", "Win scarce work by accepting less pay and lower trust."],
  ["sell_stocks_now", "Sell remaining stocks", "Lock in losses, preserve some cash."],
  ["withdraw_bank_cash", "Withdraw bank cash", "Protect from bank failure, feed panic."],
  ["cut_food_rent", "Cut food and rent costs", "Reduce spending, hurt health and stability."],
  ["search_any_work", "Search for any work", "Chance of income, high stress."],
  ["move_with_relatives", "Move in with relatives", "Lower rent, lower independence and hope."],
  ["keep_children_school", "Keep children in school", "Protect the future, sacrifice short-term income."],
  ["sell_possessions", "Sell possessions", "Raise cash, lower hope and comfort."],
  ["apply_public_works", "Apply for public works", "Chance of wages, physically demanding."],
  ["trust_reopened_bank", "Return cash to reopened bank", "Rebuild safety, depends on trust."],
  ["accept_relief", "Accept relief support", "Protect food and health, lower pride."],
  ["move_for_work_camp", "Send eldest to work camp", "Income and skills, family separation."],
  ["organize_neighbors", "Organize neighbors", "Mutual aid and voice, takes time."],
  ["delay_medical_care", "Delay medical care", "Preserve cash, risk health later."],
  ["stay_public_works", "Stay with public works", "Stable if available, limited advancement."],
  ["repair_health", "Spend on health", "Improve long-term survival, reduce cash."],
  ["rebuild_savings", "Rebuild savings", "Slow progress, stronger resilience."],
  ["seek_defense_work", "Seek defense work", "Move toward growing industry, but disrupt family life."],
  ["support_union", "Support union drive", "Potential wage gains, job conflict risk."],
  ["older_child_fulltime", "Older child works full-time", "Income now, education cost deepens."],
  ["inform_on_black_market", "Inform on informal trade", "Gain a short edge, but damage trust."],
  ["factory_overtime", "Take extra factory shift", "Factory household: more pay, more strain."],
  ["shopkeeper_extend_credit", "Extend customer credit", "Shopkeepers earn loyalty while tying up cash."],
  ["tenant_sell_crop_early", "Sell crop early", "Tenant farmers gain cash now but lose food security."],
  ["immigrant_english_classes", "Attend English night class", "Build standing and skills while losing income time."],
  ["railroad_follow_work", "Follow rail work", "Chase pay along the line and unsettle home."],
  ["garment_piecework_home", "Take garment piecework home", "Extra income costs schooling and morale."],
  ["service_laundry_clients", "Take laundry clients", "Side income and reputation come with exhausting hours."],
  ["miner_company_store", "Use company store credit", "Food now creates company debt later."],
  ["seasonal_follow_harvest", "Follow the harvest", "Gain food and wages while weakening stability."],
  ["seek_charity_clinic", "Seek charity clinic", "Recover health, but lose savings and hope."],
  ["send_family_to_country", "Send family to relatives", "Protect food and health, but reduce stability."],
  ["pawn_heirloom", "Pawn family heirloom", "Raise cash fast, but hurt hope."],
  ["take_desperate_work", "Take dangerous work", "Bring income and food while risking health."],
  ["sponsor_neighbor", "Sponsor a neighbor", "Build support by spending savings."],
  ["fund_training", "Fund training", "Improve education and future resilience."],
  ["final_food_surplus", "Share a stocked pantry", "Convert food surplus into trust and stability."],
  ["final_health_shift", "Take a double shift", "Use strong health to earn final income."],
  ["final_savings_invest", "Make a careful investment", "Turn cash into long-term stability."],
  ["final_hope_leadership", "Rally the neighborhood", "Use hope to lift trust and community protection."],
  ["final_education_training", "Train for skilled work", "Use education to claim better work."],
  ["final_stability_settle", "Settle the household", "Lock in resilience and reduce debt pressure."],
  ["rival_undercut_work", "Undercut rival wages", "Compete directly for scarce work."],
  ["rival_spread_bank_rumors", "Spread bank rumors", "Shake confidence around your rival's savings."],
  ["rival_call_in_debt", "Call in a private debt", "Squeeze your rival's cash cushion at a trust cost."],
  ["rival_block_relief", "Block relief access", "Use reputation pressure against your rival."],
  ["emergency_health", "Seek emergency treatment", "Prevent a health collapse at a severe financial cost."],
  ["emergency_food", "Secure emergency food", "Prevent a food collapse while losing standing."],
  ["emergency_hope", "Call the family together", "Prevent a hope collapse by spending the last cushion."],
  ["emergency_debt", "Renegotiate every debt", "Prevent debt collapse through a painful settlement."],
].map(([id, title, detail]) => [id, { title, detail }]));

const PHASE_ACTION_IDS = Object.freeze({
  postwar: ["keep_factory_job", "use_savings_food", "move_to_city", "take_store_credit", "pull_child_school", "join_mutual_aid", "contribute_community_pot"],
  recession_1921: ["use_savings_food", "take_store_credit", "move_to_city", "pull_child_school", "join_mutual_aid", "hoard_relief", "keep_factory_job"],
  early_boom: ["buy_radio_credit", "pay_down_debt", "night_school", "keep_cash", "move_better_rental", "build_emergency_fund"],
  speculation: ["invest_stocks", "borrow_to_invest", "buy_radio_credit", "pay_down_debt", "keep_cash", "night_school", "undercut_wages"],
  crash: ["sell_stocks_now", "withdraw_bank_cash", "cut_food_rent", "search_any_work", "move_with_relatives", "keep_children_school"],
  deepening: ["cut_food_rent", "search_any_work", "move_with_relatives", "keep_children_school", "sell_possessions", "join_mutual_aid", "hoard_relief"],
  bank_holiday: ["apply_public_works", "trust_reopened_bank", "accept_relief", "move_for_work_camp", "organize_neighbors", "delay_medical_care", "contribute_community_pot"],
  work_relief: ["stay_public_works", "repair_health", "organize_neighbors", "move_for_work_camp", "rebuild_savings", "trust_reopened_bank", "hoard_relief"],
  second: ["stay_public_works", "seek_defense_work", "rebuild_savings", "repair_health", "support_union", "older_child_fulltime", "undercut_wages"],
  defense_shift: ["seek_defense_work", "rebuild_savings", "repair_health", "support_union", "keep_children_school", "move_better_rental", "inform_on_black_market"],
  recovery: ["seek_defense_work", "rebuild_savings", "repair_health", "keep_children_school", "contribute_community_pot", "hoard_relief"],
  results: [],
});

const BACKGROUND_ACTIONS = Object.freeze({
  Carter: "factory_overtime", Rosen: "shopkeeper_extend_credit", Williams: "tenant_sell_crop_early",
  Novak: "immigrant_english_classes", "O'Connor": "railroad_follow_work", Bianchi: "garment_piecework_home",
  Johnson: "service_laundry_clients", Kowalski: "miner_company_store", Martinez: "seasonal_follow_harvest",
});
const BACKGROUND_PHASES = new Set(["postwar", "recession_1921", "crash", "deepening", "bank_holiday", "work_relief", "second", "defense_shift", "recovery"]);
const SABOTAGE_IDS = ["rival_undercut_work", "rival_spread_bank_rumors", "rival_call_in_debt", "rival_block_relief"];
const EXTREME_RULES = [
  ["seek_charity_clinic", "health", "lt", 25], ["send_family_to_country", "health", "lt", 25],
  ["pawn_heirloom", "savings", "lt", 20], ["take_desperate_work", "food", "lt", 20],
  ["sponsor_neighbor", "stability", "gt", 80], ["fund_training", "savings", "gt", 80],
];
const FINAL_BONUS_RULES = [
  ["final_food_surplus", "food"], ["final_health_shift", "health"], ["final_savings_invest", "savings"],
  ["final_hope_leadership", "hope"], ["final_education_training", "education"], ["final_stability_settle", "stability"],
];

function actionCard(id) {
  const copy = ACTION_COPY[id];
  return copy ? { id, ...copy, impact: ACTION_IMPACTS[id] || {} } : null;
}

function availableActionsFor({ family, phaseId, hardMode = false }) {
  if (!family || family.gameOver) return [];
  let ids = [...(PHASE_ACTION_IDS[phaseId] || [])];
  const backgroundId = BACKGROUND_PHASES.has(phaseId) ? BACKGROUND_ACTIONS[family.name] : null;
  if (backgroundId) {
    const moveIndex = ids.indexOf("move_to_city");
    if (moveIndex >= 0) ids.splice(moveIndex, 1, backgroundId);
    else if (!ids.includes(backgroundId)) ids.splice(Math.min(2, ids.length), 0, backgroundId);
  }
  const conditionalIds = [];
  if (family.collapseWarning?.emergencyChoiceId) conditionalIds.push(family.collapseWarning.emergencyChoiceId);
  if (phaseId === "recovery") {
    conditionalIds.push(...FINAL_BONUS_RULES.filter(([, metric]) => (family[metric] || 0) >= 75)
      .sort((a, b) => (family[b[1]] || 0) - (family[a[1]] || 0)).slice(0, 2).map(([id]) => id));
  }
  conditionalIds.push(...EXTREME_RULES.filter(([, metric, operator, threshold]) =>
    operator === "lt" ? (family[metric] || 0) < threshold : (family[metric] || 0) > threshold
  ).slice(0, 2).map(([id]) => id));
  if (family.employmentShock?.phaseId === phaseId) conditionalIds.unshift("accept_relief", "take_desperate_work");
  ids.push(...conditionalIds.slice(0, 4));
  if (hardMode && family.rivalId && !["postwar", "results"].includes(phaseId)) ids.push(...SABOTAGE_IDS);
  return [...new Set(ids)].map(actionCard).filter(Boolean);
}

module.exports = { ACTION_IMPACTS, PHASE_ACTION_IDS, availableActionsFor };
