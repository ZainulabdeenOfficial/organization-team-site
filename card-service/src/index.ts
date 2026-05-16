export interface Env {
  GITHUB_TOKEN?: string;
}

function svgEscape(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function ghJson(url: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "org-team-card"
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

function buildSvg(opts: {
  org: string;
  owners: { login: string }[];
  members: { login: string }[];
}) {
  const width = 900;
  const height = 220;

  const title = `${opts.org} team`;
  const ownerList = opts.owners.map((o) => `@${o.login}`).slice(0, 10).join(" • ");
  const memberCount = opts.members.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${svgEscape(
    title
  )}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="55%" stop-color="#111a33"/>
      <stop offset="100%" stop-color="#0b1020"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4c6fff"/>
      <stop offset="100%" stop-color="#ff4c6f"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="18" fill="url(#bg)" stroke="rgba(255,255,255,0.14)" filter="url(#shadow)" />
  <rect x="18" y="18" width="${width - 36}" height="6" fill="url(#accent)" rx="3" />

  <text x="44" y="82" fill="#eef1ff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="34" font-weight="800">${svgEscape(
    title
  )}</text>

  <text x="44" y="122" fill="rgba(238,241,255,0.82)" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="16">Owners: ${svgEscape(
    ownerList || "(none public)"
  )}</text>

  <text x="44" y="152" fill="rgba(238,241,255,0.82)" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="16">Members (public): ${memberCount}</text>

  <text x="44" y="188" fill="rgba(238,241,255,0.62)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="14">Generated from GitHub API • ${new Date().toISOString().slice(
    0,
    10
  )}</text>
</svg>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Route: /api/card.svg?org=ORG
      if (!url.pathname.endsWith("/api/card.svg")) {
        return new Response("Not found", { status: 404 });
      }

      const org = url.searchParams.get("org")?.trim();
      if (!org) {
        return new Response("Missing 'org' query param", { status: 400 });
      }

      // Validate org exists
      await ghJson(`https://api.github.com/orgs/${encodeURIComponent(org)}`, env.GITHUB_TOKEN);

      const [owners, members] = await Promise.all([
        ghJson(
          `https://api.github.com/orgs/${encodeURIComponent(org)}/members?per_page=100&role=admin`,
          env.GITHUB_TOKEN
        ),
        ghJson(
          `https://api.github.com/orgs/${encodeURIComponent(org)}/members?per_page=100&role=member`,
          env.GITHUB_TOKEN
        )
      ]);

      const svg = buildSvg({ org, owners: owners || [], members: members || [] });

      return new Response(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=900" // 15 min
        }
      });
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Unknown error";
      return new Response(msg, { status: 500 });
    }
  }
};
