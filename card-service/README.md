# Card service (dynamic SVG)

This folder contains an optional **card service** that behaves like GitHub streak cards: it returns a dynamic SVG from a URL.

## What it does
- Endpoint: `GET /api/card.svg?org=<org>`
- Endpoint: `GET /api/avatar?u=<login>&s=<size>`
- Endpoints also accept trailing slashes (`/api/card.svg/`, `/api/avatar/`)
- Fetches org owners(admin role) + public members from GitHub API
- Returns an SVG role card with **Co-founder**, **Owner**, and **Members**
- Proxies avatar images through the worker so avatars render when the SVG is embedded in GitHub README markdown

## Customization (query params)
You can customize the output like this:

- `owners` (default `8`, max `12`)
- `members` (default `14`, max `28`)
- `theme` (one of: `dark`, `light`, `neon`, `ocean`)
- `cofounder` (optional GitHub login)
  - If set, that owner is shown in the **Co-founder** section.
  - If not set (or not found among owners), the first owner returned by GitHub API is used as **Co-founder**.
  - Remaining admins are shown in the **Owner** section.

Example:

```md
![Org team card](https://org-team-card.<name>.workers.dev/api/card.svg?org=github&owners=8&members=14&theme=dark&cofounder=octocat)
```

## Avatar endpoint

`GET /api/avatar?u=<login>&s=<size>`

- `u` = GitHub username (required)
- `s` = avatar size in px (optional, default `84`, clamped to `16..256`)
- Response content type is proxied from GitHub (normally PNG/JPEG/WebP)
- CORS/CORP headers are set for GitHub README/Camo compatibility
- Cache headers are set for CDN/browser caching

## Deploy (Cloudflare Workers)
1. Install deps:
   - `cd card-service`
   - `npm i`
2. Login:
   - `npx wrangler login`
3. Deploy:
   - `npm run deploy`
   - Run from `card-service/` so Wrangler uses `card-service/wrangler.toml` and `src/index.ts`

### Optional: set a token
To increase rate limits, set `GITHUB_TOKEN` as a Worker secret:
- `npx wrangler secret put GITHUB_TOKEN`
