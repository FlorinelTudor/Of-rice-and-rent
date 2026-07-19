import "@/App.css";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import { phaseSoundCueFor, playTabletopSound, stopTabletopSounds } from "@/tabletopSound";

const asset = (name) => `${process.env.PUBLIC_URL || ""}/depression-game/${name}`;
const MAX_PLAYERS = 8;
const PHASE_LESSONS = {
  postwar: "Work and prices can be unstable long before a national crisis arrives.",
  recession_1921: "Cash cushions matter when hours disappear.",
  early_boom: "Easy credit can create both comfort and fragility.",
  speculation: "Prosperity rewards exposure before it reveals its risks.",
  crash: "Protecting your own liquidity can still weaken collective trust.",
  deepening: "When scarcity spreads, household survival and public policy become inseparable.",
  bank_holiday: "Restoring institutions helps, but recovery reaches families unevenly.",
  work_relief: "The form of relief changes who gets a foothold.",
  second: "Pulling back too early can turn a recovery into another downturn.",
  defense_shift: "New demand creates opportunity, but never for every household at once.",
  recovery: "The resources a family protected shape what recovery feels like.",
};
const PHASE_ACTION_EFFECTS = {
  postwar: [
    ["buff", "Stable work protects the ledger", "Keeping employment gives the strongest stability gain."],
    ["debuff", "Credit carries forward", "Store credit protects food now but adds substantial debt."],
  ],
  recession_1921: [
    ["buff", "Cash cushions matter more", "Savings and steady employment soften falling hours."],
    ["debuff", "Work and relief are scarce", "Applications compete for limited town slots."],
  ],
  early_boom: [
    ["buff", "Comfort actions gain momentum", "Housing, education, and household purchases lift hope."],
    ["debuff", "Easy credit builds exposure", "Credit purchases improve life now while debt accumulates."],
  ],
  speculation: [
    ["buff", "Stock buying actions improved", "Investment choices offer their strongest savings and stock gains."],
    ["debuff", "Borrowing magnifies losses", "Leveraged investment adds heavy debt and weakens stability."],
  ],
  crash: [
    ["buff", "Liquidity actions gain value", "Selling or withdrawing can preserve part of the family cushion."],
    ["debuff", "Stock holdings collapse", "Remaining stock destroys savings when this phase resolves."],
  ],
  deepening: [
    ["buff", "Mutual aid protects stability", "Cooperative choices strengthen hope and household resilience."],
    ["debuff", "Scarcity pressure intensifies", "Work, food, and relief choices carry harsher tradeoffs."],
  ],
  bank_holiday: [
    ["buff", "Bank trust can recover", "Reopened-bank choices strongly improve trust and stability."],
    ["debuff", "Relief remains uneven", "Families still compete for limited work and assistance."],
  ],
  work_relief: [
    ["buff", "Public work improves security", "Work-relief choices restore savings, hope, and stability."],
    ["debuff", "Health costs remain costly", "Repairing health requires a meaningful savings sacrifice."],
  ],
  second: [
    ["buff", "Cash rebuilding is valuable", "Savings actions protect families against the renewed slowdown."],
    ["debuff", "Employment competition returns", "Work actions compete for fewer openings once more."],
  ],
  defense_shift: [
    ["buff", "Factory work gains momentum", "Defense employment offers strong savings and hope gains."],
    ["debuff", "Moving still disrupts home", "Following new work can reduce household stability."],
  ],
  recovery: [
    ["buff", "High meters unlock bonuses", "Strong family ledgers reveal special final actions."],
    ["debuff", "Final tradeoffs still count", "Debt, danger, and trust penalties remain in the final score."],
  ],
};
const GAME_STATE_VERSION = "blob-multiplayer-v2";
const COOPERATIVE_CHOICES = new Set(["join_mutual_aid", "organize_neighbors", "support_union", "sponsor_neighbor", "contribute_community_pot", "shopkeeper_extend_credit"]);
const SABOTAGE_CHOICE_IDS = ["rival_undercut_work", "rival_spread_bank_rumors", "rival_call_in_debt", "rival_block_relief"];
const BETRAYAL_CHOICES = new Set(["hoard_relief", "undercut_wages", "inform_on_black_market", ...SABOTAGE_CHOICE_IDS]);
const RIVAL_WINDOW_PHASES = new Set(["speculation", "deepening"]);
const RISK_CHOICES = new Set(["invest_stocks", "borrow_to_invest", "move_to_city", "withdraw_bank_cash", "search_any_work", "move_for_work_camp", "seek_defense_work", "support_union", "take_desperate_work", "undercut_wages", "inform_on_black_market", "railroad_follow_work", "miner_company_store", "seasonal_follow_harvest", ...SABOTAGE_CHOICE_IDS]);
const WORK_CHOICES = new Set(["keep_factory_job", "search_any_work", "apply_public_works", "stay_public_works", "seek_defense_work", "take_desperate_work", "older_child_fulltime", "final_education_training", "final_health_shift", "undercut_wages", "factory_overtime", "railroad_follow_work", "garment_piecework_home", "service_laundry_clients", "seasonal_follow_harvest"]);
const WORK_OR_RELIEF_CHOICES = new Set(["keep_factory_job", "search_any_work", "apply_public_works", "stay_public_works", "seek_defense_work", "take_desperate_work", "older_child_fulltime", "accept_relief", "seek_charity_clinic", "hoard_relief", "factory_overtime", "railroad_follow_work", "garment_piecework_home", "service_laundry_clients", "miner_company_store", "seasonal_follow_harvest"]);
const MOBILITY_CHOICES = new Set(["move_to_city", "move_with_relatives", "move_for_work_camp", "seek_defense_work", "railroad_follow_work", "seasonal_follow_harvest"]);
const SKILL_CHOICES = new Set(["night_school", "fund_training", "immigrant_english_classes"]);
const FAMILY_PORTRAITS = {
  Carter: "family-carter-factory.png",
  Rosen: "family-rosen-shopkeepers.png",
  Williams: "family-williams-farm.png",
  Novak: "family-novak-immigrant.png",
  "O'Connor": "family-oconnor-railroad.png",
  Bianchi: "family-bianchi-garment.png",
  Johnson: "family-johnson-service.png",
  Kowalski: "family-kowalski-mining.png",
  Martinez: "family-martinez-seasonal.png",
};
const DANGER_PORTRAITS = {
  food: "family-food-crisis.png",
  health: "family-health-crisis.png",
  savings: "family-savings-crisis.png",
  hope: "family-hope-crisis.png",
  education: "family-education-crisis.png",
  stability: "family-stability-crisis.png",
  debt: "family-savings-crisis.png",
};
const ACTION_CARD_ART = {
  factory_overtime: "action-factory-overtime.png",
  shopkeeper_extend_credit: "action-shopkeeper-extend-credit.png",
  tenant_sell_crop_early: "action-tenant-sell-crop-early.png",
  immigrant_english_classes: "action-immigrant-english-classes.png",
  railroad_follow_work: "action-railroad-follow-work.png",
  garment_piecework_home: "action-garment-piecework-home.png",
  service_laundry_clients: "action-service-laundry-clients.png",
  miner_company_store: "action-miner-company-store.png",
  seasonal_follow_harvest: "action-seasonal-follow-harvest.png",
  accept_relief: "action-accept-relief.png",
  borrow_to_invest: "action-borrow-to-invest.png",
  build_emergency_fund: "action-build-emergency-fund.png",
  buy_radio_credit: "action-buy-radio-credit.png",
  cut_food_rent: "action-cut-food-rent.png",
  delay_medical_care: "action-delay-medical-care.png",
  emergency_debt: "action-emergency-debt.png",
  emergency_health: "action-emergency-health.png",
  emergency_hope: "action-emergency-hope.png",
  final_education_training: "action-final-education-training.png",
  final_food_surplus: "action-final-food-surplus.png",
  final_health_shift: "action-final-health-shift.png",
  final_hope_leadership: "action-final-hope-leadership.png",
  final_savings_invest: "action-final-savings-invest.png",
  final_stability_settle: "action-final-stability-settle.png",
  fund_training: "action-fund-training.png",
  inform_on_black_market: "action-inform-on-black-market.png",
  keep_cash: "action-keep-cash.png",
  keep_factory_job: "action-keep-factory-job.png",
  move_better_rental: "action-move-better-rental.png",
  move_to_city: "action-move-to-city.png",
  move_with_relatives: "action-move-with-relatives.png",
  night_school: "action-night-school.png",
  older_child_fulltime: "action-older-child-fulltime.png",
  organize_neighbors: "action-organize-neighbors.png",
  pawn_heirloom: "action-pawn-heirloom.png",
  pull_child_school: "action-pull-child-school.png",
  rebuild_savings: "action-rebuild-savings.png",
  repair_health: "action-repair-health.png",
  seek_charity_clinic: "action-seek-charity-clinic.png",
  seek_defense_work: "action-seek-defense-work.png",
  sell_possessions: "action-sell-possessions.png",
  sell_stocks_now: "action-sell-stocks-now.png",
  send_family_to_country: "action-send-family-to-country.png",
  sponsor_neighbor: "action-sponsor-neighbor.png",
  stay_public_works: "action-stay-public-works.png",
  support_union: "action-support-union.png",
  take_desperate_work: "action-take-desperate-work.png",
  trust_reopened_bank: "action-trust-reopened-bank.png",
  withdraw_bank_cash: "action-withdraw-bank-cash.png",
  invest_stocks: "action-invest-stocks.png",
  undercut_wages: "action-undercut-wages.png",
  hoard_relief: "action-hoard-relief.png",
  contribute_community_pot: "action-contribute-community-pot.png",
  search_any_work: "action-search-any-work.png",
  apply_public_works: "action-apply-public-works.png",
  take_store_credit: "action-take-store-credit.png",
  pay_down_debt: "action-pay-down-debt.png",
  join_mutual_aid: "action-join-mutual-aid.png",
  move_for_work_camp: "action-move-for-work-camp.png",
  emergency_food: "action-emergency-food.png",
  keep_children_school: "action-keep-children-school.png",
  use_savings_food: "action-use-savings-food.png",
  rival_undercut_work: "action-rival-undercut-work.png",
  rival_spread_bank_rumors: "action-rival-spread-bank-rumors.png",
  rival_call_in_debt: "action-rival-call-in-debt.png",
  rival_block_relief: "action-rival-block-relief.png",
};
const ACTION_CARD_ART_BY_ERA = {
  boom: {
    buy_radio_credit: "action-buy-radio-credit-boom-v2.png",
    build_emergency_fund: "action-build-emergency-fund-boom-v2.png",
    night_school: "action-night-school-boom-v2.png",
    keep_cash: "action-keep-cash-boom-v2.png",
    invest_stocks: "action-invest-stocks-boom-v2.png",
    borrow_to_invest: "action-borrow-to-invest-boom-v2.png",
  },
  bust: {
    sell_stocks_now: "action-sell-stocks-now-bust-v2.png",
    search_any_work: "action-search-any-work-bust-v2.png",
    cut_food_rent: "action-cut-food-rent-bust-v2.png",
    join_mutual_aid: "action-join-mutual-aid-bust-v2.png",
    apply_public_works: "action-apply-public-works-bust-v2.png",
    accept_relief: "action-accept-relief-bust-v2.png",
  },
};
const ACTION_METRIC_LABELS = {
  bankTrust: "Bank trust",
  debt: "Debt",
  education: "Education",
  food: "Food",
  health: "Health",
  hope: "Hope",
  reputation: "Trust",
  savings: "Savings",
  stability: "Stability",
  stock: "Stock",
};
const SCENARIO_OPTIONS = [
  {
    id: "easy_credit",
    title: "Easy Credit",
    detail: "Comfort comes easily. Debt bites later.",
  },
  {
    id: "harsh_winter",
    title: "Harsh Winter",
    detail: "Food and health pressure hit harder.",
  },
  {
    id: "bank_panic",
    title: "Bank Panic",
    detail: "Trust, cash, and timing matter most.",
  },
  {
    id: "relief_politics",
    title: "Relief Politics",
    detail: "Public help grows, but access is uneven.",
  },
];

const HISTORICAL_BACKGROUND_STANDINGS = {
  Carter: {
    cohort: "urban industrial wage families",
    context: "Industrial output fell sharply and roughly a quarter of workers were unemployed at the worst point, so steady work and household stability were rare advantages.",
    strengths: ["stability", "savings", "education"],
    risks: ["debt", "health", "hope"],
  },
  Rosen: {
    cohort: "Main Street merchant families",
    context: "Small shops faced collapsing demand, cautious banks, and customers buying on credit; staying solvent required both cash discipline and community trust.",
    strengths: ["savings", "reputation", "stability"],
    risks: ["debt", "bankTrust", "hope"],
  },
  Williams: {
    cohort: "tenant farm families",
    context: "Farm prices fell heavily and farm foreclosures surged, so food security, debt control, and mobility mattered more than comfort.",
    strengths: ["food", "health", "stability"],
    risks: ["debt", "savings", "hope"],
  },
  Novak: {
    cohort: "new arrival immigrant families",
    context: "Immigrant households faced job competition, language barriers, and in some communities repatriation pressure; education and local standing were powerful buffers.",
    strengths: ["education", "reputation", "stability"],
    risks: ["savings", "debt", "hope"],
  },
  "O'Connor": {
    cohort: "rail and transport families",
    context: "Transport work followed the wider industrial slump, so mobility helped only when health and home stability survived the strain.",
    strengths: ["health", "stability", "savings"],
    risks: ["debt", "hope", "food"],
  },
  Bianchi: {
    cohort: "urban garment worker families",
    context: "Garment households often relied on long hours, piecework, and neighborhood ties; solidarity and schooling could protect the next step up.",
    strengths: ["hope", "education", "reputation"],
    risks: ["health", "savings", "stability"],
  },
  Johnson: {
    cohort: "Black urban service families",
    context: "Discriminatory labor markets and uneven relief access made stability and respect harder to secure, even when work effort was strong.",
    strengths: ["reputation", "stability", "education"],
    risks: ["savings", "food", "debt"],
  },
  Kowalski: {
    cohort: "coal town mining families",
    context: "Mining families faced dangerous work, company-town debt, and severe local unemployment; health and debt control shaped survival.",
    strengths: ["health", "food", "reputation"],
    risks: ["debt", "stability", "hope"],
  },
  Martinez: {
    cohort: "seasonal farm labor families",
    context: "Seasonal laborers faced irregular harvest work, low crop prices, and fragile housing; mobility helped only if food and health held up.",
    strengths: ["food", "health", "stability"],
    risks: ["savings", "education", "debt"],
  },
};

