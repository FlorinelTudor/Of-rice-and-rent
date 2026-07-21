# Of Rice and Rent

Of Rice and Rent is a facilitated multiplayer learning game in which up to nine
players manage different American families through the economic changes of
1919-1942.

The game is designed for a live meeting or classroom-style session. Each player
joins from their own laptop, receives a distinct family background, and tries to
keep that household alive, stable, and competitive while public news, market
conditions, public policy, and scarce community resources keep changing around
them.

## Built with Codex and GPT-5.6

Of Rice and Rent was designed and implemented through an iterative collaboration
with Codex using GPT-5.6. Codex helped turn an initial learning-game idea into a
playable browser experience by supporting:

- rapid gameplay prototyping and critique across multiple design directions
- tabletop-style UI exploration, action-card layouts, and historical visual
  direction
- image-generation prompts for family portraits, market conditions, public news,
  action cards, warnings, and end-game scenes
- multiplayer architecture changes such as server-authoritative room state,
  player tokens, private family ledgers, and host inspection tools
- game-theory mechanics including scarce shared resources, public policy votes,
  soft and hard competition, rival targeting, anti-rush penalties, and final
  historical debriefs
- implementation, testing, local smoke tests, deployment debugging, and GitHub
  workflow support

The project is a practical example of using Codex not just to write code, but to
co-design mechanics, tune player experience, investigate bugs, and keep the
prototype moving from idea to live playtest.

## What players do

Players are not told the future. They see a newspaper, market conditions, and
their private family ledger, then make decisions from a hand of historically
themed action cards. Every choice changes household meters such as food, health,
savings, debt, hope, education, stability, bank trust, and reputation.

The session mixes private survival with public pressure:

- each player manages a named family with a period-specific role and hidden
  objective
- each phase presents new public news and market conditions
- the Town Hall Council asks families to place provisional claims before private
  decisions open
- action cards create visible trade-offs, buffs, and penalties
- scarce work, relief, and community support are resolved after everyone submits
- public policy ballots let players vote on national responses that affect all
  families
- competitive mode adds rival selection and sabotage actions
- the final screen compares scores, awards, objectives, and historical standing

## Learning goals

The game turns historical pressure into playable systems. Instead of only
reading about the period, players feel why households might borrow, hoard,
cooperate, migrate, delay care, invest, distrust banks, accept relief, or compete
against neighbors.

The main learning themes are:

- uncertainty: players make choices without knowing later shocks
- scarcity: work slots, relief slots, and shared support are limited
- uneven impact: family background changes starting conditions and objectives
- policy trade-offs: public decisions help some families more than others
- collective action: the community pot can protect families, but trust can break
- anti-gaming: rushed, repeated, or exploitative play has consequences
- reflection: end-game debriefs connect player outcomes to historical context

## Game flow

1. The host creates a room and shares the room code or room link.
2. Players join with their names and receive a family profile.
3. The phase reveal introduces the next public situation.
4. Players read the newspaper, market conditions, and family ledger.
5. Players place a Town Hall Council intention.
6. Players choose and lock two action cards.
7. The server resolves choices, scarcity, policy effects, rivals, warnings, and
   family meter changes.
8. The next phase begins when every active family is ready.
9. The final results phase shows leaderboard, awards, historical standing, and a
   debrief.

## Families and objectives

Families are assigned from period-appropriate backgrounds, including industrial
wage earners, Main Street merchants, rural tenant farmers, new arrival workers,
rail and transport workers, garment workers, urban service workers, mining
households, and migrant farm workers.

Each family begins with different starting meters and receives a hidden
objective. This means two players can make similar decisions and still face
different risks, incentives, and end-game evaluation.

## Mechanics in detail

### Action cards

The server builds each player's available hand for the current phase. Cards can
include common actions, family-background actions, emergency actions, final
bonus actions, employment-shock responses, and competitive sabotage cards.

Cards show their expected effects, but the final outcome can be adjusted by
phase effects, policy effects, scarcity resolution, rushed decisions, repeated
patterns, and family-specific conditions.

### Town Hall Council

Before private decisions open, players place provisional claims such as work,
relief, community, or household protection. These claims make shared pressure
visible without revealing private family ledgers. The goal is to slow the group
down just enough to notice scarcity before everyone rushes into private choices.

### Public policy ballots

Several phases include anonymous policy votes. Each ballot presents a historical
status quo and an alternative proposal. A tie preserves the historical status
quo. The winning policy affects all active families and can favor some family
roles more than others.

### Competitive mode

Competitive mode makes the game sharper. Players can see the leaderboard, choose
a rival during limited windows, and use sabotage cards later in the game. These
actions can help a player climb, but they usually damage reputation or trust.

### Collapse and emergency choices

If a critical meter reaches danger territory, the player receives a warning and
may see an emergency action. Ignoring a true collapse warning can lead to that
family leaving the race and receiving a closing screen.

### End-game results

The final results do more than rank raw meter totals. They summarize how each
family performed, which awards they earned, how their hidden objective fared, and
how their outcome compares with historical standing for that family background.

## Technical architecture

Of Rice and Rent is a React and Node.js browser game with a server-authoritative
multiplayer model.

- `src/` contains the React client, tabletop UI, sounds, and tests
- `game/` contains shared rules such as policy logic and action catalog data
- `scripts/playtest-server.js` runs the local Express multiplayer server
- `api/game/[...path].js` provides the Vercel-compatible hosted game API
- `api/tunnel.js` supports the current public-site tunnel forwarding shape
- `public/depression-game/` stores generated visual assets used by the UI

Private player state is protected with player tokens. Anonymous room views hide
private family ledgers, while the host token can inspect all families for
facilitation and troubleshooting.

The multiplayer layer uses authenticated HTTP polling and server-owned room
state rather than WebSockets. Hosted room state is stored through the selected
server backend; local playtests use the local Express process.

Codex assisted with the migration toward this server-authoritative model by
centralizing action rules, moving private player state behind authenticated
views, and adding tests for multiplayer privacy and host-demo playtest flows.

## Local playtest

```bash
npm install
npm run build
npm run playtest:server
```

Open `http://127.0.0.1:4173/?newHost=1` to host a room.

For the full nine-player automated smoke test, keep the local server running
and execute this in another terminal:

```bash
npm run playtest:local
```

The smoke test stays local by default so repeated development checks do not
consume hosted-service quotas.

## Useful scripts

```bash
npm start
npm run build
npm test
npm run playtest:server
npm run playtest:local
```

`npm run playtest:local` is the main multiplayer smoke test. It checks room
creation, joining, private-state visibility, server-selected action hands,
policy voting, emergency collapse handling, rematches, and a full multi-player
round flow.

## Deployment

The React client builds into `build/`. The repository also includes:

- a local Express multiplayer server in `scripts/playtest-server.js`
- Vercel-compatible game API handlers in `api/game`
- the current public-site routing configuration in `vercel.json`

Room state is stored by the selected server backend. Never commit deployment
tokens or local environment files.

The current public access setup uses Vercel plus a Cloudflare tunnel route for
facilitated playtests. When changing deployment or tunnel behavior, verify the
hosted room flow with multiple real clients before a live session.
