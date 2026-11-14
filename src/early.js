// Runs before the page is built so fast typing on a new tab is not lost.
// 1. Swaps to a tab that starts with the page focused, as early as possible.
// 2. Keeps letters typed before newtab.js is ready; newtab.js drops them into the search box.
(() => {
  const FOCUS_QUERY = "?focus";
  let focusSearch = true;
  try {
    const saved = JSON.parse(localStorage.getItem("omarchy-newtab") || "null") || {};
    if (saved.v >= 3 && saved.focusSearch === false) focusSearch = false;
  } catch {}

  if (focusSearch && location.search !== FOCUS_QUERY && globalThis.chrome?.tabs) {
    (async () => {
      try {
        const tab = await chrome.tabs.getCurrent();
        if (!tab) return;
        const url = chrome.runtime.getURL(`src/newtab.html${FOCUS_QUERY}`);
        await chrome.tabs.create({ url, windowId: tab.windowId, index: tab.index, active: true });
        await chrome.tabs.remove(tab.id);
      } catch (err) {
        console.error("Could not swap to a focused tab:", err);
      }
    })();
    return;
  }

  const typed = [];
  window.__earlyKeys = typed;
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    // Only plain text counts. A first key that is a shortcut (digit, [ ] , /) is left alone.
    if (!typed.length && !/^[\p{L}]$/u.test(e.key)) return;
    typed.push(e.key);
  };
  window.addEventListener("keydown", onKey, true);
  window.__stopEarlyKeys = () => window.removeEventListener("keydown", onKey, true);
})();
