Original prompt: Build a 10-25 minute multiplayer learning game where colleagues manage families through an uncertain 1919-1942 economy, with host controls, randomized family backgrounds, market/news phases, community pot competition, final awards, and historical debrief.

## 2026-06-26

- Fixed family portrait danger state to use current meters only, so a recovered savings/food/hope/etc. meter can return to the normal family portrait.
- Added collapse warning and game-over flow: health, food, or hope at 0, or debt at 100, warns first; if unrecovered after the next phase resolves, that family receives a closing screen and no longer blocks phase advancement.
- Build passed with `npm run build`.
- Moved job-loss and family-collapse warnings into dismissible private pop-ups, and removed the Shared Conditions sidebar panel.
- Added host scenario selection for new/rematch rooms, delayed private pop-ups until after the phase reveal, removed doubled recovery panels, and added anti-gaming memory for rushed/repeated/exploit-heavy play.
