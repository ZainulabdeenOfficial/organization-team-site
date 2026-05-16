# Card service (dynamic SVG)

This folder contains an optional **card service** that behaves like GitHub streak cards: it returns a dynamic SVG from a URL.

## What it does
- Endpoint: `GET /api/card.svg?org=<org>`
- Fetches org owners(admin role) + public members from GitHub API
- Returns an SVG "team card"

## Deploy (Cloudflare Workers)
1. Install deps:
   - `cd card-service`
   - `npm i`
2. Login:
   - `npx wrangler login`
3. Deploy:
   - `npm run deploy`

### Optional: set a token
To increase rate limits, set `GITHUB_TOKEN` as a Worker secret:
- `npx wrangler secret put GITHUB_TOKEN`

## Use in README
After deploy, you will get a worker URL like `https://org-team-card.<name>.workers.dev`.

Then embed:

```md
![Org team card](https://org-team-card.<name>.workers.dev/api/card.svg?org=github)
```
