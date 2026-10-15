import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

export type BubbleColor = "theme" | `#${string}`;
export interface BubbleOptions {
  maxWidth: `${number}%`;
  background: BubbleColor;
  text: BubbleColor;
}
export interface AssistantOptions extends BubbleOptions {
  heading: BubbleColor;
  link: BubbleColor;
  inlineCode: BubbleColor;
}
export interface BubbleConfig {
  user: BubbleOptions;
  assistant: AssistantOptions;
}

export function defaultConfig(): BubbleConfig {
  return {
    user: { maxWidth: "90%", background: "theme", text: "theme" },
    assistant: { maxWidth: "90%", background: "theme", text: "theme", heading: "theme", link: "theme", inlineCode: "theme" },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate each setting independently; a typo must not hide messages. */
export function parseConfig(value: unknown): { config: BubbleConfig; warnings: string[] } {
  const config = defaultConfig();
  const warnings: string[] = [];
  if (!isObject(value)) return { config, warnings: ["Expected a JSON object; using defaults."] };
  for (const key of Object.keys(value)) {
    if (key !== "user" && key !== "assistant") warnings.push("Unknown top-level option; ignored.");
  }
  for (const role of ["user", "assistant"] as const) {
    const input = value[role];
    if (input === undefined) continue;
    if (!isObject(input)) {
      warnings.push(`${role}: expected an object; using defaults.`);
      continue;
    }
    const options = config[role];
    for (const key of Object.keys(input)) {
      if (!Object.hasOwn(options, key)) warnings.push(`${role}: unknown option; ignored.`);
    }
    for (const key of Object.keys(options) as Array<keyof typeof options>) {
      const setting = input[key];
      if (setting === undefined) continue;
      if (key === "maxWidth") {
        if (typeof setting === "string" && /^(?:\d+(?:\.\d+)?)%$/.test(setting)
          && Number.parseFloat(setting) > 0 && Number.parseFloat(setting) <= 100) {
          options.maxWidth = setting as BubbleOptions["maxWidth"];
        } else warnings.push(`${role}.maxWidth: expected a percentage greater than 0 and up to 100%; using 90%.`);
      } else if (setting === "theme" || (typeof setting === "string" && /^#[0-9a-fA-F]{6}$/.test(setting))) {
        options[key] = setting as BubbleColor;
      } else warnings.push(`${role}.${key}: expected "theme" or "#RRGGBB"; using theme.`);
    }
  }
  return { config, warnings };
}

export function loadConfig(path = join(getAgentDir(), "chat-bubbles.json")): ReturnType<typeof parseConfig> {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { config: defaultConfig(), warnings: [] };
    return { config: defaultConfig(), warnings: ["Cannot read chat-bubbles.json; using defaults."] };
  }
  try {
    return parseConfig(JSON.parse(source));
  } catch {
    return { config: defaultConfig(), warnings: ["Invalid JSON in chat-bubbles.json; using defaults."] };
  }
}

/** A percentage caps the whole bubble, including its painted padding. */
export function maximumWidth(width: number, available: number, percentage: BubbleOptions["maxWidth"]): number {
  return Math.max(1, Math.min(available, Math.floor(width * Number.parseFloat(percentage) / 100)));
}
