import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { AssistantMessageComponent, UserMessageComponent, getMarkdownTheme, initTheme } from "@earendil-works/pi-coding-agent";
import { Markdown, backgroundAnsi, foregroundAnsi, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { theme, getThemeByName } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import { defaultConfig } from "../config.ts";
import { resolveColor, withMarkdownStyle } from "../bubble-style.ts";
import { installConversationLayout } from "../conversation.ts";
import { installReplyBubbles } from "../reply-bubbles.ts";

initTheme("dark", false);
const message = (text: string) => ({ role: "assistant", content: [{ type: "text", text }], stopReason: "stop" } as any);
const fg = (hex: `#${string}`) => foregroundAnsi(resolveColor(hex, theme.colors.text), theme.getColorMode());
const bg = (hex: `#${string}`) => backgroundAnsi(resolveColor(hex, theme.colors.text), theme.getColorMode());

function foregroundAt(lines: string[], text: string): string | undefined {
  const line = lines.find(line => line.includes(text));
  assert.ok(line, `rendered text: ${text}`);
  const prefix = line.slice(0, line.indexOf(text));
  return [...prefix.matchAll(/\x1b\[(?:38;(?:2;\d+;\d+;\d+|5;\d+)|39|0)m/g)].at(-1)?.[0];
}

test("independent percentage caps include padding, even at tiny percentages and wide terminals", () => {
  for (const percent of ["0.1%", "1%", "2%", "50.5%", "100%"] as const) {
    const config = defaultConfig();
    config.user.maxWidth = percent;
    config.assistant.maxWidth = "35%";
    const users = installConversationLayout(() => theme, config.user);
    const replies = installReplyBubbles(() => theme, config.assistant);
    try {
      for (const width of [1, 3, 8, 24, 49, 50, 80, 120, 200]) {
        const user = new UserMessageComponent("Long 世界 😀 prompt ".repeat(15));
        const reply = new AssistantMessageComponent(message("Long 世界 😀 reply ".repeat(15)), true);
        for (const [component, percentage, userRole] of [[user, percent, true], [reply, "35%", false]] as const) {
          const lines = component.render(width).map(stripTerminalSequences);
          const cap = Math.max(1, Math.min(width - Math.min(1, width - 1), Math.floor(width * Number.parseFloat(percentage) / 100)));
          const inset = userRole ? Math.max(0, width - 1 - cap) : Math.min(1, width - 1);
          for (const line of lines) {
            assert.ok(visibleWidth(line) <= width);
            assert.ok(visibleWidth(line) - inset <= cap, `${percentage} at ${width}`);
          }
        }
      }
    } finally { replies(); users(); }
  }
});

test("hex colors cover user body and padding, while Markdown accents stay native", () => {
  const options = { ...defaultConfig().user, background: "#D02060", text: "#FEDCBA" } as const;
  const user = new UserMessageComponent("Normal user prose with `code`. ");
  const native = user.render(100);
  const restore = installConversationLayout(() => theme, options);
  try {
    const lines = user.render(100);
    assert.ok(lines[0].includes(bg(options.background)));
    assert.ok(lines.at(-1)!.includes(bg(options.background)));
    const body = lines.find(line => stripTerminalSequences(line).includes("Normal user"))!;
    assert.ok(body.includes(bg(options.background)));
    assert.equal(foregroundAt(lines, "Normal user"), fg(options.text));
    // Distinct RGB colors can quantize to the same 256-color palette entry.
    // Keep this fixture distinct in both modes so absence detects stale native paint.
    assert.notEqual(bg(options.background), theme.getBgAnsi("userMessageBg"));
    assert.ok(!body.includes(theme.getBgAnsi("userMessageBg")));
    assert.ok(body.includes(theme.getFgAnsi("mdCode")));
    assert.equal(user.render(100).join("\n"), lines.join("\n"), "no stale style cache or accumulated padding");
  } finally { restore(); }
  assert.deepEqual(user.render(100), native);
});

test("assistant hex text, background and each Markdown role are independent and restore", () => {
  const config = defaultConfig();
  Object.assign(config.assistant, { background: "#102030", text: "#F0F1F2", heading: "#FFD166", link: "#80DFFF", inlineCode: "#FFE0A3" });
  const source = "# Heading fixture\n\nPlain prose with `inline fixture` and [link fixture](https://example.com).\n\n```js\nconst result = 42;\n```";
  const reply = new AssistantMessageComponent(message(source), true);
  const native = reply.render(100);
  const baselineRestore = installReplyBubbles(() => theme);
  const baseline = reply.render(100);
  baselineRestore();
  let currentTheme = theme;
  const restore = installReplyBubbles(() => currentTheme, config.assistant);
  try {
    const lines = reply.render(100);
    const rendered = lines.join("\n");
    for (const color of ["#F0F1F2", "#FFD166", "#80DFFF", "#FFE0A3"] as const) assert.ok(rendered.includes(fg(color)), color);
    assert.ok(rendered.includes(bg("#102030")));
    assert.ok(!rendered.includes(theme.getFgAnsi("mdCode")));
    assert.equal(foregroundAt(lines, "Plain prose"), fg("#F0F1F2"));
    assert.equal(foregroundAt(lines, "Heading fixture"), fg("#FFD166"));
    assert.equal(foregroundAt(lines, "inline fixture"), fg("#FFE0A3"));
    assert.equal(foregroundAt(lines, "link fixture"), fg("#80DFFF"));
    const syntax = theme.getFgAnsi("syntaxKeyword");
    assert.ok(baseline.join("\n").includes(syntax));
    assert.ok(rendered.includes(syntax), "code-block syntax remains native");
    const markdown = (reply as any).contentContainer.children.find((child: unknown) => child instanceof Markdown);
    assert.ok(markdown instanceof Markdown);
    assert.deepEqual(reply.render(100), lines);
    currentTheme = getThemeByName("light")!;
    reply.invalidate();
    assert.ok(reply.render(100).join("\n").includes(fg("#FFE0A3")), "explicit colors survive theme changes");
    reply.updateContent(message(source + "\n\nStreamed fixture."), true);
    assert.match(reply.render(100).map(stripTerminalSequences).join("\n"), /Streamed fixture/);
    mkdirSync("artifacts", { recursive: true });
    writeFileSync("artifacts/configured-bubbles.ansi", rendered + "\n");
    writeFileSync("artifacts/configured-bubbles.txt", lines.map(stripTerminalSequences).join("\n") + "\n");
    reply.updateContent(message(source), true);
  } finally { restore(); }
  assert.deepEqual(reply.render(100), native);
});

test("an accent override changes only its semantic role even when theme roles share colors", () => {
  const shared = (text: string) => fg("#AA00AA") + text + "\x1b[39m";
  const markdownTheme = { ...getMarkdownTheme(), heading: shared, link: shared, code: shared };
  const reply = new AssistantMessageComponent(message("# Head\n\n`Code` and [Link](https://example.com)"), true, markdownTheme);
  const restore = installReplyBubbles(() => theme, { ...defaultConfig().assistant, inlineCode: "#FFFFAA" });
  try {
    const lines = reply.render(100);
    assert.equal(foregroundAt(lines, "Code"), fg("#FFFFAA"));
    assert.equal(foregroundAt(lines, "Head"), fg("#AA00AA"));
    assert.equal(foregroundAt(lines, "Link"), fg("#AA00AA"));
    assert.equal(markdownTheme.code, shared, "the supplied theme object is untouched");
  } finally { restore(); }
});

test("configured link labels keep their own color inside headings and restore adjacent heading text", () => {
  const options = { ...defaultConfig().assistant, heading: "#FFD166", link: "#80DFFF", inlineCode: "#FFE0A3" } as const;
  const source = "# Before [Heading link](https://example.com) after\n\n## Start [**Bold link** with `Code label`](https://example.com) end";
  const reply = new AssistantMessageComponent(message(source), true);
  const native = reply.render(120);
  const restore = installReplyBubbles(() => theme, options);
  try {
    const lines = reply.render(120);
    assert.equal(foregroundAt(lines, "Before"), fg(options.heading));
    assert.equal(foregroundAt(lines, "Heading link"), fg(options.link));
    assert.equal(foregroundAt(lines, "after"), fg(options.heading));
    assert.equal(foregroundAt(lines, "Start"), fg(options.heading));
    assert.equal(foregroundAt(lines, "Bold link"), fg(options.link));
    assert.equal(foregroundAt(lines, "Code label"), fg(options.inlineCode));
    assert.equal(foregroundAt(lines, "end"), fg(options.heading));
    assert.deepEqual(reply.render(120), lines);
  } finally { restore(); }
  assert.deepEqual(reply.render(120), native);
});

test("scoped private styles restore on render failure", () => {
  const markdown = new Markdown("fixture", 0, 0, getMarkdownTheme());
  const state = markdown as any;
  const original = [state.theme, state.defaultTextStyle, state.defaultStylePrefix, state.renderInlineTokens];
  const ownInlineRender = Object.hasOwn(state, "renderInlineTokens");
  assert.throws(() => withMarkdownStyle(markdown, theme, { ...defaultConfig().assistant, inlineCode: "#FFFFAA", link: "#80DFFF" }, () => { throw new Error("fixture"); }), /fixture/);
  assert.deepEqual([state.theme, state.defaultTextStyle, state.defaultStylePrefix, state.renderInlineTokens], original);
  assert.equal(Object.hasOwn(state, "renderInlineTokens"), ownInlineRender);
});