const phases = [
  {
    id: "postwar",
    years: "1919-1920",
    title: "Coming Home to a Changed Economy",
    image: "postwar-market-conditions.png",
    newsImage: "01-troops-return.png",
    news: "War orders end as prices swing",
    summary: "Factories lose wartime orders while families face high prices, uncertain hours, and a peacetime economy still finding its footing.",
    conditions: [["Jobs", "Unstable", "warn"], ["Prices", "Volatile", "warn"], ["Bank trust", "Steady", "good"], ["Credit", "Cautious", "neutral"]],
    choices: [
      ["keep_factory_job", "Keep factory job", "Accept shorter hours and protect stability."],
      ["use_savings_food", "Use savings for food", "Protect health, but reduce your cushion."],
      ["move_to_city", "Move closer to work", "Higher wage chance, higher rent."],
      ["take_store_credit", "Buy on store credit", "Preserve cash now, add debt later."],
      ["pull_child_school", "Older child works", "Raise income, harm education and morale."],
      ["join_mutual_aid", "Join mutual aid", "Build support, spend time and small dues."],
      ["contribute_community_pot", "Share supplies", "Help the community pot at a short-term cost."],
    ],
  },
  {
    id: "recession_1921",
    years: "1920-1921",
    title: "Short Recession and Hard Choices",
    image: "recession-1921-market.png",
    newsImage: "news-postwar.png",
    news: "Factory hours fall as buyers pull back",
    summary: "A sharp downturn cuts hours and demand. Families must decide whether to protect cash, health, schooling, or mobility.",
    conditions: [["Jobs", "Falling", "bad"], ["Prices", "Still high", "warn"], ["Credit", "Careful", "neutral"], ["Relief", "Mostly local", "warn"]],
    choices: [
      ["use_savings_food", "Use savings for food", "Protect health, but reduce your cushion."],
      ["take_store_credit", "Buy on store credit", "Preserve cash now, add debt later."],
      ["move_to_city", "Move closer to work", "Higher wage chance, higher rent."],
      ["pull_child_school", "Older child works", "Raise income, harm education and morale."],
      ["join_mutual_aid", "Join mutual aid", "Build support, spend time and small dues."],
      ["hoard_relief", "Take extra relief", "Gain food now, but damage trust if exposed."],
      ["keep_factory_job", "Stay with current employer", "Accept shorter hours and protect stability."],
    ],
  },
  {
    id: "early_boom",
    years: "1922-1924",
    title: "New Confidence",
    image: "roaring-twenties-market.png",
    newsImage: "news-boom.png",
    news: "Factories hum and credit expands",
    summary: "Work becomes steadier and modern goods feel newly reachable. Credit starts to look like a normal part of family progress.",
    conditions: [["Confidence", "High", "good"], ["Credit", "Easy", "good"], ["Wages", "Improving", "good"], ["Risk", "Easy to ignore", "warn"]],
    choices: [
      ["buy_radio_credit", "Buy a radio on credit", "Raise hope and status, add debt."],
      ["pay_down_debt", "Pay down debt", "Less exciting, more resilient."],
      ["night_school", "Night school", "Improve future job options, lose income now."],
      ["keep_cash", "Keep cash cushion", "A cautious choice in an optimistic time."],
      ["move_better_rental", "Move to better rental", "Improve health and morale, raise rent."],
      ["build_emergency_fund", "Build emergency fund", "Delay comfort, strengthen resilience."],
    ],
  },
  {
    id: "speculation",
    years: "1925-1928",
    title: "Easy Money and Big Promises",
    image: "speculation-market.png",
    newsImage: "02-credit-sales.png",
    news: "Credit boom lifts Main Street",
    summary: "Stocks, installment plans, and confident headlines make the future feel expandable. Families choose how far to lean in.",
    conditions: [["Stocks", "Rising", "good"], ["Credit", "Very easy", "good"], ["Confidence", "Bright", "good"], ["Risk", "Hidden", "warn"]],
    choices: [
      ["invest_stocks", "Invest savings in stocks", "Join the boom and chase returns."],
      ["borrow_to_invest", "Borrow to invest", "Bigger upside, dangerous leverage."],
      ["buy_radio_credit", "Upgrade household goods", "Raise hope and status, add debt."],
      ["pay_down_debt", "Pay down debt", "Less exciting, more resilient."],
      ["keep_cash", "Keep cash cushion", "A cautious choice in an optimistic time."],
      ["night_school", "Invest in skills", "Improve future job options, lose income now."],
      ["undercut_wages", "Undercut wages", "Win scarce work by accepting less pay and lower trust."],
    ],
  },
  {
    id: "crash",
    years: "1929",
    title: "A Sudden Break",
    image: "crash-market-pressure.png",
    newsImage: "03-market-break.png",
    news: "Market falls as bank fears spread",
    summary: "Stocks plunge and confidence turns quickly. Families with savings, debt, or stock exposure must decide what to protect first.",
    conditions: [["Stocks", "Falling", "bad"], ["Bank confidence", "Falling", "bad"], ["Credit", "Tight", "bad"], ["Jobs", "At risk", "warn"]],
    choices: [
      ["sell_stocks_now", "Sell remaining stocks", "Lock in losses, preserve some cash."],
      ["withdraw_bank_cash", "Withdraw bank cash", "Protect from bank failure, feed panic."],
      ["cut_food_rent", "Cut food and rent costs", "Reduce spending, hurt health and stability."],
      ["search_any_work", "Search for any work", "Chance of income, high stress."],
      ["move_with_relatives", "Move in with relatives", "Lower rent, lower independence and hope."],
      ["keep_children_school", "Keep children in school", "Protect future, sacrifice short-term income."],
    ],
  },
  {
    id: "deepening",
    years: "1930-1932",
    title: "Jobs Vanish and Banks Strain",
    image: "deepening-market.png",
    newsImage: "news-crash.png",
    news: "Job losses spread across towns",
    summary: "The shock becomes a long emergency. Local relief, family networks, and painful cuts become part of survival.",
    conditions: [["Unemployment", "Severe", "bad"], ["Bank confidence", "Low", "bad"], ["Food security", "Fragile", "bad"], ["Relief", "Local/private", "warn"]],
    choices: [
      ["cut_food_rent", "Cut food and rent costs", "Reduce spending, hurt health and stability."],
      ["search_any_work", "Search for any work", "Chance of income, high stress."],
      ["move_with_relatives", "Move in with relatives", "Lower rent, lower independence and hope."],
      ["keep_children_school", "Keep children in school", "Protect future, sacrifice short-term income."],
      ["sell_possessions", "Sell possessions", "Raise cash, lower hope and comfort."],
      ["join_mutual_aid", "Lean on mutual aid", "Build support, spend time and small dues."],
      ["hoard_relief", "Take extra relief", "Gain food now, but damage trust if exposed."],
    ],
  },
  {
    id: "bank_holiday",
    years: "1933",
    title: "Banks Reopen and Relief Begins",
    image: "new-deal-market-conditions.png",
    newsImage: "04-banks-reopen.png",
    news: "Banks reopen as work programs begin",
    summary: "Bank reforms and relief agencies change the options available to families, but trust has to be rebuilt.",
    conditions: [["Unemployment", "Severe", "bad"], ["Bank confidence", "Stabilizing", "good"], ["Credit", "Cautious", "neutral"], ["Relief", "Expanding", "good"]],
    choices: [
      ["apply_public_works", "Apply for public works", "Chance of wages, physically demanding."],
      ["trust_reopened_bank", "Return cash to reopened bank", "Rebuild safety, depends on trust."],
      ["accept_relief", "Accept relief support", "Protect food and health, lower pride."],
      ["move_for_work_camp", "Send eldest to work camp", "Income and skills, family separation."],
      ["organize_neighbors", "Organize neighbors", "Mutual aid and voice, takes time."],
      ["delay_medical_care", "Delay medical care", "Preserve cash, risk health later."],
      ["contribute_community_pot", "Share relief supplies", "Strengthen the community pot and your reputation."],
    ],
  },
  {
    id: "work_relief",
    years: "1934-1936",
    title: "Work Relief and Uneven Hope",
    image: "work-relief-market.png",
    newsImage: "news-newdeal.png",
    news: "Work projects spread to more towns",
    summary: "Public works, local politics, and family pride all shape who gets help and how secure that help feels.",
    conditions: [["Jobs", "Partly restored", "warn"], ["Relief", "Expanding", "good"], ["Wages", "Uneven", "warn"], ["Hope", "Recovering", "good"]],
    choices: [
      ["stay_public_works", "Stay with public works", "Stable if available, limited advancement."],
      ["repair_health", "Spend on health", "Improve long-term survival, reduce cash."],
      ["organize_neighbors", "Organize neighbors", "Mutual aid and voice, takes time."],
      ["move_for_work_camp", "Send eldest to work camp", "Income and skills, family separation."],
      ["rebuild_savings", "Rebuild savings", "Slow progress, stronger resilience."],
      ["trust_reopened_bank", "Trust the reopened bank", "Rebuild safety, depends on trust."],
      ["hoard_relief", "Take extra relief", "Gain food now, but damage trust if exposed."],
    ],
  },
  {
    id: "second",
    years: "1937-1938",
    title: "Recovery Stumbles",
    image: "recovery-stumbles-market.png",
    newsImage: "05-recovery-stalls.png",
    news: "Recovery slows as jobless rise again",
    summary: "Policy changes, business caution, and weak demand contribute to another downturn.",
    conditions: [["Unemployment", "Rising again", "bad"], ["Bank confidence", "Improved", "good"], ["Credit", "Cautious", "neutral"], ["Relief", "Contested", "warn"]],
    choices: [
      ["stay_public_works", "Stay with public works", "Stable if available, limited advancement."],
      ["seek_defense_work", "Seek defense work", "Risky move toward growing industry."],
      ["rebuild_savings", "Rebuild savings", "Slow progress, stronger resilience."],
      ["repair_health", "Spend on health", "Improve long-term survival, reduce cash."],
      ["support_union", "Support union drive", "Potential wage gains, job conflict risk."],
      ["older_child_fulltime", "Older child works full-time", "Income now, education cost deepens."],
      ["undercut_wages", "Undercut wages", "Win scarce work by accepting less pay and lower trust."],
    ],
  },
  {
    id: "defense_shift",
    years: "1939-1940",
    title: "Factories Turn Toward New Orders",
    image: "defense-shift-market.png",
    newsImage: "news-recovery.png",
    news: "Factories prepare for new orders",
    summary: "Industrial demand begins to shift. Families must decide whether to move toward new work or keep rebuilding carefully.",
    conditions: [["Factory demand", "Rising", "good"], ["Unemployment", "Improving", "good"], ["Savings", "Thin", "warn"], ["Stability", "Possible", "good"]],
    choices: [
      ["seek_defense_work", "Seek defense work", "Risky move toward growing industry."],
      ["rebuild_savings", "Rebuild savings", "Slow progress, stronger resilience."],
      ["repair_health", "Spend on health", "Improve long-term survival, reduce cash."],
      ["support_union", "Support union drive", "Potential wage gains, job conflict risk."],
      ["keep_children_school", "Keep children in school", "Protect future, sacrifice short-term income."],
      ["move_better_rental", "Move to safer housing", "Improve health and morale, raise rent."],
      ["inform_on_black_market", "Inform on informal trade", "Gain a short edge, but take an exploit penalty."],
    ],
  },
  {
    id: "recovery",
    years: "1941-1942",
    title: "Recovery and Mobilization",
    image: "final-recovery-market.png",
    newsImage: "06-war-declared.png",
    news: "Factories hire as orders surge",
    summary: "The long crisis gives way to mobilization, though not every family recovers equally.",
    conditions: [["Unemployment", "Falling", "good"], ["Bank confidence", "Recovering", "good"], ["Savings", "Rebuilding", "good"], ["Public support", "Shifting", "neutral"]],
    choices: [
      ["seek_defense_work", "Take wartime factory work", "A final push for income and hope, with family disruption risk."],
      ["rebuild_savings", "Rebuild the family cushion", "Lock in resilience before the final score."],
      ["repair_health", "Pay overdue health costs", "Strengthen survival, but spend scarce cash."],
      ["keep_children_school", "Keep children in school", "Protect the next generation, even now."],
      ["contribute_community_pot", "Share with the town", "Help the community pot and reputation at a personal cost."],
      ["hoard_relief", "Grab extra relief", "A hard competitive edge that hurts trust if exposed."],
    ],
  },
  {
    id: "results",
    years: "After 1942",
    title: "Family Ledgers and Historical Debrief",
    image: "final-results-ledgers.png",
    newsImage: null,
    news: "Families compare outcomes and choices",
    summary: "The game ends by comparing survival scores, awards, hidden objectives, and the historical patterns your room created together.",
    conditions: [["Final scores", "Ready", "good"], ["Awards", "Ready", "good"], ["Debrief", "Discuss aloud", "neutral"], ["Rematch", "Optional", "warn"]],
    choices: [],
  },
];

