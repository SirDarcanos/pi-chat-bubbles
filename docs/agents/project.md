# Project context

## Purpose and stage

`pi-chat-bubbles` is a TypeScript Pi extension that makes the conversation distinguishable from tool activity. User messages align right; assistant prose aligns left. Both have padded backgrounds and content-sized widths capped at 90% of the terminal.

The package is maintained by SirDarcanos, with a public GitHub repository and planned npm distribution for Pi. Version `0.1.0` in the manifest is a development version, not evidence of a published release. No adoption or scale target has been established.

## Scope and constraints

The extension changes message presentation only. Thinking, tool output, errors, and attachments retain their existing renderers. Separate extensions own compact tool rendering and editor chrome. Bubble colors derive from the active theme; installation does not change Ghostty or select a Pi theme.

Pi supplies the host modules at runtime. Keep those modules in peer dependencies; pinned development copies support reproducible tests. The package's `files` allowlist is the publishing boundary.

The implementation patches native component methods because there is no message-layout registration API used here. Its main risks are missing or clipped messages, leaked terminal control sequences, broken mouse coordinates, stacked padding after reload, and interference with other extensions. Native Markdown identity is retained so other extensions can recognize prose.

## Collaboration

Agents own routine engineering choices within the approved task. SirDarcanos approves visual design, product scope, consequential permissions, and releases. Explain visible differences plainly and distinguish automated evidence from live terminal observation.

Use synthetic fixtures in tests and previews. Real prompts, screenshots, task logs, credentials, and machine-specific settings stay outside committed or published files. Terminal cells cannot reproduce smooth pixel-rounded corners; preserve readability rather than promising browser-style geometry.
