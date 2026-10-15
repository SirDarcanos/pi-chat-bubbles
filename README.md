# pi-chat-bubbles

Conversation bubbles for Pi. Your messages sit on the right; assistant replies sit on the left.

- Content-sized bubbles, up to 90% of the terminal width.
- Balanced padding, without labels or borders.
- Native Markdown and terminal message markers preserved.
- Thinking, errors, tool output, and attachments keep their existing renderers.

This package only styles chat messages. It does not compact context, register tools, render tool activity, change the editor, or select a theme. Use separate extensions such as `pi-compact-tools` and `pi-open-tui` for those interfaces.

## Install

Requires Node.js 22.19 or newer and Pi 1.2 or newer.

Until the first npm release, install from GitHub:

```sh
pi install git:github.com/SirDarcanos/pi-chat-bubbles
```

After a release is published to npm:

```sh
pi install npm:pi-chat-bubbles
```

For local development, run `pi install "$PWD"` from the package directory.

Run `/reload` in Pi. Install the package once; do not also load `chat-bubbles.ts` through the `extensions` setting.

## Colors

Bubbles use the active Pi theme:

| Bubble | Background token |
| --- | --- |
| User | `userMessageBg` |
| Assistant | `toolPendingBg` tinted 12% toward `mdLink` |

Replies have a distinct, softly tinted surface (muted blue with the local theme) and higher-contrast prose. Reply text moves toward white in dark themes and black in light themes; Markdown accent and syntax colors are preserved. User bubbles are unchanged. The package does not ship or override a theme. Customize these tokens in your own Pi theme to adjust the colors.

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
- `conversation.ts`: right-aligned user bubbles and mouse-coordinate translation.
- `reply-bubbles.ts`: left-aligned prose bubbles; preserves Markdown identity for other extensions.
- `tests/`: layout, narrow-width, terminal-control, streaming, theme, loader, and reload checks.

Tests write rendered previews under `artifacts/`. Terminal cells cannot reproduce pixel-rounded corners. Extremely narrow windows may clip wide characters to remain within the available width.

See [the changelog](CHANGELOG.md) for notable changes and [the working agreement](https://github.com/SirDarcanos/pi-chat-bubbles/blob/main/docs/agents/workflow.md) for contribution and release boundaries. Report problems through [GitHub Issues](https://github.com/SirDarcanos/pi-chat-bubbles/issues).

## License

[MIT](LICENSE).
