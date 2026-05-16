const $ = (id) => document.getElementById(id);

const state = {
  org: "",
  owners: [],
  members: [],
  links: []
};

const CARD_SERVICE_BASE_URL_STORAGE_KEY = "orgTeamCardBaseUrl";

function normalizeBaseUrl(url){
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "");
}

function getCardServiceBaseUrl(){
  // 1) Query param override: ?cardBase=https://...
  const params = new URLSearchParams(window.location.search);
  const fromQuery = normalizeBaseUrl(params.get("cardBase"));
  if (fromQuery) return fromQuery;

  // 2) Saved value
  const fromStorage = normalizeBaseUrl(localStorage.getItem(CARD_SERVICE_BASE_URL_STORAGE_KEY));
  if (fromStorage) return fromStorage;

  // 3) No base URL configured
  return "";
}

function setCardServiceBaseUrl(url){
  const normalized = normalizeBaseUrl(url);
  if (!normalized){
    localStorage.removeItem(CARD_SERVICE_BASE_URL_STORAGE_KEY);
  }else{
    localStorage.setItem(CARD_SERVICE_BASE_URL_STORAGE_KEY, normalized);
  }
  return normalized;
}

function initCardServiceUi(){
  const input = $("cardBaseInput");
  const btn = $("saveCardBaseBtn");
  if (!input || !btn) return;

  // Prefill
  input.value = getCardServiceBaseUrl();

  btn.addEventListener("click", () => {
    const normalized = setCardServiceBaseUrl(input.value);
    input.value = normalized;
    setStatus(normalized ? "Card service URL saved." : "Card service URL cleared.");
  });
}

function setStatus(msg, isError=false){
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (isError ? " error" : "");
}

function renderPeople(containerId, people){
  const el = $(containerId);
  el.innerHTML = "";
  if (!people.length){
    el.innerHTML = `<p class="muted small">No data yet.</p>`;
    return;
  }
  for (const p of people){
    const card = document.createElement("div");
    card.className = "person";
    card.innerHTML = `
      <img class="avatar" src="${p.avatar_url}" alt="${p.login}" />
      <div class="meta">
        <div class="name" title="${p.login}">${p.login}</div>
        <div class="sub"><a href="${p.html_url}" target="_blank" rel="noreferrer">View profile</a></div>
      </div>
    `;
    el.appendChild(card);
  }
}

function renderLinks(){
  const el = $("linksList");
  el.innerHTML = "";
  for (let i=0;i<state.links.length;i++){
    const link = state.links[i];
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `
      <span><strong>${escapeHtml(link.label)}</strong>: <a href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.url)}</a></span>
      <button title="Remove" aria-label="Remove">×</button>
    `;
    chip.querySelector("button").addEventListener("click", () => {
      state.links.splice(i, 1);
      renderLinks();
    });
    el.appendChild(chip);
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s); }

async function ghJson(url){
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json"
    }
  });
  if (!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`GitHub API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

async function loadOrg(org){
  state.org = org;
  state.owners = [];
  state.members = [];
  renderPeople("ownersGrid", []);
  renderPeople("membersGrid", []);
  setStatus("Loading…");

  await ghJson(`https://api.github.com/orgs/${encodeURIComponent(org)}`);

  const [admins, members] = await Promise.all([
    ghJson(`https://api.github.com/orgs/${encodeURIComponent(org)}/members?per_page=100&role=admin`),
    ghJson(`https://api.github.com/orgs/${encodeURIComponent(org)}/members?per_page=100&role=member`)
  ]);

  state.owners = admins || [];
  state.members = members || [];

  renderPeople("ownersGrid", state.owners);
  renderPeople("membersGrid", state.members);

  setStatus(`Loaded: ${state.owners.length} owner/admin, ${state.members.length} members (public).`);
}

function cardUrlForOrg(org){
  const qs = `org=${encodeURIComponent(org)}`;
  const base = getCardServiceBaseUrl();

  // If the user configured a Worker base URL, use it.
  if (base && base.startsWith("http")){
    return `${base}/api/card.svg?${qs}`;
  }

  // Fallback: relative URL (will not work on GitHub Pages unless proxied)
  return `/api/card.svg?${qs}`;
}

function buildReadmeMarkdown(){
  const lines = [];
  lines.push(`# ${state.org} team`);
  lines.push("");

  lines.push("## Team card");
  lines.push("");
  lines.push(`![${state.org} team card](${cardUrlForOrg(state.org)})`);
  lines.push("");

  if (state.links.length){
    lines.push("## Links");
    for (const l of state.links){
      lines.push(`- **${l.label}**: ${l.url}`);
    }
    lines.push("");
  }

  const owners = state.owners.map(p => `- [@${p.login}](${p.html_url})`).join("\n");
  const members = state.members.map(p => `- [@${p.login}](${p.html_url})`).join("\n");

  lines.push("## Founder / Owners");
  lines.push(owners || "_None found (public)._" );
  lines.push("");
  lines.push("## Members");
  lines.push(members || "_None found (public)._" );
  lines.push("");

  lines.push("> Generated by organization-team-site");
  return lines.join("\n");
}

function buildHtmlEmbed(){
  const url = cardUrlForOrg(state.org);
  return `<!-- Org team card embed -->\n<img alt="${escapeAttr(state.org)} team card" src="${url}" />`;
}

function buildCardUrl(){
  return cardUrlForOrg(state.org);
}

function enableCopyIfOutput(){
  $("copyBtn").disabled = !$("output").value.trim();
}

$("loadBtn").addEventListener("click", async () => {
  const org = $("orgInput").value.trim();
  if (!org) return setStatus("Please enter an organization name.", true);
  try{
    await loadOrg(org);
  }catch(e){
    console.error(e);
    setStatus(e.message || "Failed to load org.", true);
  }
});

$("addLinkBtn").addEventListener("click", () => {
  const label = $("linkLabel").value.trim() || "Link";
  const url = $("linkUrl").value.trim();
  if (!url) return setStatus("Please enter a URL to add.", true);
  state.links.push({label, url});
  $("linkLabel").value = "";
  $("linkUrl").value = "";
  renderLinks();
  setStatus("Link added.");
});

$("genReadmeBtn").addEventListener("click", () => {
  if (!state.org) return setStatus("Load an org first.", true);
  $("output").value = buildReadmeMarkdown();
  enableCopyIfOutput();
  setStatus("Markdown generated.");
});

$("genHtmlBtn").addEventListener("click", () => {
  if (!state.org) return setStatus("Load an org first.", true);
  $("output").value = buildHtmlEmbed();
  enableCopyIfOutput();
  setStatus("HTML embed generated.");
});

$("genCardUrlBtn").addEventListener("click", () => {
  if (!state.org) return setStatus("Load an org first.", true);
  $("output").value = buildCardUrl();
  enableCopyIfOutput();
  setStatus("Card URL generated.");
});

$("copyBtn").addEventListener("click", async () => {
  const text = $("output").value;
  if (!text.trim()) return;
  await navigator.clipboard.writeText(text);
  setStatus("Copied to clipboard.");
});

$("output").addEventListener("input", enableCopyIfOutput);

initCardServiceUi();
renderLinks();
renderPeople("ownersGrid", []);
renderPeople("membersGrid", []);
setStatus("Ready.");
