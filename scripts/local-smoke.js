const DEFAULT_BASE_URL = "http://127.0.0.1:4173/api/game";
const MAX_PLAYERS = 8;
const phaseIds = ["postwar", "recession_1921", "early_boom", "speculation", "crash", "deepening", "bank_holiday", "work_relief", "second", "defense_shift"];

const phaseChoices = [
  ["keep_factory_job", "contribute_community_pot"],
  ["use_savings_food", "hoard_relief"],
  ["buy_radio_credit", "pay_down_debt"],
  ["invest_stocks", "undercut_wages"],
  ["sell_stocks_now", "withdraw_bank_cash"],
  ["cut_food_rent", "hoard_relief"],
  ["apply_public_works", "contribute_community_pot"],
  ["stay_public_works", "hoard_relief"],
  ["stay_public_works", "contribute_community_pot"],
  ["seek_defense_work", "inform_on_black_market"],
];

const policyOptions = {
  deepening: ["reconstruction_loans", "direct_federal_relief"],
  bank_holiday: ["bank_stabilization", "household_assistance"],
  work_relief: ["public_works", "direct_relief"],
  second: ["fiscal_retrenchment", "sustain_recovery_spending"],
  defense_shift: ["defense_contracts", "civilian_recovery"],
};

async function completePolicyVote(baseUrl, roomCode, state, { tie = false } = {}) {
  const policy = state.room.shared?.policyVote;
  if (!policy || policy.resolved) return state;
  const options = policyOptions[policy.phaseId];
  const activePlayers = state.room.players.filter((player) => !player.gameOver);
  for (const [index, player] of activePlayers.entries()) {
    await request(baseUrl, `/rooms/${roomCode}/policy-vote`, {
      method: "POST",
      body: JSON.stringify({ player_id: player.id, option_id: tie ? options[index % 2] : options[0] }),
    });
  }
  const next = await request(baseUrl, `/rooms/${roomCode}`);
  if (!next.room.shared.policyVote?.resolved) throw new Error(`Expected ${policy.phaseId} policy vote to resolve.`);
  if (tie && activePlayers.length % 2 === 0 && next.room.shared.policyVote.result.winnerId !== options[0]) {
    throw new Error(`Expected a tied ${policy.phaseId} vote to preserve historical status quo.`);
  }
  return next;
}