function familyImageFor(family) {
  if (!family) return "family-profile.png";
  const dangerMetric = [
    ["food", family.food ?? 100, 25],
    ["health", family.health ?? 100, 25],
    ["savings", family.savings ?? 100, 25],
    ["hope", family.hope ?? 100, 25],
    ["education", family.education ?? 100, 25],
    ["stability", family.stability ?? 100, 25],
    ["debt", 100 - (family.debt ?? 0), 15],
  ]
    .filter(([, value, dangerLine]) => value < dangerLine)
    .sort((a, b) => a[1] / a[2] - b[1] / b[2])[0]?.[0];
  if (dangerMetric) return DANGER_PORTRAITS[dangerMetric] || "family-danger-state.png";
  return FAMILY_PORTRAITS[family.name] || "family-profile.png";
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFamily(family) {
  const core = (family.food + family.health + family.savings + family.hope + family.education + family.stability) / 6;
  const debtPenalty = family.debt * 0.28;
  const reputationBonus = ((family.reputation ?? 50) - 50) * 0.22;
  const exploitPenalty = (family.exploitMarkers || 0) * 5;
  const sabotagePenalty = (family.sabotageHistory || []).length * 2;
  const gameOverPenalty = family.gameOver ? 25 : 0;
  const rushedPenalty = (family.rushedChoiceCount || 0) * 2;
  const patternPenalty = family.patternPenalty || 0;
  const communityMemoryPenalty = (family.communityMemoryHits || 0) * 3;
  const dangerPenalty = dangerPenaltyFor(family);
  const resilienceBonus = dangerPenalty === 0 ? 6 : 0;
  return clamp(
    core -
      debtPenalty -
      dangerPenalty -
      exploitPenalty -
      sabotagePenalty -
      gameOverPenalty -
      rushedPenalty -
      patternPenalty -
      communityMemoryPenalty +
      reputationBonus +
      resilienceBonus +
      objectiveResult(family).bonus
  );
}

function dangerPenaltyFor(family) {
  const dangerMeters = ["minFood", "minHealth", "minHope", "minEducation", "minStability", "minSavings"];
  return dangerMeters.reduce((sum, key) => {
    const value = family[key] ?? 100;
    if (value < 10) return sum + 18;
    if (value < 25) return sum + 10;
    if (value < 35) return sum + 4;
    return sum;
  }, 0);
}

function scoreNotes(family) {
  const notes = [];
  if ((family.rushedChoiceCount || 0) > 0) notes.push(`${family.rushedChoiceCount} rushed`);
  if ((family.patternPenalty || 0) > 0) notes.push(`${family.patternPenalty} predictable play`);
  if ((family.communityMemoryHits || 0) > 0) notes.push(`${family.communityMemoryHits} trust exclusion`);
  if ((family.exploitMarkers || 0) > 0) notes.push(`${family.exploitMarkers} exploit markers`);
  if ((family.sabotageHistory || []).length > 0) notes.push(`${family.sabotageHistory.length} rival attacks made`);
  if ((family.rivalHistory || []).length > 0) notes.push(`${family.rivalHistory.length} rival nomination${family.rivalHistory.length > 1 ? "s" : ""}`);
  if (family.gameOver) notes.push("collapse penalty");
  if (objectiveResult(family).completed) notes.push("+10 objective");
  return notes;
}

function scoreBreakdown(family) {
  const objective = objectiveResult(family);
  const base = Math.round((family.food + family.health + family.savings + family.hope + family.education + family.stability) / 6);
  const dangerPenalty = dangerPenaltyFor(family);
  const reputationBonus = Math.round(((family.reputation ?? 50) - 50) * 0.22);
  const parts = [`meters ${base}`, `debt -${Math.round(family.debt * 0.28)}`];
  if (dangerPenalty) parts.push(`danger lows -${dangerPenalty}`);
  if (reputationBonus) parts.push(`trust ${reputationBonus > 0 ? "+" : ""}${reputationBonus}`);
  if (family.exploitMarkers) parts.push(`betrayal -${family.exploitMarkers * 5}`);
  if (family.sabotageHistory?.length) parts.push(`rival attacks -${family.sabotageHistory.length * 2}`);
  if (family.rushedChoiceCount) parts.push(`rushed -${family.rushedChoiceCount * 2}`);
  if (family.patternPenalty) parts.push(`predictable play -${family.patternPenalty}`);
  if (family.communityMemoryHits) parts.push(`community exclusion -${family.communityMemoryHits * 3}`);
  if (family.gameOver) parts.push("collapse -25");
  if (!dangerPenalty) parts.push("no danger lows +6");
  if (objective.completed) parts.push("objective +10");
  return parts.join(" · ");
}

function familyOutcomeSummary(family) {
  const strengths = ["food", "health", "savings", "hope", "education", "stability"]
    .map((key) => [key, Number(family[key] || 0)])
    .sort(([, left], [, right]) => right - left);
  const [bestMetric, bestValue] = strengths[0];
  const costs = [];
  if (family.gameOver) costs.push("collapse ended the family campaign early");
  else if (family.debt >= 60) costs.push(`debt reached ${family.debt}`);
  else if (dangerPenaltyFor(family)) costs.push("dangerously low meters reduced the score");
  if (family.exploitMarkers) costs.push(`${family.exploitMarkers} exploit marker${family.exploitMarkers === 1 ? "" : "s"} hurt trust`);
  if (family.rushedChoiceCount) costs.push(`${family.rushedChoiceCount} rushed choice${family.rushedChoiceCount === 1 ? "" : "s"} weakened gains`);
  return {
    strength: `What kept them afloat: ${ACTION_METRIC_LABELS[bestMetric] || bestMetric} finished at ${bestValue}.`,
    cost: costs.length ? `What cost them: ${costs.join("; ")}.` : "What cost them: no major score penalty was recorded.",
  };
}

function metricStandingValue(family, key) {
  if (key === "debt") return 100 - (family.debt ?? 0);
  if (key === "bankTrust") return family.bankTrust ?? 50;
  if (key === "reputation") return family.reputation ?? 50;
  return family[key] ?? 50;
}

function metricLabel(key) {
  return ACTION_METRIC_LABELS[key] || key;
}

function ordinalPercentile(value) {
  const n = Math.max(1, Math.min(99, Math.round(value)));
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function historicalBand(percentile) {
  if (percentile >= 90) return "top 10%";
  if (percentile >= 75) return "top quarter";
  if (percentile >= 55) return "above the middle";
  if (percentile >= 35) return "near the middle";
  if (percentile >= 20) return "lower quarter";
  return "bottom fifth";
}

function historicalStandingFor(family) {
  const benchmark = HISTORICAL_BACKGROUND_STANDINGS[family.name] || {
    cohort: "comparable families",
    context: "Families with similar work and savings positions faced very different outcomes depending on debt, health, food, trust, and timing.",
    strengths: ["stability", "savings", "hope"],
    risks: ["debt", "food", "health"],
  };
  const score = typeof family.score === "number" ? family.score : scoreFamily(family);
  const objective = objectiveResult(family);
  const hardshipCredit = Math.min(7, Math.max(0, startingHardship(family) - 35) * 0.14);
  const dangerDrag = lowestRecordedMeter(family) < 25 ? 4 : 0;
  const percentile = Math.max(
    1,
    Math.min(
      99,
      Math.round(5 + score * 0.82 + hardshipCredit + (objective.completed ? 6 : -2) - (family.gameOver ? 12 : 0) - dangerDrag)
    )
  );
  const bestStrength = [...benchmark.strengths].sort((a, b) => metricStandingValue(family, b) - metricStandingValue(family, a))[0];
  const weakestRisk = [...benchmark.risks].sort((a, b) => metricStandingValue(family, a) - metricStandingValue(family, b))[0];
  const bestLabel = metricLabel(bestStrength).toLowerCase();
  const weakLabel = metricLabel(weakestRisk).toLowerCase();
  const driver =
    percentile >= 75
      ? `Their ${bestLabel} put them ahead of most comparable households.`
      : percentile <= 35
        ? `Their ${weakLabel} kept them close to the hardest-hit households.`
        : `They landed in the contested middle: ${bestLabel} helped, but ${weakLabel} still held them back.`;
  return {
    percentile,
    percentileLabel: ordinalPercentile(percentile),
    band: historicalBand(percentile),
    cohort: benchmark.cohort,
    context: benchmark.context,
    driver,
  };
}

function flattenChoices(family) {
  return Object.values(family.choices || {}).flat();
}

function countChoices(family, choiceSet) {
  return flattenChoices(family).filter((choice) => choiceSet.has(choice)).length;
}

function choiceTone(choiceId) {
  if (choiceId.startsWith("emergency_")) return "emergency";
  if (choiceId.startsWith("final_")) return "bonus";
  if (SABOTAGE_CHOICE_IDS.includes(choiceId)) return "sabotage";
  if (choiceId === "contribute_community_pot" || COOPERATIVE_CHOICES.has(choiceId)) return "cooperate";
  if (BETRAYAL_CHOICES.has(choiceId)) return "betray";
  return "neutral";
}

function choiceEraForPhase(phaseId) {
  if (["early_boom", "speculation"].includes(phaseId)) return "boom";
  if (["recession_1921", "crash", "deepening", "bank_holiday", "second"].includes(phaseId)) return "bust";
  if (["work_relief", "defense_shift", "recovery"].includes(phaseId)) return "recovery";
  return "neutral";
}

function actionCardArtFor(choiceId, phaseId) {
  const era = choiceEraForPhase(phaseId);
  return ACTION_CARD_ART_BY_ERA[era]?.[choiceId] || ACTION_CARD_ART[choiceId];
}

function choiceGridShape(count) {
  if (count <= 4) return { columns: Math.max(1, count), rows: 1, layout: "wide" };
  if (count <= 8) return { columns: 4, rows: 2, layout: "standard" };
  return { columns: 5, rows: Math.ceil(count / 5), layout: "dense" };
}

function choiceImpactChips(choiceId, actionImpacts) {
  const impact = actionImpacts[choiceId];
  if (!impact) return [];
  return Object.entries(impact).map(([key, value]) => {
    const isBenefit = key === "debt" ? value < 0 : value > 0;
    const sign = value > 0 ? "+" : "-";
    return {
      key,
      tone: isBenefit ? "buff" : "debuff",
      label: `${sign} ${ACTION_METRIC_LABELS[key] || key} ${Math.abs(value)}`,
    };
  });
}

function consequencePreviewFor(family, choices, phaseStartedAt) {
  if (!family || !choices.length) return [];
  const warnings = [];
  const elapsedMs = Date.now() - Date.parse(phaseStartedAt || 0);
  if (Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < 5000) warnings.push("Rushed choices reduce positive gains");
  if (choices.some((choice) => (family.choiceRepeatCounts?.[choice] || 0) >= 3)) warnings.push("Repeated action reduces this round's gains");
  if (choices.some((choice) => BETRAYAL_CHOICES.has(choice))) warnings.push("Betrayal weakens trust and can leave exploit markers");
  if (family.communityMemoryHits) warnings.push("Community memory may limit shared protection");
  return warnings;
}

function objectiveResult(family) {
  const choices = flattenChoices(family);
  const usedMigrationPath = choices.some((choice) => MOBILITY_CHOICES.has(choice));
  const workReliefCount = countChoices(family, WORK_OR_RELIEF_CHOICES);
  const mobilityWorkCount = countChoices(family, new Set([...MOBILITY_CHOICES, ...WORK_OR_RELIEF_CHOICES]));
  const communityCount = countChoices(family, COOPERATIVE_CHOICES);
  const skillCount = countChoices(family, SKILL_CHOICES);
  const trust = family.reputation ?? 50;
  const objectiveChecks = {
    industrial_stability: family.stability >= 60 && trust >= 45,
    industrial_emergency_fund: family.savings >= 50 && family.debt <= 55,
    industrial_skill_path: family.education >= 65 || skillCount >= 1,
    shopkeeper_debt: family.debt <= 45 && family.hope >= 45,
    shopkeeper_trust: trust >= 65 && family.debt <= 60,
    shopkeeper_cash: family.savings >= 55,
    tenant_food: family.food >= 50 || usedMigrationPath,
    tenant_health: family.health >= 55 && family.food >= 45,
    tenant_mobility: mobilityWorkCount >= 2 && family.hope >= 45,
    immigrant_trust: trust >= 65 || family.education >= 60,
    immigrant_schooling: family.education >= 68,
    immigrant_savings: family.savings >= 45 && family.stability >= 50,
    railroad_mobility: workReliefCount >= 2 && family.health >= 45,
    railroad_health: family.health >= 58,
    railroad_cash: family.savings >= 50 && family.stability >= 50,
    garment_solidarity: communityCount >= 2 && family.hope >= 55,
    garment_education: family.education >= 65 && family.hope >= 45,
    garment_trust: trust >= 65,
    service_respect: family.stability >= 50 && trust >= 60,
    service_schooling: family.education >= 62 && family.hope >= 45,
    service_stability: family.stability >= 58,
    miner_health: family.health >= 45 && family.debt <= 55,
    miner_union: communityCount >= 2 && trust >= 55,
    miner_food: family.food >= 55,
    seasonal_work: family.food >= 45 && workReliefCount >= 2,
    seasonal_mobility: mobilityWorkCount >= 2 && family.stability >= 40,
    seasonal_health: family.health >= 55 && family.food >= 45,
  };
  const completed = Boolean(objectiveChecks[family.objectiveId]);
  return { completed, bonus: completed ? 10 : 0 };
}

function lowestRecordedMeter(family) {
  return Math.min(
    family.minFood ?? family.food ?? 100,
    family.minHealth ?? family.health ?? 100,
    family.minHope ?? family.hope ?? 100,
    family.minEducation ?? family.education ?? 100,
    family.minStability ?? family.stability ?? 100,
    family.minSavings ?? family.savings ?? 100
  );
}

function startingHardship(family) {
  if (typeof family.initialHardship === "number") return family.initialHardship;
  const baseline = ["food", "health", "savings", "hope", "education", "stability"].reduce((sum, key) => sum + (family[key] || 0), 0) / 6;
  return 100 - baseline + (family.debt || 0) * 0.25;
}

function awardWinner(players, scoreMap, selector, usedIds = new Set()) {
  const eligible = players.filter((player) => !usedIds.has(player.id));
  const pool = eligible.length ? eligible : players;
  return [...pool].sort((a, b) => selector(b, scoreMap.get(b.id)) - selector(a, scoreMap.get(a.id)) || (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))[0];
}

function computeAwards(players, scenario) {
  if (!players.length) return [];
  const scenarioAwards = {
    easy_credit: {
      gamble: "Credit Tightrope Walker",
      steady: "Paid In Cash, Slept At Night",
      gambleDetail: "Used risky opportunity without letting debt fully own the ending.",
      steadyDetail: "Resisted easy money and kept the family from severe lows.",
    },
    harsh_winter: {
      hardest: "Bean Counter With A Blanket",
      steady: "Kept The Stove Lit",
      hardestDetail: "Did the most with the least room for comfort.",
      steadyDetail: "Protected the family from the harshest food, health, and hope lows.",
    },
    bank_panic: {
      anchor: "Trust Fund Without The Fund",
      gamble: "Vault Door Philosopher",
      anchorDetail: "Kept trust strongest when institutional confidence was shaky.",
      gambleDetail: "Made the boldest bank, cash, and risk calls while staying alive.",
    },
    relief_politics: {
      anchor: "Town Hall Diplomat",
      hardest: "Relief Line Strategist",
      anchorDetail: "Used cooperation and reputation best when public help was contested.",
      hardestDetail: "Navigated scarcity and public help from a tough starting point.",
    },
  };
  const variant = scenarioAwards[scenario?.id] || {};
  const scored = players.map((player) => ({ ...player, score: scoreFamily(player) })).sort((a, b) => b.score - a.score);
  const scoreMap = new Map(scored.map((player) => [player.id, player.score]));
  const mostResilient = scored[0];
  const usedIds = new Set(mostResilient ? [mostResilient.id] : []);
  const communityAnchor = awardWinner(players, scoreMap, (player) => {
    const choices = flattenChoices(player);
    return (player.reputation ?? 50) + choices.filter((choice) => COOPERATIVE_CHOICES.has(choice)).length * 8 - (player.exploitMarkers || 0) * 12;
  }, usedIds);
  if (communityAnchor) usedIds.add(communityAnchor.id);
  const hardestRoad = awardWinner(players, scoreMap, (player) => startingHardship(player) + Math.max(0, scoreMap.get(player.id) || 0) * 0.35, usedIds);
  if (hardestRoad) usedIds.add(hardestRoad.id);
  const boldestGamble = awardWinner(players, scoreMap, (player) => {
    const choices = flattenChoices(player);
    return choices.filter((choice) => RISK_CHOICES.has(choice)).length * 12 + (player.stock || 0) * 0.25 + (player.exploitMarkers || 0) * 6;
  }, usedIds);
  if (boldestGamble) usedIds.add(boldestGamble.id);
  const steadyHand = awardWinner(players, scoreMap, (player) => lowestRecordedMeter(player) - (player.exploitMarkers || 0) * 10 - (player.rushedChoiceCount || 0) * 3, usedIds);
  const nemesis = scenario?.hardMode ? awardWinner(players, scoreMap, (player) => {
    const attacks = (player.sabotageHistory || []).length;
    const survivedRivals = (player.rivalHit ? 1 : 0) + (player.rivalHistory || []).length;
    return attacks * 18 + survivedRivals * 5 + (scoreMap.get(player.id) || 0) * 0.2 - (player.exploitMarkers || 0) * 4;
  }, usedIds) : null;
  return [
    { id: "resilient", title: "Most Resilient Family", player: mostResilient, detail: "Highest final resilience score across meters, debt, trust, and danger penalties.", primary: true },
    { id: "anchor", title: variant.anchor || "Community Anchor", player: communityAnchor, detail: variant.anchorDetail || "Best record of cooperation, trust, and low exploitation." },
    { id: "hardest", title: variant.hardest || "Hardest Road", player: hardestRoad, detail: variant.hardestDetail || "Strongest finish from the toughest family position." },
    { id: "gamble", title: variant.gamble || "Boldest Gamble", player: boldestGamble, detail: variant.gambleDetail || "Took the biggest strategic risks while staying in the race." },
    { id: "steady", title: variant.steady || "Steady Hand", player: steadyHand, detail: variant.steadyDetail || "Kept the family out of danger with the fewest severe lows." },
    { id: "nemesis", title: "Sharpest Elbows", player: nemesis, detail: "Used rival pressure most aggressively while still staying in the race." },
  ].filter((award) => award.player);
}

function historicalDebrief(players, shared) {
  if (!players.length) return [];
  const choices = players.flatMap(flattenChoices);
  const exploitCount = players.reduce((sum, player) => sum + (player.exploitMarkers || 0), 0);
  const objectiveCount = players.filter((player) => objectiveResult(player).completed).length;
  const dangerCount = players.filter((player) => lowestRecordedMeter(player) < 25).length;
  const cooperationCount = choices.filter((choice) => COOPERATIVE_CHOICES.has(choice)).length;
  const workReliefCount = choices.filter((choice) => WORK_OR_RELIEF_CHOICES.has(choice)).length;
  const takeaways = [
    `${objectiveCount}/${players.length} families completed their background objective, showing how the same economy created different survival priorities.`,
    `${workReliefCount} work or relief choices were made. Scarce opportunities helped, but they could not remove pressure for everyone.`,
    cooperationCount >= exploitCount
      ? "Cooperation was a meaningful strategy: shared support improved trust and helped families absorb shocks."
      : "Hard betrayal paid in the short term, but exploit markers and lower trust made selfish survival more costly at the end.",
    dangerCount
      ? `${dangerCount} families hit a danger zone on at least one meter, showing how quickly food, health, savings, hope, schooling, or stability could become fragile.`
      : "No family crossed a severe danger threshold, which means the room collectively managed risk unusually well.",
    (shared?.trust ?? 55) >= 60
      ? "The room ended with a relatively strong trust climate, making relief and work access easier to justify."
      : "The room ended with a strained trust climate, showing how scarcity can weaken community confidence.",
  ];
  return takeaways;
}

function loadSavedGame() {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const joinCode = (params.get("room") || "").trim().toUpperCase();
    const saved = JSON.parse(window.localStorage.getItem("gd-game-state") || "{}");
    if (params.has("newHost")) {
      window.localStorage.removeItem("gd-game-state");
      return {};
    }
    if (joinCode) {
      if (saved.version !== GAME_STATE_VERSION) return { view: "join", roomCode: joinCode };
      if (saved.roomCode === joinCode && (saved.activePlayerId || saved.hostToken)) return saved;
      return { view: "join", roomCode: joinCode };
    }
    if (saved.version !== GAME_STATE_VERSION) return {};
    if (saved.view === "host" && !saved.hostToken) return {};
    return saved;
  } catch {
    return {};
  }
}

const apiBase = () => {
  if (process.env.REACT_APP_GAME_API_URL) return process.env.REACT_APP_GAME_API_URL.replace(/\/$/, "");
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
    return window.location.port === "3000" ? "http://localhost:8000/api" : "/api";
  }
  return "/api";
};

