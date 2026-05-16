# Card service (dynamic SVG)

This folder contains an optional **card service** that behaves like GitHub streak cards: it returns a dynamic SVG from a URL.

## What it does
- Endpoint: `GET /api/card.svg?org=<org>`
- Fetches org owners(admin role) + public members from GitHub API
- Returns an SVG "team card"

## Customization (query params)
You can customize the output like this:

- `owners` (default `8`, max `12`)
- `members` (default `14`, max `28`)
- `theme` (one of: `dark`, `light`, `neon`, `ocean`)

Example:

```md
![Org team card](https://org-team-card.<name>.workers.dev/api/card.svg?org=github&owners=8&members=14&theme=dark)
```

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
