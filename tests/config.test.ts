import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultConfig, loadConfig, maximumWidth, parseConfig } from "../config.ts";

test("defaults and partial role settings", () => {
  assert.deepEqual(parseConfig({}), { config: defaultConfig(), warnings: [] });
  const { config, warnings } = parseConfig({ user: { maxWidth: "65.5%", background: "#aAbB09" }, assistant: { heading: "#FFFFFF", link: "#abcdef", inlineCode: "#123456" } });
  assert.deepEqual(warnings, []);
  assert.equal(config.user.maxWidth, "65.5%");
  assert.equal(config.user.background, "#aAbB09");
  assert.equal(config.user.text, "theme");
  assert.equal(config.assistant.heading, "#FFFFFF");
  assert.equal(config.assistant.link, "#abcdef");
  assert.equal(config.assistant.inlineCode, "#123456");
});

test("alignment is independent per role, defaults safely, and accepts only left or right", () => {
  const defaults = parseConfig({}).config;
  assert.equal(defaults.user.alignment, "right");
  assert.equal(defaults.assistant.alignment, "left");
  for (const user of ["left", "right"]) for (const assistant of ["left", "right"]) {
    const result = parseConfig({ user: { alignment: user }, assistant: { alignment: assistant } });
    assert.deepEqual(result.warnings, []);
    assert.equal(result.config.user.alignment, user);
    assert.equal(result.config.assistant.alignment, assistant);
  }
  for (const alignment of ["center", "LEFT", "", "theme", "#123456", null, false, 0, {}]) {
    const result = parseConfig({ user: { alignment, maxWidth: "60%" }, assistant: { alignment } });
    assert.equal(result.config.user.alignment, "right");
    assert.equal(result.config.assistant.alignment, "left");
    assert.equal(result.config.user.maxWidth, "60%");
    assert.equal(result.warnings.length, 2);
    assert.match(result.warnings[0], /user.alignment/);
    assert.match(result.warnings[1], /assistant.alignment/);
  }
});

test("only percentages in (0, 100] are accepted", () => {
  for (const maxWidth of [90, 0.9, "90", "90px", "90rem", "90vw", "0%", "-1%", "100.1%", "NaN%", "Infinity%", "1e2%", " 90%", null, {}]) {
    const result = parseConfig({ user: { maxWidth } });
    assert.equal(result.config.user.maxWidth, "90%", String(maxWidth));
    assert.equal(result.warnings.length, 1);
  }
  for (const maxWidth of ["0.1%", "100%", "50.25%"]) {
    assert.equal(parseConfig({ assistant: { maxWidth } }).config.assistant.maxWidth, maxWidth);
  }
  assert.equal(maximumWidth(100, 99, "100%"), 99);
  assert.equal(maximumWidth(100, 99, "0.1%"), 1);
});

test("bad settings warn independently without discarding valid siblings", () => {
  for (const text of ["red", "#fff", "#12345678", "rgb(1,2,3)", 0xff00ff, null, "\x1b[31m"]) {
    const result = parseConfig({ user: { text, background: "#123456" } });
    assert.equal(result.config.user.text, "theme");
    assert.equal(result.config.user.background, "#123456");
    assert.equal(result.warnings.length, 1);
  }
  for (const input of [null, [], false, "text"]) assert.equal(parseConfig(input).warnings.length, 1);
  assert.equal(parseConfig({ user: [] }).warnings.length, 1);
  assert.equal(parseConfig({ assistant: { typo: true } }).warnings.length, 1);
  assert.equal(parseConfig({ typo: true }).warnings.length, 1);
});

test("file loading handles missing, unreadable, malformed and updated config", () => {
  const directory = mkdtempSync(join(tmpdir(), "bubble-config-"));
  const path = join(directory, "chat-bubbles.json");
  try {
    assert.deepEqual(loadConfig(path), { config: defaultConfig(), warnings: [] });
    assert.equal(loadConfig(directory).warnings.length, 1);
    writeFileSync(path, "{bad json");
    assert.equal(loadConfig(path).warnings.length, 1);
    writeFileSync(path, JSON.stringify({ assistant: { maxWidth: "75%" } }));
    assert.equal(loadConfig(path).config.assistant.maxWidth, "75%");
    writeFileSync(path, JSON.stringify({ assistant: { maxWidth: "50%" } }));
    assert.equal(loadConfig(path).config.assistant.maxWidth, "50%");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
