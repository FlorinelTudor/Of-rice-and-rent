import React, { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const player = {
  id: "player-1",
  name: "Rosen",
  playerName: "Alex",
  role: "Main Street shopkeepers",
  profile: "A family-owned neighborhood shop balancing cash and customer trust.",
  objectiveTitle: "Keep the shop solvent",
  objectiveDetail: "Finish with strong savings and community standing.",
  food: 68,
  health: 72,
  savings: 61,
  debt: 37,
  hope: 65,
  education: 58,
  stability: 70,
  reputation: 63,
  choices: {},
};

const actionImpacts = {
  keep_factory_job: { food: 6, savings: 9, hope: -5, stability: 16 },
};
const testAction = (id, title = id) => ({ id, title, detail: "Test card detail", impact: actionImpacts[id] || {} });
const postwarActions = [
  testAction("keep_factory_job", "Keep factory job"), testAction("use_savings_food", "Use savings for food"),
  testAction("move_to_city", "Move closer to work"), testAction("take_store_credit", "Buy on store credit"),
  testAction("pull_child_school", "Older child works"), testAction("join_mutual_aid", "Join mutual aid"),
  testAction("contribute_community_pot", "Share supplies"),
];

const room = {
  roomCode: "TEST",
  players: [player],
  shared: {
    trust: 55,
    communityPot: 3,
    communityNeed: 8,
    workSlots: 2,
    reliefSlots: 3,
    lastRound: "No shared decision has resolved yet.",
  },
  scenario: { id: "easy_credit", title: "Easy Credit", detail: "Comfort comes easily." },
  phaseIndex: 0,
};

function savedPlayerState() {
  return {
    version: "blob-multiplayer-v2",
    view: "player",
    roomCode: room.roomCode,
    players: room.players,
    shared: room.shared,
    scenario: room.scenario,
    phaseIndex: room.phaseIndex,
    activePlayerId: player.id,
    playerName: player.playerName,
    actionImpacts,
    availableActions: postwarActions,
  };
}

describe("staged tabletop experience", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    window.scrollTo = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    global.fetch = jest.fn(() => new Promise(() => {}));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  test("opens with the warm 1919 family entrance and player action", async () => {
    await act(async () => root.render(<App />));

    expect(container.querySelector(".gd-home-ledger")).not.toBeNull();
    expect(container.textContent).toContain("Take your place at the table");
    expect(container.textContent).toContain("Join as player");
    expect(container.querySelector('img[src*="homepage-family-1919.png"]')).not.toBeNull();
  });

  test("uses the approved four-station tabletop for every phase", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify(savedPlayerState()));
    await act(async () => root.render(<App />));

    expect(container.querySelector(".tabletop-surface")).not.toBeNull();
    const newsButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("News & Town Hall")
    );
    await act(async () => newsButton.click());
    expect(container.querySelector(".news-scene .player-family-ledger")).not.toBeNull();
    expect(container.textContent).toContain("Main Street shopkeepers");
    expect(container.textContent).toContain("Keep the shop solvent");
    expect(container.querySelector(".tabletop-surface + .tabletop-station-nav")).not.toBeNull();
    expect(container.querySelectorAll(".tabletop-station-nav button")).toHaveLength(4);
    expect(container.querySelector(".news-town-hall")).not.toBeNull();
    expect(container.querySelector(".news-bulletin-column")).not.toBeNull();
    expect(container.querySelector(".phase-effects-bulletin")).not.toBeNull();
    expect(container.querySelectorAll(".phase-effect-entry")).toHaveLength(2);
    expect(container.textContent).toContain("Stable work protects the ledger");
    expect(container.textContent).toContain("Community pot");
    expect(container.querySelector(".gd-choice-grid")).toBeNull();

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    expect(decisionButton).toBeDefined();
    await act(async () => decisionButton.click());

    const choiceButton = container.querySelector(".gd-choice-grid button");
    expect(choiceButton).not.toBeNull();
    const choiceGrid = container.querySelector(".gd-choice-grid");
    expect(choiceGrid.dataset.choiceCount).toBe(String(choiceGrid.querySelectorAll("button").length));
    expect(choiceGrid.classList.contains("choice-layout-standard")).toBe(true);
    expect(choiceGrid.classList.contains("choice-hand")).toBe(true);
    expect(choiceGrid.classList.contains("choice-era-neutral")).toBe(true);
    expect(choiceGrid.querySelectorAll("button").length).toBeGreaterThanOrEqual(7);
    expect(choiceButton.style.getPropertyValue("--fan-position")).not.toBe("");
    const choiceButtons = choiceGrid.querySelectorAll("button");
    expect(choiceButtons[0].style.getPropertyValue("--fan-hover-shift")).toBe("58px");
    expect(choiceButtons[choiceButtons.length - 1].style.getPropertyValue("--fan-hover-shift")).toBe("-58px");
    expect(choiceGrid.querySelectorAll("em")).toHaveLength(0);
    expect(choiceButton.textContent).toMatch(/\+ Food \d+/);
    await act(async () => choiceButton.click());
    expect(choiceButton.querySelector(".choice-selection-stamp")?.textContent).toContain("Choice made");
  });

  test("keeps the town record available without crowding the scarcity board", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify(savedPlayerState()));
    await act(async () => root.render(<App />));

    const newsButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("News & Town Hall")
    );
    await act(async () => newsButton.click());

    expect(container.querySelector(".community-record")).not.toBeNull();
    expect(container.querySelector(".community-record summary")?.textContent).toContain("Town record");
  });

  test("keeps decisions locked until every family places a provisional claim", async () => {
    const secondPlayer = { ...player, id: "player-2", name: "Novak", playerName: "Morgan", provisionalClaims: { postwar: "relief" } };
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      players: [{ ...player, provisionalClaims: {} }, secondPlayer],
      shared: {
        ...room.shared,
        townHall: {
          claimsReceived: 0,
          eligibleCount: 2,
          resolved: false,
          counts: { work: 0, relief: 0, community: 0, household: 0 },
        },
      },
    }));
    await act(async () => root.render(<App />));

    const newsButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent.includes("News & Town Hall"));
    const decisionButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent.includes("Make a decision"));
    expect(decisionButton.disabled).toBe(true);
    await act(async () => newsButton.click());
    expect(container.querySelector(".town-hall-council")).not.toBeNull();
    expect(container.querySelectorAll(".provisional-claim")).toHaveLength(4);
    expect(container.querySelectorAll(".provisional-claim img")).toHaveLength(4);
    expect(container.querySelector(".council-private-note-wide")).not.toBeNull();
    expect(container.textContent).toContain("0 of 2 priorities placed");
    expect(container.querySelector(".council-intention-roster")?.textContent).toContain("Morgan");
    expect(container.querySelector(".council-intention-roster")?.textContent).toContain("Seek relief");
    expect(container.querySelector(".council-intention-roster")?.textContent).toContain("Awaiting priority");
  });

  test("uses hopeful human artwork for boom action cards", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(), phaseIndex: 3,
      availableActions: [testAction("invest_stocks", "Invest savings in stocks")],
    }));
    await act(async () => root.render(<App />));

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    await act(async () => decisionButton.click());
    const investCard = Array.from(container.querySelectorAll(".gd-choice-grid button")).find(
      (button) => button.textContent.includes("Invest savings in stocks")
    );

    expect(container.querySelector(".gd-choice-grid").classList.contains("choice-era-boom")).toBe(true);
    expect(investCard.querySelector("img").getAttribute("src")).toContain("action-invest-stocks-boom-v2.png");
  });

  test("uses distressed human artwork for bust action cards", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(), phaseIndex: 4,
      availableActions: [testAction("sell_stocks_now", "Sell remaining stocks")],
    }));
    await act(async () => root.render(<App />));

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    await act(async () => decisionButton.click());
    const sellCard = Array.from(container.querySelectorAll(".gd-choice-grid button")).find(
      (button) => button.textContent.includes("Sell remaining stocks")
    );

    expect(container.querySelector(".gd-choice-grid").classList.contains("choice-era-bust")).toBe(true);
    expect(sellCard.querySelector("img").getAttribute("src")).toContain("action-sell-stocks-now-bust-v2.png");
  });

  test("shows choice consequences before a repeated action is locked in", async () => {
    const repeatedPlayer = {
      ...player,
      choiceRepeatCounts: { keep_factory_job: 3 },
    };
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      players: [repeatedPlayer],
      activePlayerId: repeatedPlayer.id,
      shared: { ...room.shared, phaseStartedAt: new Date(Date.now() - 6000).toISOString() },
    }));
    await act(async () => root.render(<App />));

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    await act(async () => decisionButton.click());
    const repeatedChoice = Array.from(container.querySelectorAll(".gd-choice-grid button")).find(
      (button) => button.textContent.includes("Keep factory job")
    );
    await act(async () => repeatedChoice.click());

    expect(container.querySelector(".choice-consequence-strip")).not.toBeNull();
    expect(container.textContent).toContain("Repeated action reduces this round's gains");
    expect(Array.from(container.querySelectorAll(".gd-submit")).some((button) => button.textContent.includes("Lock in with consequences"))).toBe(true);
  });

  test("keeps acknowledged private notices in the telegram station", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      telegramArchive: [{
        key: "player-1-postwar-job-loss",
        type: "job",
        kicker: "Private Family Notice",
        title: "Main job lost",
        detail: "Your family lost its main job this phase.",
        phaseId: "postwar",
        years: "1919-1920",
      }],
      readTelegramKeys: ["player-1-postwar-job-loss"],
    }));
    await act(async () => root.render(<App />));

    const telegramButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Private telegram")
    );
    expect(telegramButton).toBeDefined();
    await act(async () => telegramButton.click());

    expect(container.querySelector(".telegram-inbox")).not.toBeNull();
    expect(container.textContent).toContain("Main job lost");
    expect(container.textContent).toContain("1919-1920");
  });

  test("exposes a persistent sound control", async () => {
    await act(async () => root.render(<App />));

    const soundToggle = container.querySelector(".tabletop-sound-toggle");
    expect(soundToggle).not.toBeNull();
    expect(soundToggle.getAttribute("aria-label")).toMatch(/sound/i);
  });

  test("presents hard mode as an accessible rivalry challenge card", async () => {
    window.history.replaceState({}, "", "/?newHost=1");
    await act(async () => root.render(<App />));

    const hardMode = container.querySelector(".hard-mode-toggle");
    expect(hardMode).not.toBeNull();
    expect(hardMode.textContent).toContain("Competitive Mode");
    expect(hardMode.getAttribute("aria-pressed")).toBe("false");
    expect(hardMode.querySelector(".hard-mode-switch")).not.toBeNull();

    await act(async () => hardMode.click());
    expect(hardMode.getAttribute("aria-pressed")).toBe("true");
    expect(hardMode.textContent).toContain("Rivalry Active");
  });

  test("releases the phase table after the shorter 3.5 second reveal", async () => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      view: "player",
    }));
    await act(async () => root.render(<App />));
    expect(container.querySelector(".phase-reveal")).not.toBeNull();

    await act(async () => jest.advanceTimersByTime(3501));
    expect(container.querySelector(".phase-reveal")).toBeNull();
    jest.useRealTimers();
  });

  test("stages final results through the approved tabletop scenes", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      phaseIndex: 11,
      players: [{ ...player, score: 412 }],
    }));
    await act(async () => root.render(<App />));

    expect(container.querySelector(".results-tabletop")).not.toBeNull();
    expect(container.querySelector(".results-winner-scene")).not.toBeNull();
    expect(container.querySelectorAll(".results-scene-nav button")).toHaveLength(4);

    const ledgersButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Final ledgers")
    );
    await act(async () => ledgersButton.click());
    expect(container.querySelector(".results-leaderboard-scene")).not.toBeNull();

    const awardsButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Awards & standing")
    );
    await act(async () => awardsButton.click());
    expect(container.querySelector(".results-awards-scene")).not.toBeNull();

    const debriefButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Historical debrief")
    );
    await act(async () => debriefButton.click());
    expect(container.querySelector(".results-debrief-scene")).not.toBeNull();
  });

  test("lets the host choose Competitive Mode for the next scenario", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      view: "host",
      hostToken: "host-secret",
      phaseIndex: 11,
      players: [{ ...player, score: 412 }],
    }));
    await act(async () => root.render(<App />));

    const debriefButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Historical debrief")
    );
    await act(async () => debriefButton.click());

    const competitiveMode = container.querySelector(".results-rematch-sheet .hard-mode-toggle");
    expect(competitiveMode).not.toBeNull();
    expect(competitiveMode.getAttribute("aria-pressed")).toBe("false");

    await act(async () => competitiveMode.click());
    expect(competitiveMode.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".results-rematch-sheet").textContent).toContain("Competitive run");
  });

  test("uses a dense overview when emergency and rivalry cards expand the hand", async () => {
    const rival = { ...player, id: "player-2", name: "Carter", playerName: "Morgan" };
    const pressuredPlayer = {
      ...player,
      rivalId: rival.id,
      collapseWarning: { emergencyChoiceId: "emergency_health" },
      employmentShock: { phaseId: "deepening" },
    };
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      players: [pressuredPlayer, rival],
      activePlayerId: pressuredPlayer.id,
      phaseIndex: 5,
      scenario: { ...room.scenario, hardMode: true },
      availableActions: Array.from({ length: 10 }, (_, index) => testAction(`dense-${index}`, `Dense card ${index + 1}`)),
    }));
    await act(async () => root.render(<App />));

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    await act(async () => decisionButton.click());
    const choiceGrid = container.querySelector(".gd-choice-grid");
    expect(choiceGrid.classList.contains("choice-layout-dense")).toBe(true);
    expect(Number(choiceGrid.dataset.choiceCount)).toBeGreaterThan(8);
    expect(choiceGrid.querySelectorAll("button")).toHaveLength(Number(choiceGrid.dataset.choiceCount));
  });

  test("shows a secret policy ballot and anonymous vote progress", async () => {
    jest.useFakeTimers();
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      phaseIndex: 6,
      shared: {
        ...room.shared,
        policyVote: {
          id: "banking_crisis_vote",
          phaseId: "bank_holiday",
          title: "How should Washington answer the banking crisis?",
          detail: "Every family votes in secret.",
          votesReceived: 0,
          eligibleCount: 1,
          resolved: false,
          options: [
            { id: "bank_stabilization", title: "Stabilize the banks", detail: "Reopen sound banks.", historical: "Historical status quo" },
            { id: "household_assistance", title: "Emergency household aid", detail: "Fund food and medicine." },
          ],
        },
      },
    }));
    await act(async () => root.render(<App />));
    await act(async () => jest.advanceTimersByTime(351));

    expect(container.querySelector(".policy-vote-modal")).not.toBeNull();
    expect(container.textContent).toContain("Secret ballot");
    expect(container.textContent).toContain("Historical status quo");
    expect(container.querySelector(".policy-ballot-art")).toBeNull();
    expect(container.querySelector(".policy-dossier-header")).not.toBeNull();
    expect(container.querySelector(".policy-ballot-progress")?.textContent).toContain("0 of 1 ballots sealed");
    expect(container.querySelectorAll(".policy-option")).toHaveLength(2);
    expect(container.querySelectorAll(".policy-option-number")[0].textContent).toBe("Proposal A");
    expect(container.querySelector(".policy-submit").disabled).toBe(true);
    await act(async () => container.querySelectorAll(".policy-option")[0].click());
    expect(container.querySelector(".policy-submit").disabled).toBe(false);
    expect(container.querySelectorAll(".policy-option")[0].textContent).toContain("Ballot marked");
    expect(container.textContent).toContain("Submit secret vote");
    jest.useRealTimers();
  });

  test("lets a host resolve ballots for built-in demo families", async () => {
    jest.useFakeTimers();
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      view: "host",
      hostToken: "host-test-token",
      phaseIndex: 6,
      shared: {
        ...room.shared,
        policyVote: {
          id: "banking_crisis_vote",
          phaseId: "bank_holiday",
          title: "How should Washington answer the banking crisis?",
          detail: "Every family votes in secret.",
          votesReceived: 0,
          eligibleCount: 8,
          demoVotesRemaining: 8,
          resolved: false,
          options: [
            { id: "bank_stabilization", title: "Stabilize the banks", detail: "Reopen sound banks.", historical: "Historical status quo" },
            { id: "household_assistance", title: "Emergency household aid", detail: "Fund food and medicine." },
          ],
        },
      },
    }));
    await act(async () => root.render(<App />));
    await act(async () => jest.advanceTimersByTime(351));

    expect(container.textContent).toContain("Record demo ballots");
    expect(container.querySelectorAll(".policy-option")).toHaveLength(2);
    expect(container.querySelector(".policy-submit").disabled).toBe(true);
    await act(async () => container.querySelectorAll(".policy-option")[0].click());
    expect(container.querySelector(".policy-submit").disabled).toBe(false);
    jest.useRealTimers();
  });

  test("turns submitted decisions face down while families finish", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      players: [{ ...player, choices: { postwar: ["keep_factory_job", "contribute_community_pot"] } }],
    }));
    await act(async () => root.render(<App />));

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    await act(async () => decisionButton.click());
    expect(container.querySelectorAll(".submitted-card-back")).toHaveLength(2);
    expect(container.textContent).toContain("1/1 families ready");
  });

  test("shows Town Hall only once on the host table", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      view: "host",
      hostToken: "host-test-token",
      activePlayerId: "",
    }));
    await act(async () => root.render(<App />));

    const newsButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("News & Town Hall")
    );
    await act(async () => newsButton.click());
    expect(container.querySelectorAll(".town-hall-council")).toHaveLength(1);
    expect(container.querySelector(".news-scene .player-family-ledger")).toBeNull();

    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    expect(decisionButton.disabled).toBe(true);
  });

  test("lets a host with an assigned family open decisions on the tabletop", async () => {
    window.localStorage.setItem("gd-game-state", JSON.stringify({
      ...savedPlayerState(),
      view: "host",
      hostToken: "host-test-token",
      activePlayerId: player.id,
    }));
    await act(async () => root.render(<App />));

    expect(container.querySelector(".tabletop-phase")).not.toBeNull();
    const newsButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("News & Town Hall")
    );
    await act(async () => newsButton.click());
    expect(container.querySelector(".news-scene .player-family-ledger")).not.toBeNull();
    expect(container.querySelector(".tabletop-phase > .tabletop-table-rail")).not.toBeNull();
    const decisionButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent.includes("Make a decision")
    );
    expect(decisionButton).toBeDefined();

    await act(async () => decisionButton.click());
    expect(container.querySelector(".gd-choice-grid")).not.toBeNull();
  });
});
