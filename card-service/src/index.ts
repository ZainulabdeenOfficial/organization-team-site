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

type ThemeName = "dark" | "light" | "neon" | "ocean";

type Theme = {
  bg0: string;
  bg1: string;
  bg2: string;
  accent0: string;
  accent1: string;
  title: string;
  text: string;
  textMuted: string;
  border: string;
  avatarStroke: string;
  shadowOpacity: number;
};

const THEMES: Record<ThemeName, Theme> = {
  dark: {
    bg0: "#0b1020",
    bg1: "#111a33",
    bg2: "#0b1020",
    accent0: "#4c6fff",
    accent1: "#ff4c6f",
    title: "#eef1ff",
    text: "rgba(238,241,255,0.85)",
    textMuted: "rgba(238,241,255,0.70)",
    border: "rgba(255,255,255,0.14)",
    avatarStroke: "rgba(255,255,255,0.25)",
    shadowOpacity: 0.35
  },
  light: {
    bg0: "#ffffff",
    bg1: "#f3f5ff",
    bg2: "#ffffff",
    accent0: "#4c6fff",
    accent1: "#ff4c6f",
    title: "#0b1020",
    text: "rgba(11,16,32,0.80)",
    textMuted: "rgba(11,16,32,0.65)",
    border: "rgba(11,16,32,0.14)",
    avatarStroke: "rgba(11,16,32,0.22)",
    shadowOpacity: 0.18
  },
  neon: {
    bg0: "#070716",
    bg1: "#12122b",
    bg2: "#070716",
    accent0: "#00e5ff",
    accent1: "#ff00e5",
    title: "#f6f7ff",
    text: "rgba(246,247,255,0.88)",
    textMuted: "rgba(246,247,255,0.70)",
    border: "rgba(255,255,255,0.16)",
    avatarStroke: "rgba(255,255,255,0.28)",
    shadowOpacity: 0.4
  },
  ocean: {
    bg0: "#061824",
    bg1: "#0b2b3a",
    bg2: "#061824",
    accent0: "#00d4ff",
    accent1: "#00ff9a",
    title: "#eaffff",
    text: "rgba(234,255,255,0.86)",
    textMuted: "rgba(234,255,255,0.70)",
    border: "rgba(234,255,255,0.16)",
    avatarStroke: "rgba(234,255,255,0.28)",
    shadowOpacity: 0.38
  }
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function getTheme(name: string | null): Theme {
  const key = String(name || "dark").toLowerCase() as ThemeName;
  return THEMES[key] || THEMES.dark;
}

function buildAvatarProxyUrl(baseUrl: string, login: string, size: number) {
  const u = new URL(baseUrl);
  u.searchParams.set("u", login);
  u.searchParams.set("s", String(size));
  return u.toString();
}

function isValidGitHubLogin(login: string) {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(login);
}

function buildAvatarPattern(login: string, href: string, x: number, y: number, size: number) {
  // Unique id per user+position to avoid collisions.
  const id = `av_${login.replace(/[^a-zA-Z0-9_-]/g, "_")}_${x}_${y}`;
  const safeHref = svgEscape(href);
  return {
    id,
    def: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
  <image href="${safeHref}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" />
</pattern>`,
    circle: (stroke: string) =>
      `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="url(#${id})" stroke="${stroke}" stroke-width="2" />`
  };
}

function buildSvg(opts: {
  org: string;
  owners: GhUser[];
  members: GhUser[];
  theme: Theme;
  ownersLimit: number;
  membersLimit: number;
  cofounderLogin?: string;
  avatarProxyBaseUrl: string;
}) {
  const width = 900;

  const title = `${opts.org} • Owner / Co-founder / Members`;

  const allOwners = opts.owners || [];
  const chosenCofounder =
    (opts.cofounderLogin &&
      allOwners.find((u) => u.login.toLowerCase() === opts.cofounderLogin?.toLowerCase())) ||
    allOwners[0];
  const hasCofounder = Boolean(chosenCofounder) && opts.ownersLimit > 0;
  const owners = allOwners
    .filter((u) => (chosenCofounder ? u.login.toLowerCase() !== chosenCofounder.login.toLowerCase() : true))
    .slice(0, Math.max(0, opts.ownersLimit - (hasCofounder ? 1 : 0)));
  const members = (opts.members || []).slice(0, opts.membersLimit);

  // Layout constants
  const padX = 44;
  const avatarSize = 42;
  const gap = 12;
  const sectionGap = 34;

  const perRowOwners = 8;
  const perRowMembers = 7;
  const ownerRowHeight = 74;

  const cofounderLabelY = 102;
  const cofounderY = 118;

  const ownersLabelY = cofounderY + avatarSize + sectionGap;
  const ownersY = ownersLabelY + 16;

  const memberRowHeight = 74;
  const ownerRows = Math.max(1, Math.ceil(owners.length / perRowOwners));
  const ownerBlockHeight = avatarSize + (ownerRows - 1) * ownerRowHeight;
  const membersLabelY = ownersY + ownerBlockHeight + sectionGap;
  const membersY = membersLabelY + 16;
  const memberRows = Math.max(1, Math.ceil(members.length / perRowMembers));

  const membersBlockHeight = avatarSize + (memberRows - 1) * memberRowHeight;
  const height = membersY + membersBlockHeight + 56;

  const defs: string[] = [];
  const shapes: string[] = [];
  const labels: string[] = [];

  // Co-founder label
  labels.push(
    `<text x="${padX}" y="${cofounderLabelY}" fill="${opts.theme.text}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="700">Co-founder</text>`
  );

  if (chosenCofounder) {
    const href = buildAvatarProxyUrl(opts.avatarProxyBaseUrl, chosenCofounder.login, avatarSize * 2);
    const av = buildAvatarPattern(chosenCofounder.login, href, padX, cofounderY, avatarSize);
    defs.push(av.def);
    shapes.push(av.circle(opts.theme.avatarStroke));
    labels.push(
      `<text x="${padX + avatarSize / 2}" y="${cofounderY + avatarSize + 18}" text-anchor="middle" fill="${opts.theme.textMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="12">@${svgEscape(
        chosenCofounder.login
      )}</text>`
    );
  }

  // Owner label
  labels.push(
    `<text x="${padX}" y="${ownersLabelY}" fill="${opts.theme.text}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="700">Owners</text>`
  );

  if (!owners.length) {
    labels.push(
      `<text x="${padX}" y="${ownersY + 18}" fill="${opts.theme.textMuted}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="14">No owners/admins are publicly visible for this org.</text>`
    );
  }

  owners.forEach((u, i) => {
    const col = i % perRowOwners;
    const row = Math.floor(i / perRowOwners);
    const x = padX + col * (avatarSize + gap);
    const y = ownersY + row * ownerRowHeight;

    const href = buildAvatarProxyUrl(opts.avatarProxyBaseUrl, u.login, avatarSize * 2);
    if (href) {
      const av = buildAvatarPattern(u.login, href, x, y, avatarSize);
      defs.push(av.def);
      shapes.push(av.circle(opts.theme.avatarStroke));
    } else {
      shapes.push(
        `<circle cx="${x + avatarSize / 2}" cy="${y + avatarSize / 2}" r="${avatarSize / 2}" fill="rgba(255,255,255,0.10)" stroke="${opts.theme.avatarStroke}" stroke-width="2" />`
      );
    }

    labels.push(
      `<text x="${x + avatarSize / 2}" y="${y + avatarSize + 18}" text-anchor="middle" fill="${opts.theme.textMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="12">@${svgEscape(
        u.login
      )}</text>`
    );
  });

  // Members label
  labels.push(
    `<text x="${padX}" y="${membersLabelY}" fill="${opts.theme.text}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="16" font-weight="700">Members</text>`
  );

  if (!members.length) {
    labels.push(
      `<text x="${padX}" y="${membersY + 18}" fill="${opts.theme.textMuted}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="14">No members are publicly visible for this org.</text>`
    );
  }

  members.forEach((u, i) => {
    const row = Math.floor(i / perRowMembers);
    const col = i % perRowMembers;
    const x = padX + col * (avatarSize + gap);
    const y = membersY + row * memberRowHeight;

    const href = buildAvatarProxyUrl(opts.avatarProxyBaseUrl, u.login, avatarSize * 2);
    if (href) {
      const av = buildAvatarPattern(u.login, href, x, y, avatarSize);
      defs.push(av.def);
      shapes.push(av.circle(opts.theme.avatarStroke));
    } else {
      shapes.push(
        `<circle cx="${x + avatarSize / 2}" cy="${y + avatarSize / 2}" r="${avatarSize / 2}" fill="rgba(255,255,255,0.10)" stroke="${opts.theme.avatarStroke}" stroke-width="2" />`
      );
    }

    labels.push(
      `<text x="${x + avatarSize / 2}" y="${y + avatarSize + 18}" text-anchor="middle" fill="${opts.theme.textMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="12">@${svgEscape(
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
      <stop offset="0%" stop-color="${opts.theme.bg0}"/>
      <stop offset="55%" stop-color="${opts.theme.bg1}"/>
      <stop offset="100%" stop-color="${opts.theme.bg2}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${opts.theme.accent0}"/>
      <stop offset="100%" stop-color="${opts.theme.accent1}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="${opts.theme.shadowOpacity}"/>
    </filter>
    ${defs.join("\n")}
  </defs>

  <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="18" fill="url(#bg)" stroke="${opts.theme.border}" filter="url(#shadow)" />
  <rect x="18" y="18" width="${width - 36}" height="6" fill="url(#accent)" rx="3" />

  <text x="44" y="78" fill="${opts.theme.title}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="34" font-weight="800">${svgEscape(
    title
  )}</text>

  ${labels.join("\n")}
  ${shapes.join("\n")}

  <text x="44" y="${height - 44}" fill="${opts.theme.textMuted}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="14">${svgEscape(
    footer
  )}</text>
</svg>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Route: /api/avatar?u=LOGIN&s=SIZE
      if (url.pathname.endsWith("/api/avatar")) {
        const login = url.searchParams.get("u")?.trim();
        if (!login) {
          return new Response("Missing 'u' query param", { status: 400 });
        }
        if (!isValidGitHubLogin(login)) {
          return new Response("Invalid GitHub username", { status: 400 });
        }

        const size = clampInt(Number(url.searchParams.get("s") || 84), 16, 256);
        const avatarUrl = `https://avatars.githubusercontent.com/${encodeURIComponent(login)}?size=${size}`;
        const upstream = await fetch(avatarUrl, {
          headers: {
            Accept: "image/*",
            "User-Agent": "org-team-card"
          }
        });
        if (!upstream.ok || !upstream.body) {
          return new Response("Avatar not found", { status: upstream.status || 404 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") || "image/png",
            "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400"
          }
        });
      }

      // Route: /api/card.svg?org=ORG
      if (!url.pathname.endsWith("/api/card.svg")) {
        return new Response("Not found", { status: 404 });
      }

      const org = url.searchParams.get("org")?.trim();
      if (!org) {
        return new Response("Missing 'org' query param", { status: 400 });
      }

      const ownersLimit = clampInt(Number(url.searchParams.get("owners") || 8), 0, 12);
      const membersLimit = clampInt(Number(url.searchParams.get("members") || 14), 0, 28);
      const cofounderLogin = url.searchParams.get("cofounder")?.trim() || undefined;
      const theme = getTheme(url.searchParams.get("theme"));
      const avatarProxyBaseUrl = new URL(request.url);
      avatarProxyBaseUrl.pathname = avatarProxyBaseUrl.pathname.replace(/\/card\.svg$/, "/avatar");
      avatarProxyBaseUrl.search = "";
      avatarProxyBaseUrl.hash = "";

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

      const svg = buildSvg({
        org,
        owners: owners || [],
        members: members || [],
        theme,
        ownersLimit,
        membersLimit,
        cofounderLogin,
        avatarProxyBaseUrl: avatarProxyBaseUrl.toString()
      });

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
