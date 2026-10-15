import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { AssistantMessageComponent, UserMessageComponent, initTheme } from "@earendil-works/pi-coding-agent";
import { Container, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { theme as charcoal } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import { installConversationLayout } from "../conversation.ts";
import { renderLayoutFrame } from "../node_modules/@earendil-works/pi-tui/dist/layout.js";

initTheme("dark", false);

test("conversation bubbles use the active theme and stay readable at narrow and wide sizes", () => {
  const userRender = UserMessageComponent.prototype.render;
  const assistantUpdate = AssistantMessageComponent.prototype.updateContent;
  const restore = installConversationLayout(() => charcoal);
  try {
    const user = new UserMessageComponent("Can we make this feel calmer? 世界 😀\n\n**Keep the tools useful.**");
    const assistant = new AssistantMessageComponent({ role: "assistant", content: [{ type: "text", text: "Yes. Your messages sit on the right; replies stay on the left.\n\n- Tool status colors stay visible.\n- Paths and timings remain available." }], stopReason: "stop" } as any, true);
    for (const width of [1, 3, 8, 24, 49, 50, 80, 120, 200]) {
      for (const line of user.render(width)) assert.ok(visibleWidth(line) <= width, `bubble fits ${width} columns`);
      // Native assistant Markdown requires room for its padding and list bullets.
      if (width >= 8) for (const line of assistant.render(width)) assert.ok(visibleWidth(line) <= width, `reply fits ${width} columns`);
    }
    const lines = user.render(120).map(stripTerminalSequences);
    assert.equal(lines[0].trim(), "", "one top padding row");
    assert.equal(lines.at(-1)!.trim(), "", "one bottom padding row");
    assert.ok(lines[1].includes("Can we"));
    assert.ok(lines.at(-2)!.includes("Keep the tools useful."));
    assert.ok(lines[1].search(/\S/) > 60, "bubble sits on the right");
    const painted = user.render(120);
    const background = charcoal.bg("userMessageBg", " ");
    assert.ok(painted[0].includes(background.slice(0, background.indexOf(" "))), "top padding carries the bubble background");
    assert.equal(stripTerminalSequences(painted[0]), stripTerminalSequences(painted.at(-1)!), "top and bottom padding match");
    assert.ok(lines.every(line => visibleWidth(line) === 119), "each row ends at the same right margin");
    assert.ok(!/[╭╮╰╯│─]/u.test(lines.join("\n")), "background only, no border");
    assert.equal(new UserMessageComponent("Hello").render(120).length, 3, "short messages have one body row and equal padding rows");
    const marked = user.render(120).join("\n");
    for (const zone of ["A", "B", "C"]) assert.equal(marked.split(`\x1b]133;${zone}\x07`).length - 1, 1, "native terminal zones are preserved once");
    assert.ok(!lines.some(line => line.trim() === "You"));
    assert.match(lines.join("\n"), /世界 😀/);
    const reply = assistant.render(120).map(stripTerminalSequences);
    assert.ok(!reply.some(line => line.trim() === "Pi"));
    assert.ok(reply.find(line => line.includes("Yes."))!.search(/\S/) <= 1);
    assistant.invalidate();
    assert.deepEqual(assistant.render(120).map(stripTerminalSequences), reply, "native replies remain unchanged during updates");
    const thinking = new AssistantMessageComponent({ role: "assistant", content: [{ type: "thinking", thinking: "Reasoning" }], stopReason: "stop" } as any, true);
    assert.ok(!thinking.render(120).map(stripTerminalSequences).some(line => line.trim() === "Pi"), "thinking is not labeled as a reply");
    const preview = new Container();
    preview.addChild(user); preview.addChild(assistant);
    const rendered = preview.render(120);
    mkdirSync("artifacts", { recursive: true });
    writeFileSync("artifacts/conversation.ansi", rendered.join("\n") + "\n");
    writeFileSync("artifacts/conversation.txt", rendered.map(stripTerminalSequences).join("\n") + "\n");
  } finally { restore(); }
  assert.equal(UserMessageComponent.prototype.render, userRender);
  assert.equal(AssistantMessageComponent.prototype.updateContent, assistantUpdate);
});

test("fullscreen compositor removes terminal zone controls from compact user messages", () => {
  const restore = installConversationLayout(() => charcoal);
  try {
    for (const text of ["I don't see my messages", "First line\n\nSecond line"]) {
      const user = new UserMessageComponent(text);
      const frame = renderLayoutFrame(user, 120, 10, () => {});
      assert.ok(frame.lines.some(line => stripTerminalSequences(line).includes(text.split("\n")[0])));
      assert.ok(frame.lines.every(line => !line.includes("\x1b]133;")), "fullscreen must consume shell markers, not forward them inside a painted row");
    }
  } finally { restore(); }
});

test("compact right-aligned bubbles translate mouse coordinates and restore native dispatch", () => {
  const proto = UserMessageComponent.prototype;
  const original = proto.handleMouse;
  const own = Object.hasOwn(proto, "handleMouse");
  let event: any;
  proto.handleMouse = function (input) { event = input; return undefined; };
  const spy = proto.handleMouse;
  const restore = installConversationLayout(() => charcoal);
  try {
    const user = new UserMessageComponent("Hello");
    const lines = user.render(100).map(stripTerminalSequences);
    const inset = 100 - 1 - 9; // Hello plus two padding cells on each side
    user.handleMouse({ type: "click", button: "left", x: inset + 3, y: 1, width: 100, height: lines.length } as any);
    assert.equal(event.x, 2);
    assert.equal(event.y, 1);
    assert.equal(event.width, 7);
    assert.equal(user.handleMouse({ type: "click", button: "left", x: 0, y: 0 } as any), undefined);
  } finally {
    restore();
    assert.equal(proto.handleMouse, spy);
    if (own) proto.handleMouse = original;
    else delete (proto as any).handleMouse;
  }
});
