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
const DEFAULTS = { theme: SYSTEM, name: "", clock: "24", wallpaper: false, links: DEFAULT_LINKS, group: 0 };
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

function buildSuggestions(query) {
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
  return [...url, ...links, { kind: "search", label: `search "${query}"`, q: query }];
}

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
      kind.textContent = r.kind === "link" ? r.group : r.kind === "url" ? "open" : "web";
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
  if (newTab) {
    window.open(r.href, "_blank");
    q.value = "";
    closeSuggestions();
  } else {
    location.href = r.href;
  }
}

q.addEventListener("input", () => {
  suggestions = buildSuggestions(q.value.trim());
  selected = 0;
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
syncSystemTheme();
setInterval(() => document.visibilityState === "visible" && syncSystemTheme(), 2000);
document.addEventListener("visibilitychange", syncSystemTheme);
