import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { AssistantMessageComponent, ToolExecutionComponent, UserMessageComponent, initTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Text, backgroundAnsi, colorToRgb, foregroundAnsi, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { theme, getThemeByName } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import { renderLayoutFrame } from "../node_modules/@earendil-works/pi-tui/dist/layout.js";
import { installConversationLayout } from "../conversation.ts";
import { installReplyBubbles, replyColors } from "../reply-bubbles.ts";
import chatBubbles from "../chat-bubbles.ts";

initTheme("dark", false);
const message = (text: string, thinking?: string) => ({ role: "assistant", content: [...(thinking ? [{ type: "thinking", thinking }] : []), { type: "text", text }], stopReason: "stop" } as any);

test("conversation-only bubbles fit 90%, keep roles on opposite sides, and preserve native prose", () => {
  const toolRender = ToolExecutionComponent.prototype.render;
  const users = installConversationLayout(() => theme);
  const replies = installReplyBubbles(() => theme);
  try {
    for (const width of [1, 3, 8, 24, 49, 50, 80, 120, 200]) {
      const user = new UserMessageComponent("Long prompt 世界 😀 ".repeat(50));
      const reply = new AssistantMessageComponent(message("Long reply 世界 😀 ".repeat(50)), true);
      const cap = Math.max(1, Math.floor(width * 0.9));
      const userLines = user.render(width).map(stripTerminalSequences);
      const replyLines = reply.render(width).map(stripTerminalSequences);
      // Padding is painted across the bubble width; subtract the outer inset.
      const userInset = Math.max(0, width - 1 - cap);
      for (const line of userLines) assert.ok(visibleWidth(line) - userInset <= cap);
      for (const line of replyLines) assert.ok(visibleWidth(line) - Math.min(1, width - 1) <= cap);
      for (const component of [user, reply]) {
        const frame = renderLayoutFrame(component, width, 30, () => {});
        for (const line of frame.lines) {
          assert.ok(visibleWidth(line) <= width);
          assert.ok(!line.includes("\x1b]133;"));
        }
      }
    }
    const user = new UserMessageComponent("Make the conversation easier to follow.");
    const reply = new AssistantMessageComponent(message("Your messages stay on the right.\n\nReplies sit on the left, with a quieter background.\n\n- Tools keep their own compact layout.\n- Both bubbles can use up to 90% of the screen."), true);
    const userLines = user.render(120).map(stripTerminalSequences);
    const replyLines = reply.render(120).map(stripTerminalSequences);
    assert.ok(userLines[1].search(/\S/) > 60);
    assert.ok(replyLines.find(line => line.includes("Your messages"))!.search(/\S/) < 5);
    assert.notEqual(theme.bg("userMessageBg", "x"), theme.bg("toolPendingBg", "x"));
    assert.ok(!replyLines.some(line => line.trim() === "Pi"));
    assert.ok((reply as any).contentContainer.children.some((child: unknown) => child instanceof Markdown), "keep Markdown identity for silent-mode filtering");
    const preview = new Container(); preview.addChild(user); preview.addChild(new Text("  ✓ read · fixture.ts · 2ms", 0, 0)); preview.addChild(reply);
    mkdirSync("artifacts", { recursive: true });
    const frame = renderLayoutFrame(preview, 120, 20, () => {});
    writeFileSync("artifacts/chat-bubbles.ansi", frame.lines.join("\n") + "\n");
    writeFileSync("artifacts/chat-bubbles.txt", frame.lines.map(stripTerminalSequences).join("\n") + "\n");
    assert.equal(ToolExecutionComponent.prototype.render, toolRender);
  } finally { replies(); users(); }
});

test("streaming, thinking, errors, theme changes, retained rows, and reload are safe", () => {
  const originalRender = AssistantMessageComponent.prototype.render;
  const reply = new AssistantMessageComponent(message("First", "Thinking fixture"), true);
  const native = reply.render(100);
  let currentTheme = theme;
  const restore = installReplyBubbles(() => currentTheme);
  reply.render(100);
  assert.equal(stripTerminalSequences(reply.render(100)[1]).trim(), "Thinking...", "thinking stays outside the bubble");
  reply.updateContent(message("Updated text"), true);
  assert.match(reply.render(100).map(stripTerminalSequences).join("\n"), /Updated text/);
  const beforeTheme = reply.render(100).join("\n");
  currentTheme = getThemeByName("light")!;
  assert.notEqual(reply.render(100).join("\n"), beforeTheme);
  reply.updateContent({ ...message("Failed attempt"), stopReason: "error", errorMessage: "FAILURE_DETAIL" }, false);
  const lines = reply.render(100);
  const error = lines.find(line => stripTerminalSequences(line).includes("FAILURE_DETAIL"))!;
  assert.ok(!error.includes("\x1b[48;"), "native error is not painted into prose");
  reply.updateContent(message("First", "Thinking fixture"), false);
  reply.render(100);
  restore();
  assert.equal(AssistantMessageComponent.prototype.render, originalRender);
  assert.deepEqual(reply.render(100), native, "retained rows return to native rendering on disable");
  const restoreAgain = installReplyBubbles(() => theme);
  const once = reply.render(100);
  reply.invalidate();
  assert.deepEqual(reply.render(100), once, "stream updates do not stack padding");
  restoreAgain();
});

test("reply colors stand apart from user and tool surfaces without repainting Markdown accents", () => {
  const restore = installReplyBubbles(() => theme);
  try {
    const colors = replyColors(theme);
    const fg = foregroundAnsi(colors.foreground, theme.getColorMode());
    const bg = backgroundAnsi(colors.background, theme.getColorMode());
    assert.notEqual(bg, theme.getBgAnsi("userMessageBg"));
    assert.notEqual(bg, theme.getBgAnsi("toolPendingBg"));
    const brighter = colorToRgb(colors.foreground);
    const normal = colorToRgb(theme.colors.text);
    assert.ok(brighter.r > normal.r && brighter.g > normal.g && brighter.b > normal.b);
    const component = new AssistantMessageComponent(message("Plain reply with `code` and more text."), true);
    const rendered = component.render(100).join("\n");
    assert.ok(rendered.includes(bg + fg));
    assert.ok(rendered.includes(theme.getFgAnsi("mdCode")), "inline code retains its own foreground");
    assert.ok(rendered.includes("\x1b[39m" + fg), "normal prose resumes in the brighter foreground");
  } finally { restore(); }
});

test("standalone extension does not register tools or run outside TUI", () => {
  const handlers = new Map<string, Function>();
  chatBubbles({ on: (name: string, callback: Function) => handlers.set(name, callback) } as any);
  const userRender = UserMessageComponent.prototype.render;
  const replyRender = AssistantMessageComponent.prototype.render;
  handlers.get("session_start")!({}, { mode: "json" });
  assert.equal(UserMessageComponent.prototype.render, userRender);
  handlers.get("session_start")!({}, { mode: "tui", ui: { theme } });
  assert.notEqual(UserMessageComponent.prototype.render, userRender);
  handlers.get("session_shutdown")!();
  assert.equal(UserMessageComponent.prototype.render, userRender);
  assert.equal(AssistantMessageComponent.prototype.render, replyRender);
});
