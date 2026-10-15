# pi-chat-bubbles

![User messages on the right and assistant replies on the left](https://raw.githubusercontent.com/SirDarcanos/pi-chat-bubbles/main/docs/images/chat-bubbles.png)

[![npm version](https://img.shields.io/npm/v/pi-chat-bubbles?style=for-the-badge)](https://www.npmjs.com/package/pi-chat-bubbles)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Conversation bubbles for Pi. By default, your messages sit on the right and assistant replies sit on the left; each role can use either side.

- Content-sized bubbles, up to 90% of the terminal width by default.
- Configurable alignment, widths, and bubble colors, including assistant Markdown accents.
- Balanced padding, without labels or borders.
- Native Markdown and terminal message markers preserved.
- Thinking, errors, tool output, and attachments keep their existing renderers.

This package only styles chat messages. It does not compact context, register tools, render tool activity, change the editor, or select a theme. Use separate extensions such as `pi-compact-tools` and `pi-open-tui` for those interfaces.

## Install

Requires Node.js 22.19 or newer and Pi 1.2 or newer.

Install from npm:

```sh
pi install npm:pi-chat-bubbles
```

Or install from GitHub:

```sh
pi install git:github.com/SirDarcanos/pi-chat-bubbles
```

For local development, run `pi install "$PWD"` from the package directory.

Run `/reload` in Pi. Install the package once; do not also load `chat-bubbles.ts` through the `extensions` setting.

## Configuration

Create `~/.pi/agent/chat-bubbles.json`, then run `/reload`. If you set `PI_CODING_AGENT_DIR`, put the file in that directory instead. This is a separate package configuration file, not Pi's `settings.json`. The extension reads it at startup and on reload; it does not create or rewrite it.

All settings are optional. These are the defaults:

```json
{
  "user": {
    "alignment": "right",
    "maxWidth": "90%",
    "background": "theme",
    "text": "theme"
  },
  "assistant": {
    "alignment": "left",
    "maxWidth": "90%",
    "background": "theme",
    "text": "theme",
    "heading": "theme",
    "link": "theme",
    "inlineCode": "theme"
  }
}
```

| Setting | Accepted values | Effect |
| --- | --- | --- |
| `alignment` | `"left"` or `"right"` | Aligns that role’s bubbles to the chosen edge. Defaults: user right, assistant left. |
| `maxWidth` | Percentage string greater than `0%` and up to `100%`, including decimals | Caps the whole bubble, including padding, relative to terminal width. Short content stays compact. |
| `background` | `"theme"` or `"#RRGGBB"` | Bubble surface and padding. |
| `text` | `"theme"` or `"#RRGGBB"` | Ordinary prose, preserving Markdown colors. |
| `assistant.heading` | `"theme"` or `"#RRGGBB"` | Markdown headings. |
| `assistant.link` | `"theme"` or `"#RRGGBB"` | Link text and displayed URLs. |
| `assistant.inlineCode` | `"theme"` or `"#RRGGBB"` | Inline code, leaving code-block syntax highlighting unchanged. |

To put both roles on the left:

```json
{
  "user": { "alignment": "left" },
  "assistant": { "alignment": "left" }
}
```

Use `"right"` for both to put them on the right, or set each role independently. Alignment changes only message bubbles; thinking, errors, tools, and attachments keep their existing renderers. Changes take effect after `/reload`.

Widths accept **only percentages**: `"75%"` is valid; `75`, `"75px"`, `"40rem"`, and other units are not. At very narrow widths, layout retains at least one terminal cell and may clip wide characters. Existing outer transcript margins still apply at `"100%"`.

Colors accept six-digit hex strings (case-insensitive) or the literal `"theme"`. To replace purple assistant accents with lighter colors on the default dark bubble, for example:

```json
{
  "assistant": {
    "heading": "#FFD166",
    "link": "#80DFFF",
    "inlineCode": "#FFE0A3"
  }
}
```

Explicit colors stay fixed when the theme changes; choose colors with enough contrast for your background. There is no automatic contrast adjustment for overrides. These overrides affect only chat bubbles, not tools or the global Pi theme.

Invalid individual settings produce a warning and use their defaults; valid sibling settings still apply. Unknown options are ignored with a warning. An unreadable file or invalid JSON uses all defaults. A missing file silently uses defaults.

### Theme defaults

`"theme"` preserves the existing theme-derived appearance:

| Bubble | Background token |
| --- | --- |
| User | `userMessageBg` |
| Assistant | `toolPendingBg` tinted 12% toward `mdLink` |

Replies have a distinct, softly tinted surface and higher-contrast prose. Reply text moves toward white in dark themes and black in light themes. User text uses `userMessageText`. Assistant headings, links, and inline code follow `mdHeading`, `mdLink`/`mdLinkUrl`, and `mdCode`. Code-block syntax colors are preserved. The package does not ship or override a global theme.

## Disable

Disable the package in `pi config`, then run `/reload`. Its presentation hooks restore native message rendering on shutdown.

## Development

```sh
npm ci
npm run check
npm test
```

Node 24 is used in CI. Pinned development copies of Pi and its TUI make these checks independent of a global Pi installation.

- `chat-bubbles.ts`: extension entry point and lifecycle.
- `config.ts`: configuration defaults, validation, and file loading.
- `bubble-style.ts`: render-scoped Markdown color overrides.
- `conversation.ts`: user bubble alignment and mouse-coordinate translation.
- `reply-bubbles.ts`: left-aligned prose bubbles; preserves Markdown identity for other extensions.
- `tests/`: layout, narrow-width, terminal-control, streaming, theme, loader, and reload checks.

Tests write rendered previews under `artifacts/`. Terminal cells cannot reproduce pixel-rounded corners. Extremely narrow windows may clip wide characters to remain within the available width.

See [the changelog](CHANGELOG.md) for notable changes and [the working agreement](https://github.com/SirDarcanos/pi-chat-bubbles/blob/main/docs/agents/workflow.md) for contribution and release boundaries. Report problems through [GitHub Issues](https://github.com/SirDarcanos/pi-chat-bubbles/issues).

## License

[MIT](LICENSE).