async function gameApi(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "The game room server did not respond.");
  return data;
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  resetSavedState = () => {
    window.localStorage.removeItem("gd-game-state");
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="gd-app">
        <section className="gd-panel gd-crash-panel">
          <p className="gd-kicker">Room Recovery</p>
          <h1>The table hit a bad browser state</h1>
          <p>
            The room server is still running. Refresh first; if this browser keeps showing this screen,
            reset its saved game state and rejoin with the room code.
          </p>
          <div className="gd-actions">
            <button onClick={() => window.location.reload()}>Refresh</button>
            <button className="secondary" onClick={this.resetSavedState}>Reset this browser</button>
          </div>
        </section>
      </main>
    );
  }
}

function App() {
  const savedGame = useMemo(() => loadSavedGame(), []);
  const canCreateHost = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("newHost");
  }, []);
  const [view, setView] = useState(savedGame.view || "start");
  const [roomCode, setRoomCode] = useState(savedGame.roomCode || "");
  const [hostToken, setHostToken] = useState(savedGame.hostToken || "");
  const [playerToken, setPlayerToken] = useState(savedGame.playerToken || "");
  const [actionImpacts, setActionImpacts] = useState(savedGame.actionImpacts || {});
  const [availableActions, setAvailableActions] = useState(savedGame.availableActions || []);
  const [players, setPlayers] = useState(savedGame.players || []);
  const [shared, setShared] = useState(savedGame.shared || null);
  const [scenario, setScenario] = useState(savedGame.scenario || null);
  const [rematchScenario, setRematchScenario] = useState(savedGame.rematchScenario || null);
  const [nextRoomCode, setNextRoomCode] = useState(savedGame.nextRoomCode || "");
  const [selectedScenarioId, setSelectedScenarioId] = useState(savedGame.selectedScenarioId || "easy_credit");
  const [selectedHardMode, setSelectedHardMode] = useState(Boolean(savedGame.selectedHardMode));
  const [phaseIndex, setPhaseIndex] = useState(savedGame.phaseIndex || 0);
  const [playerName, setPlayerName] = useState(savedGame.playerName || "");
  const [activePlayerId, setActivePlayerId] = useState(savedGame.activePlayerId || "");
  const [selected, setSelected] = useState(savedGame.selected || []);
  const [apiError, setApiError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(savedGame.lastSyncedAt || 0);
  const [phaseRevealVisible, setPhaseRevealVisible] = useState(false);
  const [activeStation, setActiveStation] = useState(savedGame.activeStation || "phase");
  const [soundEnabled, setSoundEnabled] = useState(savedGame.soundEnabled ?? true);
  const [telegramArchive, setTelegramArchive] = useState(savedGame.telegramArchive || []);
  const [readTelegramKeys, setReadTelegramKeys] = useState(savedGame.readTelegramKeys || []);
  const [dismissedNoticeKeys, setDismissedNoticeKeys] = useState(savedGame.dismissedNoticeKeys || []);
  const [dismissedPolicyKeys, setDismissedPolicyKeys] = useState(savedGame.dismissedPolicyKeys || []);
  const [dismissedReceiptKeys, setDismissedReceiptKeys] = useState(savedGame.dismissedReceiptKeys || []);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [policySelection, setPolicySelection] = useState("");
  const [claimSelection, setClaimSelection] = useState("");
  const viewRef = useRef(savedGame.view || "start");
  const lastNoticeSoundRef = useRef("");
  const tableSetSoundRef = useRef("");
  const phaseSoundRef = useRef("");
  const joinClientIdRef = useRef(savedGame.joinClientId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const phase = phases[phaseIndex] || phases[0];
  const isFinalPhase = phaseIndex >= phases.length - 1;
  const isResultsPhase = phase.id === "results";
  const isRecoveryPhase = phase.id === "recovery";
  const previousPhaseId = phases[phaseIndex - 1]?.id;
  const activePlayer = players.find((p) => p.id === activePlayerId) || null;
  const activeRoundPlayers = players.filter((p) => !p.gameOver);
  const submittedChoices = activePlayer?.choices?.[phase.id] || [];
  const submittedCount = activeRoundPlayers.filter((p) => p.submitted || p.choices?.[phase.id]?.length === 2).length;
  const policyVote = shared?.policyVote || null;
  const activePolicyKey = policyVote?.resolved ? `${policyVote.id}-${policyVote.result?.winnerId}` : "";
  const submittedPolicyOption = activePlayer?.policyVotes?.[phase.id] || "";
  const townHall = shared?.townHall || null;
  const submittedClaim = activePlayer?.provisionalClaims?.[phase.id] || "";
  const townHallReady = isResultsPhase || !townHall || townHall.resolved;
  const activeChoices = useMemo(
    () => activePlayer?.gameOver ? [] : availableActions.map(({ id, title, detail }) => [id, title, detail]),
    [activePlayer?.gameOver, availableActions]
  );
  const scoredPlayers = useMemo(
    () => players.map((p) => ({ ...p, score: scoreFamily(p) })).sort((a, b) => b.score - a.score),
    [players]
  );
  const rushedChoiceWarning = activePlayer?.lastChoiceRushed;
  const consequencePreview = useMemo(
    () => consequencePreviewFor(activePlayer, selected, shared?.phaseStartedAt),
    [activePlayer, selected, shared?.phaseStartedAt]
  );
  const privateNotices = useMemo(() => {
    if (!activePlayer || isResultsPhase) return [];
    const phaseId = phase?.id || "";
    const collapseWarning = typeof activePlayer.collapseWarning === "object" && activePlayer.collapseWarning ? activePlayer.collapseWarning : null;
    const employmentShock = typeof activePlayer.employmentShock === "object" && activePlayer.employmentShock ? activePlayer.employmentShock : null;
    const rivalHit = typeof activePlayer.rivalHit === "object" && activePlayer.rivalHit ? activePlayer.rivalHit : null;
    const hiringResult = typeof activePlayer.hiringResult === "object" && activePlayer.hiringResult ? activePlayer.hiringResult : null;
    const notices = [];
    if (collapseWarning && !activePlayer.gameOver) {
      notices.push({
        key: `${activePlayer.id}-${phaseId}-collapse-${collapseWarning.reason || "meter"}`,
        type: "danger",
        kicker: "Family In Danger",
        title: collapseWarning.title || "Family meter in danger",
        detail: collapseWarning.detail || "Choose the emergency card this phase to keep this family in the game.",
        image: collapseWarning.reason === "health" ? "family-health-crisis.png" : "family-danger-state.png",
      });
    }
    if (employmentShock?.phaseId === phaseId) {
      notices.push({
        key: `${activePlayer.id}-${phaseId}-job-loss`,
        type: "job",
        kicker: "Private Family Notice",
        title: employmentShock.title || "Main job lost",
        detail: employmentShock.detail || "Your family lost its main job this phase.",
        image: "work-relief-market.png",
      });
    }
    if (previousPhaseId && rivalHit?.phaseId === previousPhaseId) {
      notices.push({
        key: `${activePlayer.id}-${previousPhaseId}-rival-hit`,
        type: "rival",
        kicker: "Rival Move",
        title: rivalHit.title || "Rival pressure",
        detail: rivalHit.detail || "A rival family targeted your family last phase.",
        image: "action-rival-call-in-debt.png",
      });
    }
    const hasCurrentJobLoss = employmentShock?.phaseId === phaseId;
    if (previousPhaseId && hiringResult?.phaseId === previousPhaseId && !hasCurrentJobLoss) {
      notices.push({
        key: `${activePlayer.id}-${previousPhaseId}-hiring`,
        type: "hiring",
        kicker: "Hiring Board Result",
        title: hiringResult.title || "Hiring board result",
        detail: hiringResult.detail || "The hiring board resolved after all choices were in.",
        image: "work-relief-market.png",
      });
    }
    return notices;
  }, [activePlayer, isResultsPhase, phase?.id, previousPhaseId]);
  const activePrivateNotice = privateNotices.find((notice) => !dismissedNoticeKeys.includes(notice.key));
  const receiptKey = activePlayer?.roundReceipt ? `${activePlayer.id}-${activePlayer.roundReceipt.phaseId}-receipt` : "";
  const activeReceipt = activePlayer?.roundReceipt && activePlayer.roundReceipt.phaseId === previousPhaseId && !dismissedReceiptKeys.includes(receiptKey)
    ? activePlayer.roundReceipt : null;
  const showPolicyModal = Boolean(
    policyVote && !phaseRevealVisible && !activeReceipt && !activePrivateNotice &&
    (!policyVote.resolved || !dismissedPolicyKeys.includes(activePolicyKey))
  );

  useEffect(() => {
    setPolicySelection(submittedPolicyOption);
  }, [phase.id, submittedPolicyOption]);

  useEffect(() => {
    setClaimSelection(submittedClaim);
  }, [phase.id, submittedClaim]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const handleBackFromJoin = () => {
      if (viewRef.current !== "join") return;
      setView("start");
      setRoomCode("");
      setSelected([]);
      setApiError("");
    };
    window.addEventListener("popstate", handleBackFromJoin);
    return () => window.removeEventListener("popstate", handleBackFromJoin);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "gd-game-state",
      JSON.stringify({
        version: GAME_STATE_VERSION,
        view,
        roomCode,
        hostToken,
        playerToken,
        actionImpacts,
        availableActions,
        players,
        shared,
        scenario,
        rematchScenario,
        nextRoomCode,
        selectedScenarioId,
        selectedHardMode,
        phaseIndex,
        playerName,
        activePlayerId,
        selected,
        activeStation,
        soundEnabled,
        telegramArchive,
        readTelegramKeys,
        dismissedNoticeKeys,
        dismissedPolicyKeys,
        dismissedReceiptKeys,
        lastSyncedAt,
        joinClientId: joinClientIdRef.current,
      })
    );
  }, [view, roomCode, hostToken, playerToken, actionImpacts, availableActions, players, shared, scenario, rematchScenario, nextRoomCode, selectedScenarioId, selectedHardMode, phaseIndex, playerName, activePlayerId, selected, activeStation, soundEnabled, telegramArchive, readTelegramKeys, dismissedNoticeKeys, dismissedPolicyKeys, dismissedReceiptKeys, lastSyncedAt]);

  useEffect(() => {
    if (view !== "host" && view !== "player") return undefined;
    window.scrollTo(0, 0);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    setPhaseRevealVisible(true);
    const timer = window.setTimeout(() => setPhaseRevealVisible(false), reduceMotion ? 350 : 3500);
    return () => window.clearTimeout(timer);
  }, [phase.id, phaseIndex, view]);

  useEffect(() => {
    setActiveStation("phase");
  }, [phase.id, view]);

  useEffect(() => {
    if (!privateNotices.length) return;
    setTelegramArchive((current) => {
      const known = new Set(current.map((notice) => notice.key));
      const incoming = privateNotices
        .filter((notice) => !known.has(notice.key))
        .map((notice) => ({ ...notice, phaseId: phase.id, years: phase.years }));
      return incoming.length ? [...incoming, ...current] : current;
    });
  }, [phase.id, phase.years, privateNotices]);

  useEffect(() => {
    if (!activePrivateNotice || phaseRevealVisible || lastNoticeSoundRef.current === activePrivateNotice.key) return;
    lastNoticeSoundRef.current = activePrivateNotice.key;
    playTabletopSound("telegram", { enabled: soundEnabled, volume: view === "host" ? 0.8 : 0.45 });
  }, [activePrivateNotice, phaseRevealVisible, soundEnabled, view]);

  useEffect(() => {
    if (!phaseRevealVisible || phaseSoundRef.current === phase.id || (view !== "host" && view !== "player")) return;
    phaseSoundRef.current = phase.id;
    playTabletopSound(phaseSoundCueFor(phase.id), { enabled: soundEnabled, volume: view === "host" ? 0.72 : 0.34 });
  }, [phase.id, phaseRevealVisible, soundEnabled, view]);

  useEffect(() => {
    if (
      !soundEnabled ||
      phaseRevealVisible ||
      isResultsPhase ||
      (view !== "host" && view !== "player") ||
      tableSetSoundRef.current === phase.id
    ) return;
    tableSetSoundRef.current = phase.id;
    playTabletopSound("newspaper", { enabled: soundEnabled, volume: view === "host" ? 0.8 : 0.38 });
  }, [isResultsPhase, phase.id, phaseRevealVisible, soundEnabled, view]);

  function syncRoom(room) {
    if (!room) return;
    const nextPhaseIndex = room.phaseIndex || 0;
    setRoomCode(room.roomCode);
    setPlayers(room.players || []);
    setActionImpacts(room.actions || {});
    setAvailableActions(room.availableActions || []);
    setShared(room.shared || null);
    setScenario(room.scenario || null);
    setRematchScenario(room.rematchScenario || null);
    setNextRoomCode(room.nextRoomCode || "");
    setPhaseIndex(nextPhaseIndex);
    setLastSyncedAt(Date.now());
  }

  function resetExpiredRoom() {
    setView("start");
    setRoomCode("");
    setHostToken("");
    setPlayers([]);
    setShared(null);
    setScenario(null);
    setRematchScenario(null);
    setNextRoomCode("");
    setPhaseIndex(0);
    setActivePlayerId("");
    setSelected([]);
    setLastSyncedAt(0);
    setApiError("That room expired. Create a fresh room to continue.");
  }

  async function runGameRequest(request) {
    setIsBusy(true);
    setApiError("");
    try {
      return await request();
    } catch (error) {
      if (/room not found/i.test(error.message)) {
        resetExpiredRoom();
        return null;
      }
      setApiError(error.message);
      return null;
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (!roomCode || view === "start" || view === "join") return undefined;
    let cancelled = false;
    const pullRoom = async () => {
      try {
        const credentials = view === "host" && hostToken
          ? `?host_token=${encodeURIComponent(hostToken)}`
          : activePlayerId && playerToken
            ? `?player_id=${encodeURIComponent(activePlayerId)}&player_token=${encodeURIComponent(playerToken)}`
            : "";
        const data = await gameApi(`/game/rooms/${roomCode}${credentials}`);
        if (!cancelled) {
          syncRoom(data.room);
          setApiError("");
        }
      } catch (error) {
        if (!cancelled) {
          if (/room not found/i.test(error.message)) resetExpiredRoom();
          else setApiError(error.message);
        }
      }
    };
    pullRoom();
    const timer = window.setInterval(pullRoom, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [roomCode, view, hostToken, activePlayerId, playerToken]);

  useEffect(() => {
    if (rematchScenario?.id) setSelectedScenarioId(rematchScenario.id);
  }, [rematchScenario?.id]);

  async function createHostRoom(scenarioId = selectedScenarioId) {
    playTabletopSound("paper", { enabled: soundEnabled, volume: 0.65 });
    const payload = { scenario_id: scenarioId, hard_mode: selectedHardMode };
    if (isResultsPhase && roomCode && hostToken) {
      payload.previous_room_code = roomCode;
      payload.host_token = hostToken;
    }
    const data = await runGameRequest(() => gameApi("/game/rooms", { method: "POST", body: JSON.stringify(payload) }));
    if (!data) return;
    syncRoom(data.room);
    setHostToken(data.hostToken || "");
    setPlayerToken("");
    setActivePlayerId("");
    setSelected([]);
    setNextRoomCode("");
    setSelectedScenarioId(data.room?.scenario?.id || scenarioId);
    setSelectedHardMode(Boolean(data.room?.scenario?.hardMode));
    setView("host");
  }

  function showJoinScreen() {
    playTabletopSound("paper", { enabled: soundEnabled, volume: 0.35 });
    window.history.pushState({ gdView: "join" }, "", window.location.href);
    setView("join");
  }

  function returnToStart() {
    setView("start");
    setRoomCode("");
    setSelected([]);
    setApiError("");
  }

  async function joinRoom() {
    playTabletopSound("cards", { enabled: soundEnabled, volume: 0.38 });
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setApiError("Ask the host for the room code first.");
      return;
    }
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${code}/join`, {
        method: "POST",
        body: JSON.stringify({ room_code: code, player_name: playerName.trim() || "Player", client_id: joinClientIdRef.current }),
      })
    );
    if (!data) return;
    syncRoom(data.room);
    setHostToken("");
    setPlayerToken(data.playerToken || "");
    setActivePlayerId(data.playerId);
    setSelected([]);
    setView("player");
  }

  async function joinNextRoom(code = nextRoomCode) {
    const nextCode = String(code || "").trim().toUpperCase();
    if (!nextCode) return;
    const returningName = activePlayer?.playerName || playerName.trim() || "Player";
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${nextCode}/join`, {
        method: "POST",
        body: JSON.stringify({ room_code: nextCode, player_name: returningName, client_id: joinClientIdRef.current }),
      })
    );
    if (!data) return;
    syncRoom(data.room);
    setHostToken("");
    setPlayerToken(data.playerToken || "");
    setActivePlayerId(data.playerId);
    setSelected([]);
    setView("player");
  }

  async function addDemoPlayer() {
    if (!roomCode || players.length >= MAX_PLAYERS) return;
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${roomCode}/join`, {
        method: "POST",
        body: JSON.stringify({ room_code: roomCode, player_name: `Player ${players.length + 1}`, client_id: `demo-${Date.now()}-${players.length}`, is_demo: true }),
      })
    );
    if (!data) return;
    syncRoom(data.room);
    setActivePlayerId(data.playerId);
  }

  function toggleChoice(choice) {
    if (!selected.includes(choice)) {
      playTabletopSound("stamp", { enabled: soundEnabled, volume: view === "host" ? 0.8 : 0.5 });
    }
    setSelected((current) => {
      if (current.includes(choice)) return current.filter((item) => item !== choice);
      if (WORK_CHOICES.has(choice) && current.some((item) => WORK_CHOICES.has(item))) return current;
      if (SABOTAGE_CHOICE_IDS.includes(choice) && current.some((item) => SABOTAGE_CHOICE_IDS.includes(item))) return current;
      return current.length >= 2 ? [current[1], choice] : [...current, choice];
    });
  }

  function openTableStation(station) {
    if (station === "decisions") {
      playTabletopSound("cards", { enabled: soundEnabled, volume: view === "host" ? 0.75 : 0.42 });
    } else if (station === "telegram") {
      setReadTelegramKeys((current) => [...new Set([...current, ...telegramArchive.map((notice) => notice.key)])]);
      playTabletopSound("paper", { enabled: soundEnabled, volume: view === "host" ? 0.6 : 0.36 });
    }
    setActiveStation(station);
  }

  function toggleSound() {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    if (!nextValue) {
      stopTabletopSounds();
      return;
    }
    playTabletopSound("stamp", { enabled: true, volume: 0.35 });
  }

  async function chooseRival(rivalId) {
    if (!activePlayer || !rivalId) return;
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${roomCode}/rival`, {
        method: "POST",
        body: JSON.stringify({ player_id: activePlayer.id, player_token: playerToken, rival_id: rivalId }),
      })
    );
    if (!data) return;
    syncRoom(data.room);
  }

  async function submitChoices() {
    if (!activePlayer || selected.length !== 2) return;
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${roomCode}/choices`, {
        method: "POST",
        body: JSON.stringify({ player_id: activePlayer.id, player_token: playerToken, choices: selected }),
      })
    );
    if (!data) return;
    syncRoom(data.room);
    setSelected([]);
  }

  async function submitPolicyVote(optionId = policySelection) {
    if (!activePlayer || !policyVote || policyVote.resolved || !optionId || submittedPolicyOption) return;
    playTabletopSound("gavel", { enabled: soundEnabled, volume: 0.5 });
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${roomCode}/policy-vote`, {
        method: "POST",
        body: JSON.stringify({ player_id: activePlayer.id, player_token: playerToken, option_id: optionId }),
      })
    );
    if (data) syncRoom(data.room);
  }

  async function resolveDemoPolicyVotes(optionId = policySelection) {
    if (view !== "host" || !hostToken || !policyVote || policyVote.resolved || !optionId) return;
    playTabletopSound("gavel", { enabled: soundEnabled, volume: 0.5 });
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${roomCode}/policy-demo-votes`, {
        method: "POST",
        body: JSON.stringify({ host_token: hostToken, option_id: optionId }),
      })
    );
    if (data) syncRoom(data.room);
  }

  async function submitTownHallClaim(claim = claimSelection) {
    if (!activePlayer || !claim || submittedClaim || view !== "player") return;
    playTabletopSound("stamp", { enabled: soundEnabled, volume: 0.42 });
    const data = await runGameRequest(() => gameApi(`/game/rooms/${roomCode}/town-hall-claim`, {
      method: "POST",
      body: JSON.stringify({ player_id: activePlayer.id, player_token: playerToken, claim }),
    }));
    if (data) syncRoom(data.room);
  }

  async function resolveDemoTownHallClaims(claim = claimSelection) {
    if (!claim || view !== "host" || !hostToken) return;
    playTabletopSound("gavel", { enabled: soundEnabled, volume: 0.5 });
    const data = await runGameRequest(() => gameApi(`/game/rooms/${roomCode}/town-hall-demo-claims`, {
      method: "POST",
      body: JSON.stringify({ host_token: hostToken, claim }),
    }));
    if (data) syncRoom(data.room);
  }

  async function advancePhase() {
    if (view !== "host") return;
    if (!hostToken) {
      setApiError("This browser is missing the host key. Create a new host room to control phases.");
      return;
    }
    const data = await runGameRequest(() =>
      gameApi(`/game/rooms/${roomCode}/advance`, { method: "POST", body: JSON.stringify({ host_token: hostToken }) })
    );
    if (!data) return;
    syncRoom(data.room);
    setSelected([]);
  }

  function dismissPrivateNotice() {
    if (!activePrivateNotice) return;
    setDismissedNoticeKeys((current) => [...current, activePrivateNotice.key]);
    setReadTelegramKeys((current) => [...new Set([...current, activePrivateNotice.key])]);
  }

  return (
    <main className="gd-app">
      <section className="gd-topbar">
        <div>
          <p className="gd-kicker">Main Street, 1919</p>
          <h1>Rent, Beans and Dreams</h1>
        </div>
        <div className="gd-topbar-actions">
          <button
            className="tabletop-sound-toggle"
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "Mute game sound" : "Enable game sound"}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? "Sound on" : "Sound off"}
          </button>
          <div className="gd-room">Room {roomCode || "not started"}</div>
        </div>
      </section>
      {apiError && <div className="gd-alert">{apiError}</div>}
      {activeReceipt && !phaseRevealVisible && (
        <OutcomeReceiptModal receipt={activeReceipt} onDismiss={() => {
          playTabletopSound("stamp", { enabled: soundEnabled, volume: 0.45 });
          setDismissedReceiptKeys((current) => [...new Set([...current, receiptKey])]);
        }} />
      )}
      {activePrivateNotice && !activeReceipt && !phaseRevealVisible && (
        <PrivateNoticeModal notice={activePrivateNotice} onDismiss={dismissPrivateNotice} />
      )}
      {showPolicyModal && (
        <PolicyVoteModal
          policy={policyVote}
          view={view}
          selectedOptionId={policySelection}
          submittedOptionId={submittedPolicyOption}
          isBusy={isBusy}
          onSelect={setPolicySelection}
          onVote={() => submitPolicyVote()}
          onResolveDemoVotes={() => resolveDemoPolicyVotes()}
          onDismiss={() => {
            if (activePolicyKey) setDismissedPolicyKeys((current) => [...new Set([...current, activePolicyKey])]);
          }}
        />
      )}
      {leaderboardVisible && (
        <LeaderboardModal
          players={scoredPlayers}
          shared={shared}
          scenario={scenario}
          onClose={() => setLeaderboardVisible(false)}
        />
      )}

      {view === "start" && (
        <section className="gd-start">
          <div className="gd-home-ledger">
            <div className="gd-home-family">
              <img src={asset("homepage-family-1919.png")} alt="A family gathered around its household ledger in 1919" />
              <p>An ordinary morning. Every choice matters.</p>
            </div>
            <div className="gd-home-entry">
              <div className="gd-home-entry-sheet">
                <p className="gd-kicker">A room-sized historical game</p>
                <h2>Take your place at the table.</h2>
                <p className="gd-home-intro">
                  Join a room, receive a household, and make two private choices as the world around you changes.
                </p>
                <div className="gd-home-mechanics" aria-label="How the game works">
                  <span>Family <b>Assigned</b></span>
                  <span>Choices <b>Private</b></span>
                  <span>Table talk <b>Shared</b></span>
                </div>
                <blockquote>
                  “The chief business of the American people is business.”
                  <cite>Calvin Coolidge, 1925</cite>
                </blockquote>
                {canCreateHost && (
                  <ScenarioPicker
                    selectedScenarioId={selectedScenarioId}
                    onSelect={setSelectedScenarioId}
                    hardMode={selectedHardMode}
                    onHardModeChange={setSelectedHardMode}
                    compact
                  />
                )}
                <div className="gd-actions gd-home-actions">
                {canCreateHost ? (
                  <button onClick={() => createHostRoom()} disabled={isBusy}>{isBusy ? "Creating..." : "Create host room"}</button>
                ) : (
                  <button onClick={showJoinScreen}>Join as player</button>
                )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {view === "join" && (
        <section className="gd-panel gd-join">
          <h2>Join a room</h2>
          <input value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="Room code" />
          <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" />
          <div className="gd-join-actions">
            <button className="secondary" onClick={returnToStart} disabled={isBusy}>Back to start</button>
            <button onClick={joinRoom} disabled={isBusy}>{isBusy ? "Joining..." : "Get family profile"}</button>
          </div>
        </section>
      )}

      {(view === "host" || view === "player") && (
        <>
        {phaseRevealVisible && (
          <div className={isResultsPhase ? "phase-reveal results-reveal" : "phase-reveal"} key={phase.id} aria-hidden="true">
            <img src={asset(phase.image)} alt="" />
            <div className="phase-reveal-copy">
              <p className="gd-kicker">{isResultsPhase ? "Final Ledgers" : `Market Conditions - ${phase.years}`}</p>
              <h2>{isResultsPhase ? "Who best kept the dream alive?" : phase.title}</h2>
            </div>
          </div>
        )}
        <section className={[
          "gd-grid",
          !isResultsPhase ? "tabletop-phase" : "",
          isResultsPhase ? "results-grid" : "",
          phaseRevealVisible ? "phase-ui-hidden" : "phase-ui-visible",
        ].filter(Boolean).join(" ")}>
          <div className={isResultsPhase ? "results-surface" : "tabletop-surface"}>
          <div className="gd-main">
            {isResultsPhase ? (
              <ResultsPhase
                players={scoredPlayers}
                shared={shared}
                scenario={scenario}
                rematchScenario={rematchScenario}
                view={view}
                isBusy={isBusy}
                selectedScenarioId={selectedScenarioId}
                onSelectScenario={setSelectedScenarioId}
                selectedHardMode={selectedHardMode}
                onHardModeChange={setSelectedHardMode}
                onCreateScenario={createHostRoom}
                nextRoomCode={nextRoomCode}
                onJoinNextRoom={joinNextRoom}
              />
            ) : activeStation === "phase" ? (
              <PhaseStation phase={phase} scenario={scenario} shared={shared} phaseIndex={phaseIndex} />
            ) : activeStation === "telegram" ? (
              <TelegramInbox notices={telegramArchive} />
            ) : activeStation === "news" ? (
              <div className="tabletop-scene news-scene">
                <span className="scene-label">2 · News & Town Hall</span>
                <span className="scene-sound">Host · newspaper thump · Player · town notice</span>
                {activePlayer && <PlayerFamilyLedger family={activePlayer} />}
                <NewsTownHall
                  phase={phase}
                  shared={shared}
                  playerCount={activeRoundPlayers.length || players.length}
                  players={activeRoundPlayers}
                  family={activePlayer}
                  view={view}
                  selectedClaim={claimSelection}
                  submittedClaim={submittedClaim}
                  isBusy={isBusy}
                  onSelectClaim={setClaimSelection}
                  onSubmitClaim={submitTownHallClaim}
                  onResolveDemoClaims={resolveDemoTownHallClaims}
                />
              </div>
            ) : (
              <div className="tabletop-scene decision-scene">
                <span className="scene-label">3 · Make a decision</span>
                <span className="scene-sound">Player sound · ink stamp</span>
                {activePlayer && <PlayerFamilyLedger family={activePlayer} />}
                {activePlayer?.gameOver ? (
                  <FamilyGameOver family={activePlayer} />
                ) : activeChoices.length > 0 && submittedChoices.length > 0 ? (
                  <div className="gd-panel gd-submitted submitted-tabletop">
                    <p className="gd-kicker">Decisions sealed</p>
                    <h2>Your cards are face down</h2>
                    <div className="submitted-card-row" aria-label="Two submitted decision cards">
                      <div className="submitted-card-back"><span>Private decision</span></div>
                      <div className="submitted-card-back"><span>Private decision</span></div>
                    </div>
                    {rushedChoiceWarning && <p className="gd-sync">Quick choices gave reduced positive gains this round.</p>}
                    <p className="gd-sync ready-count">{submittedCount}/{activeRoundPlayers.length} families ready</p>
                    <p>Your choices remain private. You can revisit the phase, news, family ledger, and telegram while the table finishes.</p>
                    {view === "host" && <button onClick={advancePhase} disabled={isBusy || isFinalPhase}>Advance now</button>}
                  </div>
                ) : activePlayer ? (
                  <div className="gd-choices">
                    <img src={asset("new-deal-choice-background.png")} alt="" />
                    <div className="gd-choice-content">
                      <p className="gd-kicker">Make a decision · Choose 2 actions</p>
                      {!!consequencePreview.length && (
                        <div className="choice-consequence-strip" role="status">
                          <strong>Consequences in play</strong>
                          <span>{consequencePreview.join(" · ")}</span>
                        </div>
                      )}
                      {activePlayer?.collapseWarning && (
                        <div className="emergency-choice-banner">
                          <strong>Emergency decision required</strong>
                          <span>Select the red emergency card this phase to keep this family in the game.</span>
                        </div>
                      )}
                      {scenario?.hardMode && activePlayer && (
                        <RivalPanel
                          activePlayer={activePlayer}
                          players={players}
                          phase={phase}
                          isBusy={isBusy}
                          onChooseRival={chooseRival}
                        />
                      )}
                      <div
                        className={`gd-choice-grid choice-hand choice-era-${choiceEraForPhase(phase.id)} choice-layout-${choiceGridShape(activeChoices.length).layout}`}
                        data-choice-count={activeChoices.length}
                        style={{
                          "--choice-columns": choiceGridShape(activeChoices.length).columns,
                          "--choice-rows": choiceGridShape(activeChoices.length).rows,
                          "--card-count": activeChoices.length,
                          "--fan-overlap": `${Math.min(130, Math.max(36, 36 + Math.max(0, activeChoices.length - 7) * 12))}px`,
                        }}
                      >
                        {activeChoices.map(([id, title, detail], index) => {
                          const blockedByWorkRule = !selected.includes(id) && WORK_CHOICES.has(id) && selected.some((item) => WORK_CHOICES.has(item));
                          const blockedBySabotageRule = !selected.includes(id) && SABOTAGE_CHOICE_IDS.includes(id) && selected.some((item) => SABOTAGE_CHOICE_IDS.includes(item));
                          const cardArt = actionCardArtFor(id, phase.id);
                          const chips = choiceImpactChips(id, actionImpacts);
                          const edgeHoverShift = index === 0 ? 58 : index === activeChoices.length - 1 ? -58 : index === 1 ? 22 : index === activeChoices.length - 2 ? -22 : 0;
                          return (
                            <button
                              key={id}
                              className={[
                                selected.includes(id) ? "selected" : "",
                                blockedByWorkRule || blockedBySabotageRule ? "choice-disabled" : "",
                                `choice-${choiceTone(id)}`,
                              ].filter(Boolean).join(" ")}
                              onClick={() => toggleChoice(id)}
                              disabled={blockedByWorkRule || blockedBySabotageRule}
                              aria-pressed={selected.includes(id)}
                              style={{
                                "--card-index": index,
                                "--fan-position": index - (activeChoices.length - 1) / 2,
                                "--fan-rotation": `${(index - (activeChoices.length - 1) / 2) * 2.2}deg`,
                                "--fan-rise": `${Math.abs(index - (activeChoices.length - 1) / 2) * 5}px`,
                                "--fan-hover-shift": `${edgeHoverShift}px`,
                              }}
                              title={blockedByWorkRule ? "Choose only one work action this round." : blockedBySabotageRule ? "Choose only one sabotage action this round." : undefined}
                            >
                              {cardArt && <img className="choice-card-art" src={asset(cardArt)} alt="" />}
                              <span className="choice-index">{String.fromCharCode(65 + index)}</span>
                              <strong>{title}</strong>
                              {!!chips.length && (
                                <div className="choice-effects" aria-label="Action effects">
                                  {chips.map((chip) => (
                                    <b className={`effect-chip ${chip.tone}`} key={`${id}-${chip.key}`}>{chip.label}</b>
                                  ))}
                                </div>
                              )}
                              {selected.includes(id) && (
                                <span className="choice-selection-stamp" aria-hidden="true">Choice made</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="gd-submit"
                        onClick={submitChoices}
                        disabled={selected.length !== 2 || isBusy}
                        title={consequencePreview.length ? consequencePreview.join(". ") : undefined}
                      >
                        {isBusy ? "Submitting..." : consequencePreview.length ? "Lock in with consequences" : "Lock in 2 decisions"}
                      </button>
                    </div>
                  </div>
                ) : <div className="gd-panel empty-station"><p>Assign a family before opening decisions.</p></div>}
              </div>
            )}
          </div>
          </div>

          {!isResultsPhase && (
            <TabletopStationNav
              activeStation={activeStation}
              unreadTelegrams={telegramArchive.filter((notice) => !readTelegramKeys.includes(notice.key)).length}
              decisionsDisabled={!activePlayer || activeChoices.length === 0 || !townHallReady}
              onSelect={openTableStation}
            />
          )}

          {!isResultsPhase && <aside className="gd-sidebar tabletop-table-rail">
            {view === "player" && scenario?.hardMode && !activePlayer?.gameOver && (
              <HardModeLeaderboardPanel
                players={scoredPlayers}
                activePlayer={activePlayer}
                onShowLeaderboard={() => setLeaderboardVisible(true)}
              />
            )}
            {view === "host" && !isResultsPhase && (
              <div className="gd-panel host-table-controls">
                <p className="gd-kicker">Host Controls</p>
                <p className="gd-sync">Players {players.length}/{MAX_PLAYERS} - submitted {submittedCount}/{activeRoundPlayers.length}</p>
                <p className="gd-sync">Phase {Math.min(phaseIndex + 1, phases.length)}/{phases.length} - target 20-25 min</p>
                <p className="gd-sync"><b>Suggested pace:</b> {shared?.policyVote ? "2-3 min for the ballot" : isResultsPhase ? "4 min for the debrief" : "about 90 sec to discuss and choose"}</p>
                <p className="gd-sync">Sync {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "waiting"}</p>
                <button onClick={addDemoPlayer} disabled={isBusy || players.length >= MAX_PLAYERS}>Add demo player</button>
                <button onClick={advancePhase} disabled={isBusy || isFinalPhase}>{isRecoveryPhase ? "Show results" : "Advance phase"}</button>
                <button onClick={() => setLeaderboardVisible(true)}>Show leaderboard</button>
              </div>
            )}
          </aside>}
        </section>
        </>
      )}
    </main>
  );
}

function LeaderboardModal({ players, shared, scenario, onClose }) {
  return (
    <div className="private-notice-backdrop leaderboard-backdrop" role="presentation">
      <section className="leaderboard-modal" role="dialog" aria-modal="true" aria-labelledby="leaderboard-modal-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close leaderboard">×</button>
        {scenario?.hardMode && (
          <div className="leaderboard-target-note">
            <p className="gd-kicker">Hard Mode Targeting</p>
            <p>Use current scores to decide who is worth naming as a rival. The leaderboard updates as the room changes.</p>
          </div>
        )}
        <Leaderboard
          players={players}
          shared={shared}
          scenario={scenario}
          title="Current Leaderboard"
          showAwards={false}
          showDebrief={false}
        />
      </section>
    </div>
  );
}

function HardModeLeaderboardPanel({ players, activePlayer, onShowLeaderboard }) {
  const ranked = players || [];
  const leader = ranked[0];
  const activeRank = ranked.findIndex((player) => player.id === activePlayer?.id) + 1;
  return (
    <div className="gd-panel hard-mode-leaderboard-panel">
      <p className="gd-kicker">Hard Mode Intel</p>
      <h2>Pick rivals by score</h2>
      {leader && (
        <p className="gd-sync">
          Leader: {leader.playerName || "Player"} ({leader.name}) with {leader.score} points.
        </p>
      )}
      {!!activeRank && (
        <p className="gd-sync">Your current rank: {activeRank}/{ranked.length}</p>
      )}
      <button onClick={onShowLeaderboard}>Show leaderboard</button>
    </div>
  );
}

function OutcomeReceiptModal({ receipt, onDismiss }) {
  const deltas = Object.entries(receipt.deltas || {});
  const consequences = receipt.consequences || {};
  return (
    <div className="private-notice-backdrop receipt-backdrop" role="presentation">
      <section className="outcome-receipt" role="dialog" aria-modal="true" aria-labelledby="outcome-receipt-title">
        <div className="receipt-heading">
          <div><p className="gd-kicker">Private Household Ledger</p><h2 id="outcome-receipt-title">What your last choices changed</h2></div>
          <span className="receipt-stamp">Recorded</span>
        </div>
        <div className="receipt-choices">
          {(receipt.choices || []).map((choice) => <span key={choice}>{choice.replaceAll("_", " ")}</span>)}
        </div>
        <div className="receipt-deltas">
          {deltas.length ? deltas.map(([metric, value]) => (
            <span className={value > 0 ? "positive" : "negative"} key={metric}><b>{value > 0 ? `+${value}` : value}</b> {metric}</span>
          )) : <span>No family meter changed.</span>}
        </div>
        {(consequences.rushed || consequences.predictable || consequences.communityMemoryHits) && (
          <div className="receipt-consequences">
            <b>Round consequences</b>
            {consequences.rushed && <span>Rushed: positive gains applied at {Math.round((consequences.positiveGainMultiplier || 1) * 100)}%.</span>}
            {consequences.predictable && <span>Predictable strategy: this round's positive gains were reduced.</span>}
            {!!consequences.communityMemoryHits && <span>Community memory: {consequences.communityMemoryHits} exclusion marker{consequences.communityMemoryHits === 1 ? "" : "s"} remain.</span>}
          </div>
        )}
        {receipt.hiring && <p><b>{receipt.hiring.title}:</b> {receipt.hiring.detail}</p>}
        <p><b>Community:</b> {receipt.communityDetail}</p>
        {receipt.rival && <p><b>Rival action:</b> {receipt.rival.detail}</p>}
        <p className="receipt-history">{receipt.historical}</p>
        <button onClick={onDismiss}>Stamp and continue</button>
      </section>
    </div>
  );
}

function PolicyVoteModal({ policy, view, selectedOptionId, submittedOptionId, isBusy, onSelect, onVote, onResolveDemoVotes, onDismiss }) {
  const winner = policy.options.find((option) => option.id === policy.result?.winnerId);
  const canResolveDemoVotes = view === "host" && (policy.demoVotesRemaining || 0) > 0;
  return (
    <div className="private-notice-backdrop policy-vote-backdrop" role="presentation">
      <section className="policy-vote-modal" role="dialog" aria-modal="true" aria-labelledby="policy-vote-title">
        <div className="policy-dossier-header">
          <div>
            <p className="gd-kicker">Federal Policy Dossier</p>
            <span className="policy-dossier-file">Filed for the town meeting · {policy.phaseId?.replaceAll("_", " ")}</span>
          </div>
          <span className="policy-secret-stamp">Secret ballot</span>
        </div>
        <h2 id="policy-vote-title">{policy.resolved ? "The town has decided" : policy.title}</h2>
        {!policy.resolved && (
          <div className="policy-ballot-progress" aria-label={`${policy.votesReceived} of ${policy.eligibleCount} ballots sealed`}>
            <span><b>{policy.votesReceived}</b> of <b>{policy.eligibleCount}</b> ballots sealed</span>
            <span>Anonymous until every family votes</span>
          </div>
        )}
        {policy.resolved ? (
          <>
            <div className="policy-result-sheet">
              <p className="gd-kicker">Policy in effect</p>
              <h3>{winner?.title}</h3>
              <p>{winner?.detail}</p>
              <div className="policy-tally">
                {policy.options.map((option) => (
                  <span key={option.id}><b>{policy.result?.tally?.[option.id] || 0}</b> {option.title}</span>
                ))}
              </div>
              {policy.result?.tied && <p className="policy-tie-note">The ballot tied. The historical status quo prevailed.</p>}
            </div>
            <button onClick={onDismiss}>Continue to family decisions</button>
          </>
        ) : submittedOptionId || (view === "host" && !canResolveDemoVotes) ? (
          <div className="policy-waiting">
            <div className="policy-sealed-ballot">Ballot sealed</div>
            <h3>Your paper is in the box</h3>
            <p>{view === "host" ? "The host does not vote. Each player family must cast its ballot from that player’s screen." : "Your vote is recorded. Votes remain anonymous until every active family has answered."}</p>
          </div>
        ) : (
          <>
            <p className="policy-ballot-brief">{canResolveDemoVotes ? `Choose the policy that ${policy.demoVotesRemaining} demo ${policy.demoVotesRemaining === 1 ? "family will" : "families will"} support. Real family votes remain private and required.` : policy.detail}</p>
            <div className="policy-option-grid">
              {policy.options.map((option, index) => (
                <button key={option.id} className={`policy-option ${selectedOptionId === option.id ? "selected" : ""}`} onClick={() => onSelect(option.id)} disabled={isBusy} aria-pressed={selectedOptionId === option.id}>
                  <span className="policy-option-meta">
                    <b className="policy-option-number">Proposal {String.fromCharCode(65 + index)}</b>
                    <em>{option.historical || "Alternative proposal"}</em>
                  </span>
                  <strong>{option.title}</strong>
                  <p>{option.detail}</p>
                  <span className="policy-ballot-mark" aria-hidden="true">{selectedOptionId === option.id ? "✓ Ballot marked" : "Mark this proposal"}</span>
                </button>
              ))}
            </div>
            <button className="policy-submit" onClick={canResolveDemoVotes ? onResolveDemoVotes : onVote} disabled={!selectedOptionId || isBusy}>{canResolveDemoVotes ? "Record demo ballots" : "Submit secret vote"}</button>
          </>
        )}
      </section>
    </div>
  );
}

function PrivateNoticeModal({ notice, onDismiss }) {
  return (
    <div className="private-notice-backdrop" role="presentation">
      <section className={`private-notice private-notice-${notice.type}`} role="dialog" aria-modal="true" aria-labelledby="private-notice-title">
        <img src={asset(notice.image)} alt="" />
        <div>
          <p className="gd-kicker">{notice.kicker}</p>
          <h2 id="private-notice-title">{notice.title}</h2>
          <p>{notice.detail}</p>
          {notice.type === "danger" && (
            <p className="notice-hint">Recover this meter before the next phase resolves, or this family receives a closing screen.</p>
          )}
          {notice.type === "job" && (
            <p className="notice-hint">New emergency choices may appear for this family this phase.</p>
          )}
          {notice.type === "hiring" && (
            <p className="notice-hint">Scarce work resolves only after all players submit, so rushing does not improve the odds.</p>
          )}
          <button onClick={onDismiss}>Continue</button>
        </div>
      </section>
    </div>
  );
}

function ScenarioPicker({ selectedScenarioId, onSelect, hardMode = false, onHardModeChange, compact = false }) {
  return (
    <div className={compact ? "scenario-picker compact" : "scenario-picker"}>
      <p className="gd-kicker">Scenario</p>
      <div className="scenario-choice-grid">
        {SCENARIO_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === selectedScenarioId ? "selected" : ""}
            onClick={() => onSelect(option.id)}
          >
            <strong>{option.title}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
      {onHardModeChange && (
        <button
          type="button"
          className={hardMode ? "hard-mode-toggle selected" : "hard-mode-toggle"}
          onClick={() => onHardModeChange(!hardMode)}
          aria-pressed={hardMode}
        >
          <span className="hard-mode-seal" aria-hidden="true">R</span>
          <span className="hard-mode-copy">
            <small>Optional rule set</small>
            <strong>Competitive Mode</strong>
            <span>{hardMode ? "Fewer slots, harsher betrayal, and rival sabotage." : "Standard scarcity without direct rival attacks."}</span>
          </span>
          <span className="hard-mode-switch" aria-hidden="true"><i /></span>
          {hardMode && <b className="hard-mode-stamp">Rivalry Active</b>}
        </button>
      )}
    </div>
  );
}

function RivalPanel({ activePlayer, players, phase, isBusy, onChooseRival }) {
  const tokens = activePlayer.rivalTokensRemaining ?? 0;
  const inWindow = RIVAL_WINDOW_PHASES.has(phase.id);
  const usedThisPhase = (activePlayer.rivalChoicePhases || []).includes(phase.id);
  const canChoose = inWindow && tokens > 0 && !usedThisPhase;
  const candidates = players.filter((player) => player.id !== activePlayer.id && !player.gameOver);
  if (!canChoose) return null;
  return (
    <div className="rival-panel">
      <div className="rival-heading">
        <div>
          <p className="gd-kicker">Confidential Rival Dossier</p>
          <h3>Name a rival family</h3>
        </div>
        <span className="rival-token-count">{tokens} token{tokens === 1 ? "" : "s"} left</span>
        <p>
          Choose carefully. Your nomination unlocks sabotage cards for this family.
        </p>
      </div>
      <div className="rival-list">
        {candidates.map((player) => (
          <button key={player.id} type="button" onClick={() => onChooseRival(player.id)} disabled={isBusy}>
            <strong>The {player.name} Family</strong>
            <span>{player.playerName || "Player"} · Score {scoreFamily(player)}</span>
            <i>Nominate</i>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecoveryInterlude({ phase, view, isBusy, onAdvance }) {
  return (
    <div className="final-phase">
      <div className="final-phase-hero">
        <img src={asset(phase.image)} alt={phase.title} />
        <div className="final-phase-copy">
          <p className="gd-kicker">Final Phase - {phase.years}</p>
          <h2>{phase.title}</h2>
          <p>{phase.summary}</p>
        </div>
      </div>
      <div className="gd-news final-news">
        <p className="gd-kicker">Public News</p>
        {phase.newsImage && <img src={asset(phase.newsImage)} alt={phase.news} />}
      </div>
      <div className="gd-panel recovery-transition">
        <p className="gd-kicker">Recovery Phase Complete</p>
        <h2>The room is ready to compare outcomes</h2>
        <p>
          This phase closes the historical timeline. Advance once more to reveal the final leaderboard, awards,
          hidden-objective outcomes, and historical debrief.
        </p>
        {view === "host" && <button onClick={onAdvance} disabled={isBusy}>Show final results</button>}
      </div>
    </div>
  );
}

function gameOverImageFor(family) {
  if (family?.gameOver?.reason === "health") return "family-health-crisis.png";
  return "family-danger-state.png";
}

function FamilyGameOver({ family }) {
  const reason = family?.gameOver;
  return (
    <div className="gd-panel family-game-over">
      <img src={asset(gameOverImageFor(family))} alt="" />
      <div>
        <p className="gd-kicker">Family Closing Screen</p>
        <h2>{reason?.title || "The family could not continue"}</h2>
        <p>{reason?.detail || "This family has left the competition and will be scored with a collapse penalty."}</p>
        <p className="gd-sync">
          You can still watch the room continue. Your final score will include a collapse penalty, plus any objective progress already earned.
        </p>
      </div>
    </div>
  );
}

function ResultsPhase({
  players,
  shared,
  scenario,
  rematchScenario,
  view,
  isBusy,
  selectedScenarioId,
  onSelectScenario,
  selectedHardMode,
  onHardModeChange,
  onCreateScenario,
  nextRoomCode,
  onJoinNextRoom,
}) {
  const [resultsScene, setResultsScene] = useState("winner");
  const awards = computeAwards(players, scenario);
  const debrief = historicalDebrief(players, shared);
  const selectedScenario = SCENARIO_OPTIONS.find((option) => option.id === selectedScenarioId) || SCENARIO_OPTIONS[0];
  const scenes = [
    ["winner", "Winner reveal"],
    ["ledgers", "Final ledgers"],
    ["awards", "Awards & standing"],
    ["debrief", "Historical debrief"],
  ];
  return (
    <div className="results-phase">
      <section className="results-tabletop">
        <span className="scene-label">Final table · After action review</span>
        <span className="scene-sound">Room sound · ledger stamp</span>

        {resultsScene === "winner" && (
          <div className="results-table-scene results-winner-scene">
            <div className="results-final-sheet">
              <img src={asset("final-results-ledgers.png")} alt="Families reviewing their final ledgers" />
              <div>
                <p className="gd-kicker">The ledgers are closed</p>
                <h2>Who best kept the dream alive?</h2>
              </div>
            </div>
            {awards[0] && (
              <article className="results-winner-telegram">
                <img src={asset("award-most-resilient-family.png")} alt="Most Resilient Family badge" />
                <div>
                  <span>Final declaration</span>
                  <strong>{awards[0].player.playerName || "Player"} ({awards[0].player.name} Family)</strong>
                  <small>{awards[0].detail}</small>
                </div>
              </article>
            )}
          </div>
        )}

        {resultsScene === "ledgers" && (
          <section className="results-table-scene results-paper results-leaderboard results-leaderboard-scene">
            <p className="gd-kicker">Final Family Ledgers</p>
            <h2>Every choice left a mark</h2>
            <div className="results-ledger-list">
              {players.map((player, index) => (
                <LeaderboardRow player={player} index={index} key={player.id} />
              ))}
            </div>
            <p className="gd-note">Scores reward strong family meters and objectives. Debt, danger, collapse, betrayal, rushed choices, repeated patterns, and exclusion reduce the total.</p>
          </section>
        )}

        {resultsScene === "awards" && (
          <div className="results-table-scene results-awards-scene">
            <section className="results-paper results-awards-sheet">
              <p className="gd-kicker">Room Awards</p>
              <h2>How each family is remembered</h2>
              <div className="award-grid results-award-grid">
                {awards.map((award) => (
                  <div className={award.primary ? "award-card primary" : "award-card"} key={award.id}>
                    <span>{award.primary ? "1" : "-"}</span>
                    <div>
                      <strong>{award.title}</strong>
                      <p>{award.player.playerName || "Player"} ({award.player.name} Family)</p>
                      <small>{award.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <HistoricalStandingsPanel players={players} />
          </div>
        )}

        {resultsScene === "debrief" && (
          <div className="results-table-scene results-debrief-scene">
            <section className="results-paper results-debrief-sheet">
              <p className="gd-kicker">Historical Debrief</p>
              <h2>What this room experienced</h2>
              {debrief.map((takeaway) => <p key={takeaway}>{takeaway}</p>)}
              <p className="historical-method-note">
                Historical standing is a teaching estimate, not a measured census percentile. It compares the final ledger with documented pressures on similar households, including job loss, bank and farm stress, discrimination, relief access, and recovery timing.
              </p>
            </section>
            <section className="results-paper results-rematch-sheet">
              <p className="gd-kicker">Next Table Challenge</p>
              <h2>Choose the next scenario</h2>
              {rematchScenario && <small>Suggested next: {rematchScenario.title}. The host can override it.</small>}
              <ScenarioPicker
                selectedScenarioId={selectedScenarioId}
                onSelect={onSelectScenario}
                hardMode={selectedHardMode}
                onHardModeChange={view === "host" ? onHardModeChange : undefined}
                compact
              />
              {view === "host" && (
                <button onClick={() => onCreateScenario(selectedScenario.id)} disabled={isBusy}>
                  {isBusy
                    ? "Creating..."
                    : `Create next ${selectedHardMode ? "Competitive" : "Standard"} run: ${selectedScenario.title}`}
                </button>
              )}
              {view !== "host" && nextRoomCode && (
                <button onClick={() => onJoinNextRoom(nextRoomCode)} disabled={isBusy}>Join next game: Room {nextRoomCode}</button>
              )}
              {view !== "host" && !nextRoomCode && <small>Waiting for the host to start the next room.</small>}
            </section>
          </div>
        )}
      </section>

      <nav className="results-scene-nav" aria-label="Final results sections">
        {scenes.map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={resultsScene === id ? "active" : ""}
            aria-current={resultsScene === id ? "page" : undefined}
            onClick={() => setResultsScene(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function HistoricalStandingsPanel({ players }) {
  return (
    <div className="gd-panel historical-standings-panel">
      <p className="gd-kicker">Historical Standing</p>
      <h2>Compared with similar families</h2>
      <div className="historical-standing-list">
        {players.map((player) => {
          const historical = historicalStandingFor(player);
          return (
            <div className="historical-standing-card" key={player.id}>
              <div>
                <strong>{player.playerName || "Player"} ({player.name})</strong>
                <span>{historical.percentileLabel} percentile · {historical.band}</span>
              </div>
              <p>Among {historical.cohort}.</p>
              <small>{historical.driver}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabletopStationNav({ activeStation, unreadTelegrams, decisionsDisabled, onSelect }) {
  const stations = [
    ["phase", "Phase reveal"],
    ["news", "News & Town Hall"],
    ["decisions", "Make a decision"],
    ["telegram", "Private telegram"],
  ];
  return (
    <nav className="tabletop-station-nav" aria-label="Tabletop stations">
      <span className="table-rhythm">Read news → discuss → lock 2 cards → resolve together</span>
      {stations.map(([id, label]) => (
        <button
          type="button"
          key={id}
          className={activeStation === id ? "active" : ""}
          aria-current={activeStation === id ? "page" : undefined}
          disabled={id === "decisions" && decisionsDisabled}
          onClick={() => onSelect(id)}
        >
          {label}
          {id === "telegram" && unreadTelegrams > 0 && <b>{unreadTelegrams}</b>}
        </button>
      ))}
    </nav>
  );
}

function PhaseStation({ phase, scenario, shared, phaseIndex }) {
  return (
    <section className="phase-station tabletop-station" aria-label="Current phase">
      <span className="scene-label">1 · Phase begins</span>
      <span className="scene-sound">Host sound · paper laid down</span>
      <div className="phase-station-image">
        <img src={asset(phase.image)} alt={phase.title} />
      </div>
      <div className="phase-stage-copy">
        <p className="gd-kicker">Phase {phaseIndex + 1} · {phase.years}</p>
        <h2>{phase.title}</h2>
        <p>{phase.summary}</p>
        <small className="phase-lesson">Table lesson: {PHASE_LESSONS[phase.id] || "Every household decision is shaped by the wider economy."}</small>
      </div>
      <div className="phase-condition-strip">
        {(phase.conditions || []).map(([label, value, tone]) => (
          <div className={tone || "neutral"} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="phase-table-notes">
        <ScenarioPanel scenario={scenario} shared={shared} />
        <PolicyPanel shared={shared} />
      </div>
    </section>
  );
}

function TelegramInbox({ notices }) {
  const latest = notices[0];
  return (
    <section className="telegram-inbox tabletop-station" aria-label="Private telegram inbox">
      <span className="scene-label">4 · Private event</span>
      <span className="scene-sound">Player sound · telegraph bell</span>
      <article className={`telegram-sheet ${latest ? `telegram-${latest.type}` : ""}`}>
        <span className="wire">{latest?.kicker || "Private wire"}{latest?.years ? ` · ${latest.years}` : ""}</span>
        <h2>{latest?.title || "No private telegrams yet."}</h2>
        <p>{latest?.detail || "Employment notices, family emergencies, hiring results, and rival actions will be filed here."}</p>
        {notices.length > 1 && <small>{notices.length - 1} earlier telegrams retained in this family record.</small>}
      </article>
    </section>
  );
}

function PlayerFamilyLedger({ family }) {
  if (!family) return null;
  const reputation = family.reputation ?? 50;
  const meters = [
    ["Food", family.food],
    ["Health", family.health],
    ["Savings", family.savings],
    ["Debt", family.debt, "debt"],
    ["Hope", family.hope],
    ["Education", family.education],
    ["Stability", family.stability],
    ["Trust", reputation],
  ];
  return (
    <section className="player-family-ledger" aria-label="Private family ledger">
      <img src={asset(familyImageFor(family))} alt={`${family.name} family`} />
      <div className="player-family-identity">
        <p className="gd-kicker">Private Family Ledger</p>
        <h2>The {family.name} Family</h2>
        <span>Background · {family.role}</span>
      </div>
      <div className="player-family-objective">
        <span>Hidden Objective</span>
        <strong>{family.objectiveTitle || "Keep the family secure"}</strong>
        <p>{family.objectiveDetail || family.profile}</p>
      </div>
      <div className="player-ledger-meters">
        {meters.map(([label, value, tone]) => (
          <div className={tone === "debt" ? "ledger-meter debt" : "ledger-meter"} key={label}>
            <span>{label}</span>
            <b>{value ?? 0}</b>
            <i><em style={{ width: `${clamp(value ?? 0)}%` }} /></i>
          </div>
        ))}
      </div>
    </section>
  );
}

function NewsTownHall({ phase, shared, playerCount, players, family, view, selectedClaim, submittedClaim, isBusy, onSelectClaim, onSubmitClaim, onResolveDemoClaims, showDecision, onDecision }) {
  return (
    <section className="news-town-hall">
      <div className="news-bulletin-column">
        <div className="gd-news tabletop-news">
          <p className="gd-kicker">Public News · {phase.years}</p>
          {phase.newsImage && <img src={asset(phase.newsImage)} alt={phase.news} />}
        </div>
        <PhaseEffectsBulletin phase={phase} activePolicy={shared?.activePolicy} />
      </div>
      <TownHallCouncil
        shared={shared}
        playerCount={playerCount}
        players={players}
        phaseId={phase.id}
        family={family}
        view={view}
        selectedClaim={selectedClaim}
        submittedClaim={submittedClaim}
        isBusy={isBusy}
        onSelectClaim={onSelectClaim}
        onSubmitClaim={onSubmitClaim}
        onResolveDemoClaims={onResolveDemoClaims}
      />
      {showDecision && (
        <button className="open-decision-button" type="button" onClick={onDecision}>
          Make a decision
        </button>
      )}
    </section>
  );
}

function PhaseEffectsBulletin({ phase, activePolicy }) {
  const effects = PHASE_ACTION_EFFECTS[phase.id] || [];
  return (
    <aside className="phase-effects-bulletin" aria-label={`Action effects for ${phase.years}`}>
      <header>
        <div>
          <span>Market notice</span>
          <h3>Terms have changed</h3>
        </div>
        <small>Effective this phase</small>
      </header>
      <div className="phase-effects-list">
        {effects.map(([tone, title, detail]) => (
          <div className={`phase-effect-entry ${tone}`} key={title}>
            <i aria-hidden="true">{tone === "buff" ? "↑" : "↓"}</i>
            <p><strong>{title}</strong><span>{detail}</span></p>
          </div>
        ))}
      </div>
      {activePolicy && <p className="phase-policy-effect"><b>Policy in force</b> {activePolicy.title}</p>}
    </aside>
  );
}

function FamilyCard({ family }) {
  if (!family) {
    return <div className="gd-panel"><p className="gd-kicker">Family Profile</p><p>No players yet. Add a player to assign a family.</p></div>;
  }
  return (
    <div className="gd-panel">
      <div className="family-image">
        <img src={asset(familyImageFor(family))} alt={`${family.name} family`} />
      </div>
      <p className="gd-kicker">Family Profile</p>
      <h2>The {family.name} Family</h2>
      <p>{family.playerName}</p>
      <div className="family-background">
        <span>Family Background</span>
        <strong>{family.role}</strong>
        <p>{family.profile}</p>
      </div>
      {family.objectiveTitle && (
        <div className="family-objective">
          <span>Hidden Objective</span>
          <strong>{family.objectiveTitle}</strong>
          <p>{family.objectiveDetail}</p>
        </div>
      )}
    </div>
  );
}

function Meters({ family }) {
  const meters = ["food", "health", "savings", "hope", "education", "stability"];
  const reputation = family.reputation ?? 50;
  return (
    <div className="gd-panel">
      <p className="gd-kicker">Family Meters</p>
      {meters.map((key) => (
        <div className="meter" key={key}>
          <span>{key}</span>
          <div><i style={{ width: `${family[key]}%` }} /></div>
          <b>{family[key]}</b>
        </div>
      ))}
      <div className="meter debt"><span>debt</span><div><i style={{ width: `${family.debt}%` }} /></div><b>{family.debt}</b></div>
      <div className="meter reputation">
        <span>trust</span>
        <div><i style={{ width: `${Math.max(0, Math.min(100, ((reputation + 30) / 130) * 100))}%` }} /></div>
        <b>{reputation}</b>
      </div>
      {!!family.exploitMarkers && <p className="gd-sync">Exploit markers: {family.exploitMarkers}</p>}
    </div>
  );
}

const CLAIM_OPTIONS = [
  ["work", "Compete for work", "Employment", "action-search-any-work-bust-v2.png"],
  ["relief", "Seek relief", "Immediate aid", "action-accept-relief-bust-v2.png"],
  ["community", "Support the community", "Shared protection", "action-join-mutual-aid-bust-v2.png"],
  ["household", "Protect the household", "Family security", "action-build-emergency-fund-boom-v2.png"],
];

function familyExposure(family) {
  if (!family) return "Assign a family to receive a private exposure note.";
  const risks = [
    ["Food", family.food], ["Health", family.health], ["Savings", family.savings],
    ["Hope", family.hope], ["Stability", family.stability],
  ].sort((a, b) => a[1] - b[1]);
  return `${family.role}: ${risks[0][0]} is currently the household's greatest exposure at ${risks[0][1]}.`;
}

