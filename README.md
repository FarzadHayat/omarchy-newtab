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

## Keys

`/` search, `1`-`9` open link (`Shift` for new tab), `[` `]` switch group, `t` next theme, `,` settings.
