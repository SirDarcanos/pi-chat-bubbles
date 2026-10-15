# Changelog

Notable user-facing changes are recorded here before release.
This package follows Semantic Versioning; pre-1.0 rules and release authority
are defined in [the workflow](https://github.com/SirDarcanos/pi-chat-bubbles/blob/main/docs/agents/workflow.md#versioning-and-releases).

## Unreleased

### Added

- Choose left or right alignment independently for user and assistant bubbles; defaults remain user right and assistant left.

## 0.1.0 - 2026-10-15

### Added

- Configure per-bubble percentage width caps and theme-or-hex colors, including assistant heading, link, and inline-code colors, in `chat-bubbles.json`.
- Right-aligned user bubbles and left-aligned reply bubbles, sized to content up to 90% of the terminal width.
- Balanced padding and theme-derived reply colors with brighter prose.
- Native Markdown and terminal message markers preserved across rendering and reload.