function TownHallCouncil({ shared, playerCount = 0, players = [], phaseId, family, view, selectedClaim, submittedClaim, isBusy, onSelectClaim, onSubmitClaim, onResolveDemoClaims }) {
  const current = shared || {
    trust: 55,
    communityPot: 3,
    workSlots: 1,
    reliefSlots: 1,
    communityNeed: 2,
    lastRound: "No shared decision has resolved yet.",
  };
  const trustStatus = current.trust >= 68 ? "good" : current.trust <= 35 ? "bad" : "warn";
  const potStatus = current.communityPot >= current.communityNeed ? "good" : current.communityPot <= 1 ? "bad" : "warn";
  const familiesCompeting = Math.max(1, playerCount);
  const workScarce = current.workSlots < familiesCompeting;
  const reliefScarce = current.reliefSlots < familiesCompeting;
  const townHall = current.townHall || {
    claimsReceived: 0,
    eligibleCount: familiesCompeting,
    resolved: false,
    counts: { work: 0, relief: 0, community: 0, household: 0 },
    demoClaimsRemaining: 0,
    dangerCount: 0,
  };
  const canResolveDemoClaims = view === "host" && townHall.demoClaimsRemaining > 0;
  const canSubmit = view === "player" && !submittedClaim;
  const selection = submittedClaim || selectedClaim;
  return (
    <div className="town-hall-council">
      <header className="council-masthead">
        <div>
          <p className="gd-kicker">Town Hall</p>
          <h2>Town Hall Council</h2>
        </div>
        {townHall.dangerCount > 0 && (
          <span className="council-risk-stamp">{townHall.dangerCount} {townHall.dangerCount === 1 ? "family" : "families"} at risk</span>
        )}
      </header>
      <div className="council-scarcity" aria-label="Town scarcity">
        <div className={workScarce ? "scarce" : ""}>
          <span>Work slots</span>
          <strong>{current.workSlots}</strong>
          <small>{workScarce ? `short of ${familiesCompeting}` : ""}</small>
        </div>
        <div className={reliefScarce ? "scarce" : ""}>
          <span>Relief slots</span>
          <strong>{current.reliefSlots}</strong>
          <small>{reliefScarce ? `short of ${familiesCompeting}` : ""}</small>
        </div>
        <div className={potStatus}>
          <span>Community pot</span>
          <strong>{current.communityPot}/{current.communityNeed}</strong>
          <small />
        </div>
      </div>
      <div className="council-progress">
        <span>{townHall.claimsReceived} of {townHall.eligibleCount} priorities placed</span>
        <i><b style={{ width: `${townHall.eligibleCount ? townHall.claimsReceived / townHall.eligibleCount * 100 : 0}%` }} /></i>
      </div>
      <div className="council-body">
        <div className="council-claims" aria-label="Provisional priorities">
          {CLAIM_OPTIONS.map(([id, title, focus, image]) => (
            <button
              type="button"
              className={`provisional-claim ${selection === id ? "selected" : ""}`}
              key={id}
              onClick={() => onSelectClaim(id)}
              disabled={Boolean(submittedClaim) || (!canSubmit && !canResolveDemoClaims) || isBusy}
              aria-pressed={selection === id}
            >
              <img src={asset(image)} alt="" />
              <strong>{title}</strong>
              <small>{townHall.resolved ? `${townHall.counts[id]} ${townHall.counts[id] === 1 ? "family" : "families"}` : focus}</small>
            </button>
          ))}
        </div>
      </div>
      <aside className="council-private-note council-private-note-wide">
        <div>
          <span>Private · family exposure</span>
          <strong>{family?.name ? `${family.name} Family` : "Family notice"}</strong>
        </div>
        <p>{familyExposure(family)}</p>
        <small>Claims are provisional and carry no penalty. Room totals reveal together.</small>
      </aside>
      <section className="council-intention-roster" aria-label="Family intentions">
        <div className="council-roster-heading"><span>Family intentions</span><small>Visible provisional claims</small></div>
        <div className="council-roster-grid">
          {players.map((player) => {
            const claimId = player.provisionalClaims?.[phaseId];
            const claimTitle = CLAIM_OPTIONS.find(([id]) => id === claimId)?.[1];
            return (
              <div className={claimId ? "has-claim" : "pending"} key={player.id}>
                <span>{player.playerName || "Player"} · {player.name} Family</span>
                <strong>{claimTitle || "Awaiting priority"}</strong>
              </div>
            );
          })}
        </div>
      </section>
      {current.activePolicy && <div className="council-policy"><span>Policy in force</span><strong>{current.activePolicy.title}</strong><p>{current.activePolicy.detail}</p></div>}
      <footer className="council-footer">
        <details className="community-record">
          <summary>Town record</summary>
          <p className="community-last">{current.lastRound}</p>
          <small>Trust climate {current.trust} · Safety threshold {current.communityNeed} · Surplus threshold {current.communitySurplusNeed ?? current.communityNeed + Math.ceil(familiesCompeting / 2)}</small>
        </details>
        {(canSubmit || canResolveDemoClaims) && !submittedClaim && (
          <button className="place-priority" type="button" disabled={!selectedClaim || isBusy} onClick={() => canResolveDemoClaims ? onResolveDemoClaims(selectedClaim) : onSubmitClaim(selectedClaim)}>
            {canResolveDemoClaims ? `Place ${townHall.demoClaimsRemaining} demo priorities` : "Place priority"}
          </button>
        )}
        {submittedClaim && <span className="priority-sealed">Priority placed · waiting for the room</span>}
        {townHall.resolved && <span className="priority-revealed">Priorities revealed · Decisions unlocked</span>}
      </footer>
    </div>
  );
}

