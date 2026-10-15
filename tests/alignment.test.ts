import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { AssistantMessageComponent, UserMessageComponent, initTheme } from "@earendil-works/pi-coding-agent";
import { backgroundAnsi, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { theme, getThemeByName } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import { renderLayoutFrame } from "../node_modules/@earendil-works/pi-tui/dist/layout.js";
import { defaultConfig } from "../config.ts";
import { installConversationLayout } from "../conversation.ts";
import { installReplyBubbles, replyColors } from "../reply-bubbles.ts";

initTheme("dark", false);
const message = (text: string) => ({ role: "assistant", content: [{ type: "text", text }], stopReason: "stop" } as any);
const alignments = ["left", "right"] as const;

function paintedBounds(lines: string[], background: string) {
  const padding = lines.find(line => line.includes(background));
  assert.ok(padding, "painted bubble padding exists");
  const inset = visibleWidth(padding.slice(0, padding.indexOf(background)));
  const size = visibleWidth(padding) - inset;
  return { inset, size, right: inset + size };
}

test("all four role alignments retain content size, edge margins, markers, and width caps", () => {
  const previews: string[] = [];
  for (const userAlignment of alignments) for (const assistantAlignment of alignments) {
    const config = defaultConfig();
    config.user.alignment = userAlignment;
    config.assistant.alignment = assistantAlignment;
    config.user.maxWidth = "65%";
    config.assistant.maxWidth = "55%";
    const restoreUsers = installConversationLayout(() => theme, config.user);
    const restoreReplies = installReplyBubbles(() => theme, config.assistant);
    try {
      for (const width of [1, 3, 8, 24, 49, 50, 80, 120, 200]) {
        const user = new UserMessageComponent("User fixture 世界 😀");
        const reply = new AssistantMessageComponent(message("Assistant fixture [link](https://example.com)."), true);
        for (const [component, options, background] of [
          [user, config.user, theme.getBgAnsi("userMessageBg")],
          [reply, config.assistant, backgroundAnsi(replyColors(theme).background, theme.getColorMode())],
        ] as const) {
          const lines = component.render(width);
          const bounds = paintedBounds(lines, background);
          const margin = Math.min(1, width - 1);
          const cap = Math.max(1, Math.min(width - margin, Math.floor(width * Number.parseFloat(options.maxWidth) / 100)));
          assert.ok(bounds.size <= cap, `${options.alignment} bubble fits cap at ${width}`);
          assert.equal(bounds.inset, options.alignment === "left" ? margin : Math.max(0, width - margin - bounds.size));
          assert.ok(lines.every(line => visibleWidth(line) <= width));
          if (width >= 80) assert.ok(bounds.size < cap, "short content stays compact");
          const frame = renderLayoutFrame(component, width, 30, () => {});
          assert.ok(frame.lines.every(line => !line.includes("\x1b]133;")), "zone controls consumed by compositor");
        }
        const lines = user.render(width);
        assert.ok(lines[0].startsWith("\x1b]133;A\x07"));
        assert.ok(lines.at(-1)!.startsWith("\x1b]133;B\x07\x1b]133;C\x07"));
        if (width === 120) previews.push(`User ${userAlignment}; assistant ${assistantAlignment}`, ...lines, ...reply.render(width), "");
      }
    } finally { restoreReplies(); restoreUsers(); }
  }
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/alignments.ansi", previews.join("\n") + "\n");
  writeFileSync("artifacts/alignments.txt", previews.map(stripTerminalSequences).join("\n") + "\n");
});

test("user mouse translation follows either alignment and host output padding", () => {
  const proto = UserMessageComponent.prototype;
  const original = proto.handleMouse;
  const own = Object.hasOwn(proto, "handleMouse");
  const events: any[] = [];
  proto.handleMouse = function (event) { events.push(event); return undefined; };
  const spy = proto.handleMouse;
  try {
    for (const alignment of alignments) for (const pad of [0, 1, 3]) {
      const restore = installConversationLayout(() => theme, { ...defaultConfig().user, alignment });
      try {
        const user = new UserMessageComponent("Hello", undefined, pad);
        const lines = user.render(100);
        const bounds = paintedBounds(lines, theme.getBgAnsi("userMessageBg"));
        events.length = 0;
        user.handleMouse({ type: "click", button: "left", x: bounds.inset + 3, y: 1, width: 100, height: lines.length } as any);
        assert.equal(events.length, 1);
        assert.equal(events[0].x, 2);
        assert.equal(events[0].y, 1);
        assert.equal(events[0].width, bounds.size - 2);
        for (const [x, y] of [[bounds.inset, 1], [bounds.right, 1], [bounds.inset + 3, 0], [bounds.inset + 3, lines.length - 1]]) {
          user.handleMouse({ type: "click", button: "left", x, y, width: 100, height: lines.length } as any);
        }
        assert.equal(events.length, 1, "outer/side padding and out-of-bubble clicks are ignored");
      } finally { restore(); }
      assert.equal(proto.handleMouse, spy);
    }
  } finally {
    if (own) proto.handleMouse = original;
    else Reflect.deleteProperty(proto, "handleMouse");
  }
});

test("right-aligned streaming replies resize from the right and restore native rendering", () => {
  const reply = new AssistantMessageComponent(message("Short fixture"), true);
  const native = reply.render(100);
  const options = { ...defaultConfig().assistant, alignment: "right" } as const;
  let currentTheme = theme;
  const restore = installReplyBubbles(() => currentTheme, options);
  try {
    const background = () => backgroundAnsi(replyColors(currentTheme, options).background, currentTheme.getColorMode());
    const initial = paintedBounds(reply.render(100), background());
    reply.updateContent(message("A longer streaming fixture that grows leftwards."), true);
    const streamed = paintedBounds(reply.render(100), background());
    assert.equal(initial.right, 99);
    assert.equal(streamed.right, 99);
    assert.ok(streamed.inset < initial.inset);
    currentTheme = getThemeByName("light")!;
    reply.invalidate();
    assert.equal(paintedBounds(reply.render(100), background()).right, 99);
    reply.updateContent(message("Short fixture"), true);
  } finally { restore(); }
  assert.deepEqual(reply.render(100), native);
});

test("alignment does not alter assistant thinking or errors", () => {
  const data = { role: "assistant", content: [{ type: "thinking", thinking: "Thinking fixture" }, { type: "text", text: "Prose fixture" }], stopReason: "error", errorMessage: "Error fixture" } as any;
  for (const alignment of alignments) {
    const reply = new AssistantMessageComponent(data, false);
    const native = reply.render(100);
    const restore = installReplyBubbles(() => theme, { ...defaultConfig().assistant, alignment });
    try {
      const rendered = reply.render(100);
      for (const text of ["Thinking fixture", "Error fixture"]) {
        assert.deepEqual(rendered.filter(line => stripTerminalSequences(line).includes(text)), native.filter(line => stripTerminalSequences(line).includes(text)));
      }
    } finally { restore(); }
    assert.deepEqual(reply.render(100), native);
  }
});
