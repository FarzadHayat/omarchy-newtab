"use strict";

const LOGO = [
  "######################################################",
  "####                     ####                     ####",
  "####    #####################         ########    ####",
  "####    ####                              ####    ####",
  "####    ####                              ####    ####",
  "####    ####                              ####    ####",
  "############                              ####    ####",
  "####    ####                              ####    ####",
  "####    ####                              ####    ####",
  "####    ####                              ####    ####",
  "####    ######################################    ####",
  "####                     ####                     ####",
  "#############################     ####################",
];

const DEFAULT_LINKS = `# main
GitHub | https://github.com
YouTube | https://youtube.com
Gmail | https://mail.google.com
Calendar | https://calendar.google.com
Claude | https://claude.ai
Hacker News | https://news.ycombinator.com

# omarchy
Manual | https://learn.omacom.io/2/the-omarchy-manual
Omarchy | https://github.com/basecamp/omarchy
Hyprland Wiki | https://wiki.hypr.land
Arch Wiki | https://wiki.archlinux.org
AUR | https://aur.archlinux.org

# dev
MDN | https://developer.mozilla.org
Can I use | https://caniuse.com
Regex101 | https://regex101.com
Stack Overflow | https://stackoverflow.com`;

const SYSTEM = "omarchy";
const FALLBACK = "osaka-jade";
const DEFAULTS = { theme: SYSTEM, name: "", clock: "24", wallpaper: false, focusSearch: false, links: DEFAULT_LINKS, group: 0 };
const ACCENTS = ["accent", "cyan", "magenta", "yellow", "green", "red"];

const $ = (id) => document.getElementById(id);

const state = load();
let system = readJSON("omarchy-newtab-system");

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function load() {
  const saved = readJSON("omarchy-newtab") || {};
  // Settings saved before the Omarchy theme existed start following the system theme.
  if (!saved.v) delete saved.theme;
  return { ...DEFAULTS, ...saved, v: 2 };
}

function save() {
  localStorage.setItem("omarchy-newtab", JSON.stringify(state));
}

// Chrome keeps focus in the address bar on its new tab page, even after the page
// navigates. A tab opened by the extension starts with the page focused, so swap
// this tab for one of those.
const FOCUS_QUERY = "?focus";
if (state.focusSearch && location.search !== FOCUS_QUERY && globalThis.chrome?.tabs) {
  chrome.tabs.getCurrent((tab) => {
    if (!tab) return;
    const url = chrome.runtime.getURL(`src/newtab.html${FOCUS_QUERY}`);
    chrome.tabs.create({ url, windowId: tab.windowId, index: tab.index, active: true }, () => chrome.tabs.remove(tab.id));
  });
}

// ---------- logo ----------

