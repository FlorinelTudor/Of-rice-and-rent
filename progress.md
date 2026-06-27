Original prompt: Build a 10-25 minute multiplayer learning game where colleagues manage families through an uncertain 1919-1942 economy, with host controls, randomized family backgrounds, market/news phases, community pot competition, final awards, and historical debrief.

## 2026-06-26

- Fixed family portrait danger state to use current meters only, so a recovered savings/food/hope/etc. meter can return to the normal family portrait.
- Added collapse warning and game-over flow: health, food, or hope at 0, or debt at 100, warns first; if unrecovered after the next phase resolves, that family receives a closing screen and no longer blocks phase advancement.
- Build passed with `npm run build`.
- Moved job-loss and family-collapse warnings into dismissible private pop-ups, and removed the Shared Conditions sidebar panel.
- Added host scenario selection for new/rematch rooms, delayed private pop-ups until after the phase reveal, removed doubled recovery panels, and added anti-gaming memory for rushed/repeated/exploit-heavy play.
- Refined host scenario buttons into compact cards with shorter scenario summaries.
- Made scarcity more visible in Town Hall and added private post-phase hiring result pop-ups for scarce work applicants.

## 2026-06-27

- Added true emergency collapse choices: dangerous health/food/hope/debt warnings now expose a red emergency action; ignoring it causes the family closing screen on the next phase, while selecting it rescues the family and clears the warning.
- Linked host-created rematch rooms back to the finished room so players on the final results screen can join the next game after the host starts it.
- Fixed fresh `?room=CODE` links so new browsers/phones land on the join screen even with no saved local game state.
- Removed duplicate work/relief slot tiles from the Town Hall panel; scarcity is now shown only in the prominent scarcity cards.
- Fixed the host "Show leaderboard" button: it now opens a current leaderboard modal instead of resetting to the already-active host view.
- Changed Recovery and Mobilization back into a final choice phase so players lock in two last actions before the separate results/debrief phase.
- Added earned final bonus choices in Recovery and Mobilization based on high family meters, with distinct blue-gold card styling and matching score impacts.
- Added metric-specific crisis family portraits for food, savings, hope, education, and stability; the portrait now follows the most severe current danger metric instead of using one generic low-stat image.
- Nudged starting family stats so background and role correlate lightly with metrics while preserving random variation. Example: shopkeepers start with stronger savings and bank trust, but also slightly higher business debt.
