<img src="assets/icon.svg" width="64" height="64" alt="">

# omarchy-newtab

Created in [T3 Code](https://t3.codes).

An Omarchy style new tab page for Chrome and Chromium.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Open a new tab.

## Follow the Omarchy theme

The **omarchy (system)** theme follows your desktop theme, including tabs that are already open. A theme-set hook runs `bin/sync-omarchy-theme` to copy the current colors into the extension:

```bash
omarchy hook install theme-set bin/sync-omarchy-theme
```

Pick any other theme in settings to override it.

The hook also copies your wallpaper. Turn on **use your Omarchy wallpaper as the background** in settings to show it, dimmed, behind the page. It updates when the theme changes, not when you only cycle backgrounds.

## Keys

Start typing anywhere to search. `1`-`9` open a link (`Shift` for a new tab), `[` `]` switch group, `,` settings, `/` jumps to search.

Typing in search suggests matching links from every group. `Enter` opens the highlighted one, `Shift+Enter` in a new tab, arrow keys move. Turn on **open tabs**, **bookmarks** or **history** under suggestions in settings to also suggest from your browser; Chrome asks for permission the first time.

Chrome puts the cursor in the address bar on new tabs. Turn on **put the cursor in search on new tabs** in settings to start in the search box instead. The address bar then shows the extension's address; press `Ctrl+L` to type there.
