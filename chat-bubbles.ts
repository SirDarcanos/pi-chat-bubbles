import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installConversationLayout } from "./conversation.ts";
import { installReplyBubbles } from "./reply-bubbles.ts";
import { loadConfig } from "./config.ts";

/** Standalone conversation styling. No tool renderers, editor, or theme changes. */
export default function chatBubbles(pi: ExtensionAPI) {
  let restore: (() => void) | undefined;
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui" || restore) return;
    const { config, warnings } = loadConfig();
    if (warnings.length) ctx.ui.notify(`Chat bubbles: ${warnings.join("\n")}`, "warning");
    const users = installConversationLayout(() => ctx.ui.theme, config.user);
    const replies = installReplyBubbles(() => ctx.ui.theme, config.assistant);
    restore = () => { replies(); users(); };
  });
  pi.on("session_shutdown", () => { restore?.(); restore = undefined; });
}
