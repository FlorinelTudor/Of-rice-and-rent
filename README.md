# Of Rice and Rent

A facilitated multiplayer learning game in which up to nine players manage
different American families through the economic changes of 1919-1942.

Players receive distinct family backgrounds and objectives, make simultaneous
decisions, respond to shared scarcity, and see how cooperation, risk, and
historical events shape their final outcomes.

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

## Deployment

The React client builds into `build/`. The repository also includes:

- a local Express multiplayer server in `scripts/playtest-server.js`
- Vercel-compatible game API handlers in `api/game`
- the current public-site routing configuration in `vercel.json`

Room state is stored by the selected server backend. Never commit deployment
tokens or local environment files.
