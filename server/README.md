# career-sim boards

The optional leaderboard. The game works completely without it — nothing here
runs unless `VITE_LEADERBOARD_URL` is set at build time, and if the worker ever
goes away the site keeps working exactly as it did before.

It is a Cloudflare Worker plus one D1 table, sized to sit inside the free tier.

## Deploying it

You need a Cloudflare account (free — no card). Once you have one:

```sh
cd server
npm install
npx wrangler login                          # opens a browser once
npx wrangler d1 create career-sim-boards    # prints a database_id
```

Paste the `database_id` it prints into `wrangler.toml`, then:

```sh
npx wrangler d1 execute career-sim-boards --remote --file=./schema.sql
npx wrangler deploy
```

`deploy` prints a URL like `https://career-sim-boards.<you>.workers.dev`.

## Switching the boards on in the site

Add the URL as a repository secret named `VITE_LEADERBOARD_URL`
(Settings → Secrets and variables → Actions → New repository secret), and the
next deploy picks it up — the workflow already passes it through to the build.

For local development, put it in `.env.local` at the repo root:

```
VITE_LEADERBOARD_URL=https://career-sim-boards.<you>.workers.dev
```

## What it stores

One row per browser per board: `board`, group (a friend code, or empty for the
open board), a random id the browser made for itself, the name it chose, the
value, a short detail string, and a timestamp. No IP addresses, no accounts, no
cookies. A board keeps a browser's best score, never its latest.

Boards are `career`, `guess`, `crest`, `grid` and `daily:YYYY-MM-DD`. Daily
boards older than a month are swept away on write.

## What it deliberately does not do

There is no verification. Somebody who reads `src/index.ts` can post a number
they did not earn, and the only fixes for that are accounts or simulating every
career server-side — both of which cost more than the feature is worth. The
friend code exists because a board shared with people you know is the version
of this that actually works.
