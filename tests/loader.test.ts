import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { loadExtensions } from "../node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js";

test("npm metadata retains Pi gallery eligibility and public package links", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(manifest.keywords.includes("pi-package"), "Pi gallery discovery requires the pi-package keyword");
  assert.equal(new Set(manifest.keywords).size, manifest.keywords.length);
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.publishConfig.access, "public");
  assert.equal(manifest.publishConfig.registry, "https://registry.npmjs.org/");
  assert.equal(manifest.repository.url, "git+https://github.com/SirDarcanos/pi-chat-bubbles.git");
  assert.equal(manifest.homepage, "https://github.com/SirDarcanos/pi-chat-bubbles#readme");
  for (const helper of ["config.ts", "bubble-style.ts", "conversation.ts", "reply-bubbles.ts"]) assert.ok(manifest.files.includes(helper), `${helper} must ship with the entry point`);
  for (const entry of manifest.pi.extensions) assert.ok(manifest.files.includes(entry.replace(/^\.\//, "")), "declared Pi extensions must ship in the npm package");
});

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