function drawLogo(svg) {
  const h = 52 / LOGO.length;
  let d = "";
  LOGO.forEach((row, y) => {
    for (const m of row.matchAll(/#+/g)) d += `M${m.index} ${y * h}h${m[0].length}v${h}h-${m[0].length}z`;
  });
  svg.innerHTML = `<path d="${d}"/>`;
}

// ---------- theme ----------

function palette(name) {
  if (name === SYSTEM) return system || THEMES[FALLBACK];
  return THEMES[name] || THEMES[FALLBACK];
}

function applyTheme(name) {
  const t = palette(name);
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(t)) if (v.startsWith("#")) root.setProperty(`--${k}`, v);
  document.documentElement.style.colorScheme = t.mode;
  $("bar-theme").textContent = name === SYSTEM ? `omarchy · ${system?.name || FALLBACK}` : name;
  document.querySelectorAll(".theme-opt").forEach((b) => b.setAttribute("aria-checked", b.dataset.theme === name));
}

// The Omarchy theme-set hook writes the live system colors to omarchy-theme.json.
async function syncSystemTheme() {
  let next;
  try {
    const res = await fetch("omarchy-theme.json", { cache: "no-store" });
    if (!res.ok) return;
    next = await res.json();
  } catch {
    return;
  }
  if (JSON.stringify(next) === JSON.stringify(system)) return;
  system = next;
  localStorage.setItem("omarchy-newtab-system", JSON.stringify(system));
  renderThemePicker();
  if (state.theme === SYSTEM) applyTheme(SYSTEM);
  applyWallpaper();
}

function applyWallpaper() {
  const on = state.wallpaper && system?.wallpaper;
  document.body.classList.toggle("has-wallpaper", Boolean(on));
  document.body.style.setProperty("--wallpaper", on ? `url("${system.wallpaper}")` : "none");
}

function cycleTheme() {
  const names = [SYSTEM, ...Object.keys(THEMES)];
  state.theme = names[(names.indexOf(state.theme) + 1) % names.length];
  applyTheme(state.theme);
  save();
}

function renderThemePicker() {
  const list = $("theme-list");
  list.replaceChildren(
    ...[SYSTEM, ...Object.keys(THEMES)].map((name) => {
      const t = palette(name);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "theme-opt";
      b.role = "radio";
      b.dataset.theme = name;
      b.setAttribute("aria-checked", name === state.theme);
      b.innerHTML = `<span class="swatch" aria-hidden="true">${[t.bg, t.fg, t.accent, t.cyan, t.magenta, t.yellow]
        .map((c) => `<i style="background:${c}"></i>`).join("")}</span><span class="theme-name">${name === SYSTEM ? "omarchy (system)" : name}</span>`;
      b.addEventListener("click", () => {
        state.theme = name;
        applyTheme(name);
        save();
      });
      return b;
    }),
  );
}

// ---------- clock ----------

function tick() {
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  let suffix = "";
  if (state.clock === "12") {
    suffix = `<span class="ampm">${h < 12 ? "am" : "pm"}</span>`;
    h = h % 12 || 12;
  }
  const hh = state.clock === "12" ? String(h) : String(h).padStart(2, "0");
  const clock = $("clock");
  clock.dateTime = now.toISOString();
  clock.innerHTML = `${hh}<span class="colon">:</span>${m}${suffix}`;

  $("bar-date").textContent = now
    .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
    .toLowerCase();

  const hour = now.getHours();
  const part = hour < 5 ? "late night" : hour < 12 ? "good morning" : hour < 18 ? "good afternoon" : "good evening";
  const greet = $("greeting");
  greet.textContent = state.name ? `${part}, ` : part;
  if (state.name) {
    const b = document.createElement("b");
    b.textContent = state.name;
    greet.append(b);
  }
}

// ---------- links ----------

function parseLinks(text) {
  const groups = [];
  const errors = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith("#")) {
      groups.push({ name: line.replace(/^#+/, "").trim() || `group ${groups.length + 1}`, links: [] });
      return;
    }
    const [label, url] = line.split("|").map((s) => s.trim());
    if (!label || !url) return errors.push(`line ${i + 1}: use "label | url"`);
    let href;
    try {
      href = new URL(/^[a-z][\w+.-]*:/i.test(url) ? url : `https://${url}`).href;
    } catch {
      return errors.push(`line ${i + 1}: "${url}" is not a valid url`);
    }
    if (!groups.length) groups.push({ name: "links", links: [] });
    groups.at(-1).links.push({ label, href });
  });
  return { groups, errors };
}

let groups = [];

function renderLinks() {
  groups = parseLinks(state.links).groups;
  if (state.group >= groups.length) state.group = 0;

  $("workspaces").replaceChildren(
    ...groups.map((g, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = i + 1;
      b.title = g.name;
      b.setAttribute("aria-label", `Show ${g.name} links`);
      b.setAttribute("aria-current", i === state.group);
      b.addEventListener("click", () => showGroup(i));
      return b;
    }),
  );

  const group = groups[state.group];
  $("group-title").textContent = group ? group.name : "links";
  const list = $("links");

  if (!group || !group.links.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "no links yet. press , to add some.";
    list.replaceChildren(li);
    return;
  }

  list.replaceChildren(
    ...group.links.map((link, i) => {
      const li = document.createElement("li");
      li.style.animationDelay = `${i * 30}ms`;
      const a = document.createElement("a");
      a.href = link.href;
      a.style.setProperty("--c", `var(--${ACCENTS[i % ACCENTS.length]})`);
      const key = document.createElement("span");
      key.className = "key";
      key.setAttribute("aria-hidden", "true");
      key.textContent = i < 9 ? i + 1 : "";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = link.label;
      const host = document.createElement("span");
      host.className = "host";
      host.textContent = new URL(link.href).host.replace(/^www\./, "") || link.href;
      a.append(key, label, host);
      if (i < 9) a.setAttribute("aria-keyshortcuts", String(i + 1));
      li.append(a);
      return li;
    }),
  );
}

function showGroup(i) {
  if (!groups.length) return;
  state.group = (i + groups.length) % groups.length;
  save();
  renderLinks();
}

// ---------- search ----------

const URL_LIKE = /^(https?:\/\/)?(localhost|[\w-]+(\.[\w-]+)+|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#]\S*)?$/i;

function toUrl(q) {
  return /^https?:\/\//i.test(q) ? q : `${/^(localhost|\d)/.test(q) ? "http" : "https"}://${q}`;
}

function searchWeb(q) {
  if (globalThis.chrome?.search?.query) {
    chrome.search.query({ text: q, disposition: "CURRENT_TAB" });
  } else {
    location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }
}

// ---------- suggestions ----------

const q = $("q");
const list = $("suggestions");
let suggestions = [];
let selected = 0;
let moved = false;

// Every letter of the query must appear in order; earlier, tighter matches rank higher.
function fuzzy(query, text) {
  const t = text.toLowerCase();
  let pos = -1;
  let gaps = 0;
  const hits = [];
  for (const ch of query.toLowerCase()) {
    const next = t.indexOf(ch, pos + 1);
    if (next === -1) return null;
    gaps += next - pos - 1;
    hits.push(next);
    pos = next;
  }
  return { score: gaps + hits[0] * 2, hits };
}

// Browser sources the user has granted; Chrome is the source of truth.
const SOURCES = ["tabs", "bookmarks", "history"];
const granted = new Set();
let queryId = 0;

async function loadGranted() {
  if (!globalThis.chrome?.permissions) return;
  const { permissions = [] } = await chrome.permissions.getAll();
  granted.clear();
  permissions.filter((p) => SOURCES.includes(p)).forEach((p) => granted.add(p));
}

const ownPage = (url) => !url || url.startsWith("chrome://newtab") || url.startsWith(location.origin);
const hostOf = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const words = (query) => query.toLowerCase().split(/\s+/).filter(Boolean);
const matchesAll = (query, text) => words(query).every((w) => text.toLowerCase().includes(w));

async function browserSuggestions(query) {
  const jobs = [];
  if (granted.has("tabs")) {
    jobs.push(
      chrome.tabs.query({}).then((tabs) =>
        tabs
          .filter((t) => !ownPage(t.url) && matchesAll(query, `${t.title} ${t.url}`))
          .slice(0, 3)
          .map((t) => ({ kind: "tab", label: t.title || t.url, href: t.url, tabId: t.id, windowId: t.windowId })),
      ),
    );
  }
  if (granted.has("bookmarks")) {
    jobs.push(
      chrome.bookmarks.search(query).then((marks) =>
        marks
          .filter((b) => b.url)
          .slice(0, 3)
          .map((b) => ({ kind: "bookmark", label: b.title || b.url, href: b.url })),
      ),
    );
  }
  if (granted.has("history")) {
    jobs.push(
      chrome.history.search({ text: query, startTime: 0, maxResults: 25 }).then((items) =>
        items
          .filter((h) => !ownPage(h.url))
          .sort((a, b) => b.typedCount - a.typedCount || b.visitCount - a.visitCount)
          .slice(0, 5)
          .map((h) => ({ kind: "history", label: h.title || h.url, href: h.url })),
      ),
    );
  }
  return (await Promise.allSettled(jobs)).flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

function buildSuggestions(query, extra = []) {
  if (!query) return [];
  const links = groups
    .flatMap((g) => g.links.map((link) => ({ ...link, group: g.name })))
    .map((link) => {
      const byLabel = fuzzy(query, link.label);
      const byHost = byLabel ? null : fuzzy(query, new URL(link.href).host);
      const m = byLabel || byHost;
      return m && { kind: "link", ...link, score: m.score + (byHost ? 50 : 0), hits: byLabel?.hits || [] };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);
  const url = URL_LIKE.test(query) ? [{ kind: "url", label: query, href: toUrl(query) }] : [];

  // Drop browser results that repeat a saved link or each other.
  const seen = new Set([...url, ...links].map((r) => r.href.replace(/\/$/, "")));
  const fresh = extra.filter((r) => {
    const key = r.href.replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Like Chrome's autocomplete, a site whose address starts with the query beats a web search.
  const q0 = query.toLowerCase();
  // History is already sorted by visits, so it gets first pick.
  const strong = url.length
    ? []
    : ["history", "bookmark"].flatMap((kind) => fresh.filter((r) => r.kind === kind && hostOf(r.href).startsWith(q0))).slice(0, 1);
  const rest = fresh.filter((r) => !strong.includes(r)).slice(0, 6);
  return [...url, ...links, ...strong, { kind: "search", label: `search "${query}"`, q: query }, ...rest];
}

const KIND_LABEL = { url: "open", search: "web", tab: "switch to tab", bookmark: "bookmark", history: "history" };

function renderSuggestions() {
  const open = suggestions.length > 0;
  list.hidden = !open;
  q.setAttribute("aria-expanded", open);
  list.replaceChildren(
    ...suggestions.map((r, i) => {
      const li = document.createElement("li");
      li.id = `sug-${i}`;
      li.role = "option";
      li.setAttribute("aria-selected", i === selected);
      const label = document.createElement("span");
      label.className = "sug-label";
      [...r.label].forEach((ch, j) => {
        if (r.hits?.includes(j)) {
          const m = document.createElement("mark");
          m.textContent = ch;
          label.append(m);
        } else label.append(ch);
      });
      const kind = document.createElement("span");
      kind.className = "sug-kind";
      kind.textContent = r.kind === "link" ? r.group : KIND_LABEL[r.kind];
      if (r.kind === "tab" || r.kind === "bookmark" || r.kind === "history") {
        const host = document.createElement("span");
        host.className = "sug-url";
        host.textContent = hostOf(r.href);
        label.append(host);
      }
      li.append(label, kind);
      // mousedown keeps focus in the input so the list doesn't close first.
      li.addEventListener("mousedown", (e) => e.preventDefault());
      li.addEventListener("click", (e) => choose(r, e.shiftKey || e.ctrlKey || e.metaKey));
      return li;
    }),
  );
  if (open) q.setAttribute("aria-activedescendant", `sug-${selected}`);
  else q.removeAttribute("aria-activedescendant");
}

function select(i) {
  if (!suggestions.length) return;
  moved = true;
  selected = (i + suggestions.length) % suggestions.length;
  list.querySelectorAll("[role=option]").forEach((el, j) => el.setAttribute("aria-selected", j === selected));
  q.setAttribute("aria-activedescendant", `sug-${selected}`);
  $(`sug-${selected}`).scrollIntoView({ block: "nearest" });
}

function closeSuggestions() {
  suggestions = [];
  renderSuggestions();
}

function choose(r, newTab = false) {
  if (!r) return;
  if (r.kind === "search") return searchWeb(r.q);
  if (r.kind === "tab" && !newTab) return switchToTab(r);
  if (newTab) {
    window.open(r.href, "_blank");
    q.value = "";
    closeSuggestions();
  } else {
    location.href = r.href;
  }
}

// Jump to the open tab and close this new tab, like Chrome's "switch to tab".
async function switchToTab(r) {
  await chrome.tabs.update(r.tabId, { active: true });
  await chrome.windows.update(r.windowId, { focused: true });
  const self = await chrome.tabs.getCurrent();
  if (self) chrome.tabs.remove(self.id);
}

q.addEventListener("input", async () => {
  const query = q.value.trim();
  const id = ++queryId;
  suggestions = buildSuggestions(query);
  selected = 0;
  moved = false;
  renderSuggestions();
  if (!query || !granted.size) return;
  const extra = await browserSuggestions(query);
  // Ignore answers for a query the user has already typed past.
  if (id !== queryId || q.value.trim() !== query) return;
  // Keep the user's arrow-key choice; otherwise highlight the new top result.
  const current = suggestions[selected];
  suggestions = buildSuggestions(query, extra);
  selected = moved ? Math.max(0, suggestions.findIndex((r) => r.label === current?.label && r.kind === current?.kind)) : 0;
  renderSuggestions();
});

q.addEventListener("keydown", (e) => {
  if (list.hidden) return;
  if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) select(selected + 1);
  else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) select(selected - 1);
  else if (e.key === "Enter") choose(suggestions[selected], e.shiftKey);
  else if (e.key === "Escape") closeSuggestions();
  else return;
  e.preventDefault();
  e.stopPropagation();
});

q.addEventListener("blur", closeSuggestions);

$("search").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = q.value.trim();
  if (!query) return;
  URL_LIKE.test(query) ? (location.href = toUrl(query)) : searchWeb(query);
});

// ---------- settings ----------

const dialog = $("settings");

function openSettings() {
  $("set-name").value = state.name;
  $("set-clock").value = state.clock;
  $("set-wallpaper").checked = state.wallpaper;
  $("set-focus").checked = state.focusSearch;
  document.querySelectorAll("[data-source]").forEach((box) => {
    box.checked = granted.has(box.dataset.source);
    box.disabled = !globalThis.chrome?.permissions;
  });
  $("set-links").value = state.links;
  $("links-error").textContent = "";
  dialog.showModal();
}

$("open-settings").addEventListener("click", openSettings);

$("save").addEventListener("click", () => {
  const text = $("set-links").value;
  const { errors } = parseLinks(text);
  if (errors.length) {
    $("links-error").textContent = errors[0];
    $("set-links").setAttribute("aria-invalid", "true");
    $("set-links").focus();
    return;
  }
  $("set-links").removeAttribute("aria-invalid");
  state.name = $("set-name").value.trim();
  state.clock = $("set-clock").value;
  state.links = text;
  save();
  renderLinks();
  updatePrompt();
  tick();
  dialog.close();
});

$("set-wallpaper").addEventListener("change", (e) => {
  state.wallpaper = e.target.checked;
  applyWallpaper();
  save();
});

document.querySelectorAll("[data-source]").forEach((box) =>
  box.addEventListener("change", async () => {
    const permissions = [box.dataset.source];
    if (box.checked) box.checked = await chrome.permissions.request({ permissions });
    else await chrome.permissions.remove({ permissions });
    await loadGranted();
  }),
);

$("set-focus").addEventListener("change", (e) => {
  state.focusSearch = e.target.checked;
  save();
});

$("reset").addEventListener("click", () => {
  if (!confirm("Reset links, name and theme to defaults?")) return;
  Object.assign(state, DEFAULTS);
  save();
  applyTheme(state.theme);
  applyWallpaper();
  renderLinks();
  updatePrompt();
  tick();
  dialog.close();
});

function updatePrompt() {
  $("prompt-user").textContent = state.name ? `${state.name.toLowerCase().replace(/\s+/g, "")}@omarchy ~` : "~";
}

// ---------- keyboard ----------

document.addEventListener("keydown", (e) => {
  if (dialog.open || e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = e.target.closest("input, textarea, select");
  if (typing) {
    if (e.key === "Escape") {
      e.target.value = "";
      e.target.blur();
    }
    return;
  }
  if (e.key === "/") {
    e.preventDefault();
    $("q").focus();
  } else if (/^Digit[1-9]$/.test(e.code)) {
    const a = $("links").querySelectorAll("a")[Number(e.code.at(-1)) - 1];
    if (a) {
      e.preventDefault();
      e.shiftKey ? window.open(a.href, "_blank") : a.click();
    }
  } else if (e.key === "]" || e.key === "l") {
    showGroup(state.group + 1);
  } else if (e.key === "[" || e.key === "h") {
    showGroup(state.group - 1);
  } else if (e.key === "t") {
    cycleTheme();
  } else if (e.key === ",") {
    e.preventDefault();
    openSettings();
  }
});

// ---------- boot ----------

drawLogo($("logo-small"));
drawLogo($("logo-big"));
renderThemePicker();
applyTheme(state.theme);
applyWallpaper();
renderLinks();
updatePrompt();
tick();
setInterval(tick, 1000);
loadGranted();
if (location.search === FOCUS_QUERY) q.focus();
syncSystemTheme();
setInterval(() => document.visibilityState === "visible" && syncSystemTheme(), 2000);
document.addEventListener("visibilitychange", syncSystemTheme);