function ScenarioPanel({ scenario, shared }) {
  const event = shared?.eventVariant;
  const scenarioEvent = shared?.scenarioEvent;
  if (!scenario && !event && !scenarioEvent) return null;
  return (
    <div className="gd-panel scenario-panel">
      <p className="gd-kicker">Table Scenario</p>
      {scenario && (
        <div className="scenario-entry primary">
          <span>{scenario.hardMode ? "Hard Mode variant" : "Room variant"}</span>
          <strong>{scenario.title}</strong>
          <p>{scenario.hardMode ? `${scenario.detail} Scarcity is tighter and rival sabotage is enabled.` : scenario.detail}</p>
        </div>
      )}
      {event && (
        <div className="scenario-entry">
          <span>This phase</span>
          <strong>{event.title}</strong>
          <p>{event.detail}</p>
        </div>
      )}
      {scenarioEvent && (
        <div className="scenario-entry">
          <span>Scenario pressure</span>
          <strong>{scenarioEvent.title}</strong>
          <p>{scenarioEvent.detail}</p>
        </div>
      )}
    </div>
  );
}

function PolicyPanel({ shared }) {
  const policy = shared?.activePolicy;
  const shock = shared?.lastShock;
  if (!policy && !shock) return null;
  return (
    <div className="gd-panel policy-panel">
      <p className="gd-kicker">Government And Labor Shock</p>
      {policy && (
        <div className="policy-entry">
          <span>Policy in effect</span>
          <strong>{policy.title}</strong>
          <p>{policy.detail}</p>
          {policy.expiresAfterPhaseIndex != null && <small className="policy-in-force">The table will feel this decision for the next two phases.</small>}
        </div>
      )}
      {shock && (
        <div className="policy-entry shock">
          <span>{shock.title}</span>
          <strong>{shock.count} families affected</strong>
          <p>{shock.detail}</p>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ players, shared, scenario, rematchScenario, title = "Final Leaderboard", showAwards = true, showDebrief = true }) {
  const awards = computeAwards(players, scenario);
  const debrief = historicalDebrief(players, shared);
  return (
    <div className="gd-panel leaderboard">
      <p className="gd-kicker">{title}</p>
      <h2>Scores include danger penalties</h2>
      {showAwards && awards[0] && (
        <div className="winner-badge">
          <img src={asset("award-most-resilient-family.png")} alt="Most Resilient Family badge" />
          <div>
            <p className="gd-kicker">Winner</p>
            <h3>{awards[0].player.playerName || "Player"} ({awards[0].player.name} Family)</h3>
            <p>{awards[0].detail}</p>
          </div>
        </div>
      )}
      {players.map((player, index) => (
        <LeaderboardRow player={player} index={index} key={player.id} />
      ))}
      <p className="gd-note">Each row shows how that family reached its score. Higher meters help; debt, danger lows, collapse, betrayal, rushed play, predictable play, and community exclusion pull the score down.</p>
      {showAwards && <div className="award-grid">
        {awards.map((award) => (
          <div className={award.primary ? "award-card primary" : "award-card"} key={award.id}>
            <span>{award.primary ? "★" : "•"}</span>
            <div>
              <strong>{award.title}</strong>
              <p>{award.player.playerName || "Player"} ({award.player.name} Family)</p>
              <small>{award.detail}</small>
            </div>
          </div>
        ))}
      </div>}
      {rematchScenario && (
        <div className="rematch-panel">
          <p className="gd-kicker">Next Table Challenge</p>
          <h3>{rematchScenario.title}</h3>
          <p>{rematchScenario.detail}</p>
          <small>{rematchScenario.rematchPrompt}</small>
        </div>
      )}
      {showDebrief && <div className="debrief-panel">
        <p className="gd-kicker">Historical Debrief</p>
        <h3>What this room experienced</h3>
        {debrief.map((takeaway) => (
          <p key={takeaway}>{takeaway}</p>
        ))}
      </div>}
    </div>
  );
}

function LeaderboardRow({ player, index }) {
  const objective = objectiveResult(player);
  const notes = scoreNotes(player);
  const outcome = familyOutcomeSummary(player);
  return (
    <div className="leader-row" key={player.id}>
      <b>{index + 1}</b>
      <span>
        {player.playerName || "Player"} ({player.name} Family)
        <small>Trust {player.reputation ?? 50} · Exploit markers {player.exploitMarkers || 0}</small>
        {player.gameOver && <small>Collapsed: {player.gameOver.title}</small>}
        {player.objectiveTitle && (
          <small>{objective.completed ? "+10" : "0"} objective: {player.objectiveTitle}</small>
        )}
        <small className="score-breakdown">Score path: {scoreBreakdown(player)}</small>
        {!!notes.length && <small className="score-notes">{notes.join(" · ")}</small>}
        <small className="family-outcome">{outcome.strength}</small>
        <small className="family-outcome">{outcome.cost}</small>
      </span>
      <strong>{player.score}</strong>
    </div>
  );
}

function RootApp() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

export default RootApp;