function getBaseUrl() {
  const baseUrl = process.env.GAME_API_URL || DEFAULT_BASE_URL;
  const parsed = new URL(baseUrl);
  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";

  if (!isLocal && process.env.ALLOW_PUBLIC_SMOKE !== "1") {
    throw new Error(
      `Refusing to run quota-heavy smoke test against ${baseUrl}. ` +
        "Use localhost, or set ALLOW_PUBLIC_SMOKE=1 intentionally."
    );
  }

  return baseUrl.replace(/\/$/, "");
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} returned ${response.status}: ${text.slice(0, 240)}`);
  }

  return payload;
}

async function createFullRoom(baseUrl, prefix) {
  const created = await request(baseUrl, "/rooms", { method: "POST", body: JSON.stringify({}) });
  const roomCode = created.room.roomCode;
  const stamp = Date.now();

  await Promise.all(
    Array.from({ length: MAX_PLAYERS }, (_, index) =>
      request(baseUrl, `/rooms/${roomCode}/join`, {
        method: "POST",
        body: JSON.stringify({
          player_name: `${prefix} ${index + 1}`,
          client_id: `${prefix.toLowerCase().replace(/\s+/g, "-")}-${stamp}-${index}`,
        }),
      })
    )
  );

  return { roomCode, hostToken: created.hostToken };
}

async function assertHardBetrayal(baseUrl) {
  const { roomCode } = await createFullRoom(baseUrl, "Betrayal Probe");
  let state = await request(baseUrl, `/rooms/${roomCode}`);
  const betrayer = state.room.players[0];

  await Promise.all(
    state.room.players.map((player, index) =>
      request(baseUrl, `/rooms/${roomCode}/choices`, {
        method: "POST",
        body: JSON.stringify({
          player_id: player.id,
          choices: index === 0 ? ["keep_factory_job", "hoard_relief"] : ["keep_factory_job", "contribute_community_pot"],
        }),
      })
    )
  );

  state = await request(baseUrl, `/rooms/${roomCode}`);
  const hiringResults = state.room.players.filter((player) => player.hiringResult?.phaseId === "postwar").length;
  if (hiringResults !== MAX_PLAYERS) {
    throw new Error(`Expected every work applicant to receive a hiring result, got ${hiringResults}/${MAX_PLAYERS}`);
  }
  const updatedBetrayer = state.room.players.find((player) => player.id === betrayer.id);
  if ((updatedBetrayer.exploitMarkers || 0) < 2) {
    throw new Error(`Expected hard betrayal to apply at least 2 exploit markers, got ${updatedBetrayer.exploitMarkers || 0}`);
  }
  if ((updatedBetrayer.reputation ?? 50) > 20) {
    throw new Error(`Expected hard betrayal to sharply damage trust, got ${updatedBetrayer.reputation}`);
  }
}

async function assertScenarioSelection(baseUrl) {
  const created = await request(baseUrl, "/rooms", { method: "POST", body: JSON.stringify({ scenario_id: "bank_panic" }) });
  if (created.room.scenario?.id !== "bank_panic") {
    throw new Error(`Expected host-selected Bank Panic scenario, got ${created.room.scenario?.id || "none"}`);
  }
}

async function assertHardModeNemesis(baseUrl) {
  const created = await request(baseUrl, "/rooms", { method: "POST", body: JSON.stringify({ scenario_id: "bank_panic", hard_mode: true }) });
  const roomCode = created.room.roomCode;
  const hostToken = created.hostToken;
  if (!created.room.scenario?.hardMode) throw new Error("Expected Hard Mode room to expose hardMode=true.");
  const stamp = Date.now();
  await request(baseUrl, `/rooms/${roomCode}/join`, {
    method: "POST",
    body: JSON.stringify({ player_name: "Nemesis One", client_id: `nemesis-one-${stamp}` }),
  });
  await request(baseUrl, `/rooms/${roomCode}/join`, {
    method: "POST",
    body: JSON.stringify({ player_name: "Nemesis Two", client_id: `nemesis-two-${stamp}` }),
  });
  for (let i = 0; i < 3; i += 1) {
    await request(baseUrl, `/rooms/${roomCode}/advance`, {
      method: "POST",
      body: JSON.stringify({ host_token: hostToken }),
    });
  }
  let state = await request(baseUrl, `/rooms/${roomCode}`);
  if (state.room.phaseIndex !== 3) throw new Error(`Expected speculation rival window, got phase ${state.room.phaseIndex}.`);
  const attacker = state.room.players[0];
  const target = state.room.players[1];
  state = await request(baseUrl, `/rooms/${roomCode}/rival`, {
    method: "POST",
    body: JSON.stringify({ player_id: attacker.id, rival_id: target.id }),
  });
  const updatedAttacker = state.room.players.find((player) => player.id === attacker.id);
  if (updatedAttacker.rivalId !== target.id || updatedAttacker.rivalTokensRemaining !== 1) {
    throw new Error("Expected rival nomination to save the target and spend one token.");
  }
  await Promise.all([
    request(baseUrl, `/rooms/${roomCode}/choices`, {
      method: "POST",
      body: JSON.stringify({ player_id: attacker.id, choices: ["invest_stocks", "rival_call_in_debt"] }),
    }),
    request(baseUrl, `/rooms/${roomCode}/choices`, {
      method: "POST",
      body: JSON.stringify({ player_id: target.id, choices: ["invest_stocks", "contribute_community_pot"] }),
    }),
  ]);
  state = await request(baseUrl, `/rooms/${roomCode}`);
  const attackedTarget = state.room.players.find((player) => player.id === target.id);
  const attackingPlayer = state.room.players.find((player) => player.id === attacker.id);
  if (attackedTarget.rivalHit?.phaseId !== "speculation") {
    throw new Error("Expected sabotage to create a rival-hit notice on the target.");
  }
  if ((attackingPlayer.sabotageHistory || []).length !== 1) {
    throw new Error("Expected attacker sabotage history to record the rival action.");
  }
}

async function assertEmergencyCollapse(baseUrl) {
  let created = await request(baseUrl, "/rooms", { method: "POST", body: JSON.stringify({ test_family_overrides: { health: 0 } }) });
  let roomCode = created.room.roomCode;
  let joined = await request(baseUrl, `/rooms/${roomCode}/join`, {
    method: "POST",
    body: JSON.stringify({ player_name: "Emergency Probe", client_id: `emergency-ignore-${Date.now()}` }),
  });
  let player = joined.room.players[0];
  if (player.collapseWarning?.emergencyChoiceId !== "emergency_health") {
    throw new Error(`Expected low health to expose emergency_health, got ${player.collapseWarning?.emergencyChoiceId || "none"}`);
  }
  let state = await request(baseUrl, `/rooms/${roomCode}/choices`, {
    method: "POST",
    body: JSON.stringify({ player_id: player.id, choices: ["keep_factory_job", "hoard_relief"] }),
  });
  player = state.room.players[0];
  if (!player.gameOver || player.gameOver.reason !== "health") {
    throw new Error("Expected ignoring a health emergency option to end the family next phase.");
  }

  created = await request(baseUrl, "/rooms", { method: "POST", body: JSON.stringify({ test_family_overrides: { health: 0 } }) });
  roomCode = created.room.roomCode;
  joined = await request(baseUrl, `/rooms/${roomCode}/join`, {
    method: "POST",
    body: JSON.stringify({ player_name: "Emergency Rescue", client_id: `emergency-rescue-${Date.now()}` }),
  });
  player = joined.room.players[0];
  state = await request(baseUrl, `/rooms/${roomCode}/choices`, {
    method: "POST",
    body: JSON.stringify({ player_id: player.id, choices: ["emergency_health", "keep_factory_job"] }),
  });
  player = state.room.players[0];
  if (player.gameOver || player.collapseWarning || player.health <= 0) {
    throw new Error("Expected choosing the health emergency option to rescue the family and clear the warning.");
  }
}

async function assertRematchJoinLink(baseUrl) {
  const { roomCode, hostToken } = await createFullRoom(baseUrl, "Rematch Probe");
  let state = await request(baseUrl, `/rooms/${roomCode}`);
  for (let round = 0; round < phaseChoices.length; round += 1) {
    state = await completePolicyVote(baseUrl, roomCode, state, { tie: state.room.shared?.policyVote?.phaseId === "bank_holiday" });
    await Promise.all(
      state.room.players.filter((player) => !player.gameOver).map((player) =>
        request(baseUrl, `/rooms/${roomCode}/choices`, {
          method: "POST",
          body: JSON.stringify({ player_id: player.id, choices: phaseChoices[round] }),
        })
      )
    );
    state = await request(baseUrl, `/rooms/${roomCode}`);
  }
  state = await request(baseUrl, `/rooms/${roomCode}/advance`, {
    method: "POST",
    body: JSON.stringify({ host_token: hostToken }),
  });
  const next = await request(baseUrl, "/rooms", {
    method: "POST",
    body: JSON.stringify({ scenario_id: "harsh_winter", previous_room_code: roomCode, host_token: hostToken }),
  });
  const oldRoom = await request(baseUrl, `/rooms/${roomCode}`);
  if (oldRoom.room.nextRoomCode !== next.room.roomCode) {
    throw new Error("Expected finished room to expose the host-created next room code.");
  }
  const rejoined = await request(baseUrl, `/rooms/${oldRoom.room.nextRoomCode}/join`, {
    method: "POST",
    body: JSON.stringify({ player_name: "Returning Player", client_id: `returning-${Date.now()}` }),
  });
  if (rejoined.room.players.length !== 1 || rejoined.room.players[0].playerName !== "Returning Player") {
    throw new Error("Expected a finished-game player to join the host's next room.");
  }
}

async function main() {
  const baseUrl = getBaseUrl();
  await assertScenarioSelection(baseUrl);
  await assertHardModeNemesis(baseUrl);
  await assertEmergencyCollapse(baseUrl);
  await assertRematchJoinLink(baseUrl);
  await assertHardBetrayal(baseUrl);
  const { roomCode, hostToken } = await createFullRoom(baseUrl, "Local Player");

  let state = await request(baseUrl, `/rooms/${roomCode}`);
  const families = state.room.players.map((player) => player.name);
  if (state.room.players.length !== MAX_PLAYERS) {
    throw new Error(`Expected ${MAX_PLAYERS} players, got ${state.room.players.length}`);
  }
  if (new Set(families).size !== MAX_PLAYERS) {
    throw new Error(`Expected unique family names, got: ${families.join(", ")}`);
  }
  if (state.room.players.some((player) => !player.role || !player.objectiveId || !player.objectiveTitle)) {
    throw new Error("Expected every player to receive a period role and family objective");
  }
  if (!state.room.scenario?.id || !state.room.scenario?.title) {
    throw new Error("Expected every room to include a replay scenario card");
  }
  if (!state.room.shared?.eventVariant?.id) {
    throw new Error("Expected every phase to expose a replayable event variant");
  }
  if (state.room.players.some((player) => !player.objectiveVariantId || !player.objectiveTheme)) {
    throw new Error("Expected every player to receive a rotating objective variant");
  }

  for (let round = 0; round < phaseChoices.length; round += 1) {
    state = await completePolicyVote(baseUrl, roomCode, state, { tie: state.room.shared?.policyVote?.phaseId === "bank_holiday" });
    const choices = phaseChoices[round];
    const activePlayers = state.room.players.filter((player) => !player.gameOver);
    if (!activePlayers.length) {
      throw new Error(`Expected at least one active family before round ${round + 1}`);
    }
    await Promise.all(
      activePlayers.map((player) =>
        request(baseUrl, `/rooms/${roomCode}/choices`, {
          method: "POST",
          body: JSON.stringify({ player_id: player.id, choices }),
        })
      )
    );
    state = await request(baseUrl, `/rooms/${roomCode}`);
    const expectedPhase = round + 1;
    if (state.room.phaseIndex !== expectedPhase) {
      throw new Error(`Expected phase ${expectedPhase}, got ${state.room.phaseIndex}`);
    }
    if (!state.room.shared || typeof state.room.shared.trust !== "number") {
      throw new Error("Expected shared community state after choices resolved");
    }
    if (state.room.players.some((player) => !player.gameOver && player.roundReceipt?.phaseId !== phaseIds[round])) {
      throw new Error("Expected resolved families to receive a private outcome receipt");
    }
    if (round === 1 && state.room.shared.last?.potMetNeed) {
      throw new Error("Expected hard betrayal to collapse the community pot when every player takes a selfish edge");
    }
    if (expectedPhase === 5) {
      const jobLossCount = state.room.players.filter((player) => player.employmentShock?.phaseId === "deepening").length;
      if (jobLossCount !== 2) {
        throw new Error(`Expected the 25% unemployment shock to hit 2 of 8 families, got ${jobLossCount}`);
      }
      if (!state.room.shared.lastShock || state.room.shared.lastShock.count !== 2) {
        throw new Error("Expected shared unemployment shock summary for the deepening phase");
      }
    }
    if (expectedPhase === 6) {
      if (state.room.shared.policyVote?.phaseId !== "bank_holiday") throw new Error("Expected the 1933 banking ballot to open.");
    }
  }
  if (state.room.phaseIndex !== 10) {
    throw new Error(`Expected recovery phase before results, got ${state.room.phaseIndex}`);
  }
  state = await request(baseUrl, `/rooms/${roomCode}/advance`, {
    method: "POST",
    body: JSON.stringify({ host_token: hostToken }),
  });
  if (state.room.phaseIndex !== 11) {
    throw new Error(`Expected results phase after host advance, got ${state.room.phaseIndex}`);
  }
  if (!state.room.rematchScenario?.id || state.room.rematchScenario.id === state.room.scenario.id) {
    throw new Error("Expected final room state to recommend a different rematch scenario");
  }

  console.log(`Local smoke passed: room ${roomCode}, ${MAX_PLAYERS} players, final phase ${state.room.phaseIndex}.`);
  console.log(`Families: ${families.join(", ")}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
