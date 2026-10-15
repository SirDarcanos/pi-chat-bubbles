import { test } from "node:test";
import assert from "node:assert/strict";
import { AssistantMessageComponent, UserMessageComponent, initTheme } from "@earendil-works/pi-coding-agent";
import { theme } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import chatBubbles from "../chat-bubbles.ts";

initTheme("dark", false);

test("retained chat bubbles restore and reinstall across session reload without stacked padding", () => {
  const user = new UserMessageComponent("User fixture");
  const reply = new AssistantMessageComponent({ role: "assistant", content: [{ type: "text", text: "Reply fixture" }], stopReason: "stop" } as any, true);
  const nativeUser = user.render(100);
  const nativeReply = reply.render(100);
  const snapshots: string[][][] = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    const events = new Map<string, Function>();
    chatBubbles({ on: (name: string, callback: Function) => events.set(name, callback) } as any);
    try {
      events.get("session_start")!({}, { mode: "tui", ui: { theme } });
      snapshots.push([user.render(100), reply.render(100)]);
      events.get("session_start")!({}, { mode: "tui", ui: { theme } });
      assert.deepEqual([user.render(100), reply.render(100)], snapshots[cycle], "duplicate starts are harmless");
    } finally { events.get("session_shutdown")!(); }
    assert.deepEqual(user.render(100), nativeUser);
    assert.deepEqual(reply.render(100), nativeReply);
  }
  assert.deepEqual(snapshots[0], snapshots[1]);
});
