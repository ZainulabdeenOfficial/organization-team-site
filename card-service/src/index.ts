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

type GhUser = {
  login: string;
  avatar_url?: string;
  html_url?: string;
};

function buildAvatarPattern(login: string, href: string, x: number, y: number, size: number) {
  // Unique id per user+position to avoid collisions.
  const id = `av_${login.replace(/[^a-zA-Z0-9_-]/g, "_")}_${x}_${y}`;
  const safeHref = svgEscape(href);
  return {
    id,
    def: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
  <image href="${safeHref}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" />
</pattern>`,
    circle: `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="url(#${id})" stroke="rgba(255,255,255,0.25)" stroke-width="2" />`
  };
}

function buildSvg(opts: {
  org: string;
  owners: GhUser[];
  members: GhUser[];
}) {
  const width = 900;
  const height = 320;

  const title = `${opts.org} team`;

  const owners = (opts.owners || []).slice(0, 8);
  const members = (opts.members || []).slice(0, 14);

  // Layout
  const left = 44;
  const avatarSize = 42;
  const gap = 12;

  const ownersY = 118;
  const membersY = 222;

  const perRowOwners = 8;
  const perRowMembers = 7;

  const defs: string[] = [];
  const shapes: string[] = [];
  const labels: string[] = [];

  // Owners label
  labels.push(
    `<text x="${left}" y="${ownersY - 22}" fill="rgba(238,241,255,0.85)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="700">Owners</text>`
  );

  owners.forEach((u, i) => {
    const row = 0;
    const col = i % perRowOwners;
    const x = left + col * (avatarSize + gap);
    const y = ownersY;

    const href = u.avatar_url || "";
    if (href) {
      const av = buildAvatarPattern(u.login, href, x, y, avatarSize);
      defs.push(av.def);
      shapes.push(av.circle);
    } else {
      shapes.push(
        `<circle cx="${x + avatarSize / 2}" cy="${y + avatarSize / 2}" r="${avatarSize / 2}" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.25)" stroke-width="2" />`
      );
    }

    labels.push(
      `<text x="${x + avatarSize / 2}" y="${y + avatarSize + 18}" text-anchor="middle" fill="rgba(238,241,255,0.78)" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="12">@${svgEscape(
        u.login
      )}</text>`
    );
  });

  // Members label
  labels.push(
    `<text x="${left}" y="${membersY - 22}" fill="rgba(238,241,255,0.85)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="700">Members (public)</text>`
  );

  members.forEach((u, i) => {
    const row = Math.floor(i / perRowMembers);
    const col = i % perRowMembers;
    const x = left + col * (avatarSize + gap);
    const y = membersY + row * 74;

    const href = u.avatar_url || "";
    if (href) {
      const av = buildAvatarPattern(u.login, href, x, y, avatarSize);
      defs.push(av.def);
      shapes.push(av.circle);
    } else {
      shapes.push(
        `<circle cx="${x + avatarSize / 2}" cy="${y + avatarSize / 2}" r="${avatarSize / 2}" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.25)" stroke-width="2" />`
      );
    }

    labels.push(
      `<text x="${x + avatarSize / 2}" y="${y + avatarSize + 18}" text-anchor="middle" fill="rgba(238,241,255,0.70)" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="12">@${svgEscape(
        u.login
      )}</text>`
    );
  });

  const footer = `Generated from GitHub API • ${new Date().toISOString().slice(0, 10)}`;

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
    ${defs.join("\n")}
  </defs>

  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="18" fill="url(#bg)" stroke="rgba(255,255,255,0.14)" filter="url(#shadow)" />
  <rect x="18" y="18" width="${width - 36}" height="6" fill="url(#accent)" rx="3" />

  <text x="44" y="78" fill="#eef1ff" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="34" font-weight="800">${svgEscape(
    title
  )}</text>

  ${labels.join("\n")}
  ${shapes.join("\n")}

  <text x="44" y="${height - 44}" fill="rgba(238,241,255,0.62)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="14">${svgEscape(
    footer
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
