import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { AssistantMessageComponent, UserMessageComponent, initTheme } from "@earendil-works/pi-coding-agent";
import { theme } from "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import chatBubbles from "../chat-bubbles.ts";
import { stripTerminalSequences } from "@earendil-works/pi-tui";

import { tmpdir } from "node:os";
import { join } from "node:path";

const agentDir = mkdtempSync(join(tmpdir(), "bubble-lifecycle-"));
const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
before(() => { process.env.PI_CODING_AGENT_DIR = agentDir; });
after(() => {
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  rmSync(agentDir, { recursive: true, force: true });
});

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

test("startup warns on bad fields and reload reads changed config without retaining colors", () => {
  const user = new UserMessageComponent("Long user fixture ".repeat(40));
  const reply = new AssistantMessageComponent({ role: "assistant", content: [{ type: "text", text: "Long reply fixture ".repeat(40) }], stopReason: "stop" } as any, true);
  const native = [user.render(100), reply.render(100)];
  const path = join(agentDir, "chat-bubbles.json");
  const snapshots: string[][][] = [];
  for (const maxWidth of ["40%", "70%"]) {
    writeFileSync(path, JSON.stringify({ user: { maxWidth, background: maxWidth === "40%" ? "#102030" : "theme", text: "invalid" }, assistant: { maxWidth } }));
    const events = new Map<string, Function>();
    const warnings: string[] = [];
    chatBubbles({ on: (name: string, callback: Function) => events.set(name, callback) } as any);
    try {
      events.get("session_start")!({}, { mode: "tui", ui: { theme, notify: (text: string, level: string) => { assert.equal(level, "warning"); warnings.push(text); } } });
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /user.text/);
      snapshots.push([user.render(100), reply.render(100)]);
    } finally { events.get("session_shutdown")!(); }
    assert.deepEqual([user.render(100), reply.render(100)], native);
  }
  assert.notDeepEqual(snapshots[0], snapshots[1]);
});

test("reload moves retained user and assistant messages to either configured edge", () => {
  const user = new UserMessageComponent("User fixture");
  const reply = new AssistantMessageComponent({ role: "assistant", content: [{ type: "text", text: "Reply fixture" }], stopReason: "stop" } as any, true);
  const native = [user.render(100), reply.render(100)];
  const snapshots: string[][][] = [];
  for (const alignment of ["left", "right", "left", "right"]) {
    writeFileSync(join(agentDir, "chat-bubbles.json"), JSON.stringify({ user: { alignment }, assistant: { alignment } }));
    const events = new Map<string, Function>();
    chatBubbles({ on: (name: string, callback: Function) => events.set(name, callback) } as any);
    try {
      events.get("session_start")!({}, { mode: "tui", ui: { theme, notify: () => assert.fail("valid alignment must not warn") } });
      const rendered = [user.render(100), reply.render(100)];
      for (const [index, text] of ["User fixture", "Reply fixture"].entries()) {
        const row = rendered[index].map(stripTerminalSequences).find(line => line.includes(text))!;
        assert.ok(alignment === "left" ? row.indexOf(text) < 10 : row.indexOf(text) > 50);
      }
      snapshots.push(rendered);
    } finally { events.get("session_shutdown")!(); }
    assert.deepEqual([user.render(100), reply.render(100)], native);
  }
  assert.deepEqual(snapshots[0], snapshots[2]);
  assert.deepEqual(snapshots[1], snapshots[3]);
});
