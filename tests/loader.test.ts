import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { loadExtensions } from "../node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js";

test("package loads only chat bubbles, with no tool renderers, tools, or commands", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const manifest = JSON.parse(readFileSync(root + "package.json", "utf8"));
  assert.equal(manifest.name, "pi-chat-bubbles");
  assert.deepEqual(manifest.pi, { extensions: ["./chat-bubbles.ts"] });
  const loaded = await loadExtensions(manifest.pi.extensions.map((entry: string) => root + entry), root);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.extensions.length, 1);
  const extension = loaded.extensions[0];
  assert.equal(extension.tools.size, 0);
  assert.equal(extension.toolRenderers?.length ?? 0, 0);
  assert.equal(extension.commands.size, 0);
});
