import { UserMessageComponent, type Theme } from "@earendil-works/pi-coding-agent";
import { Markdown, backgroundAnsi, stripTerminalSequences, truncateToWidth, visibleWidth, type TuiMouseEvent } from "@earendil-works/pi-tui";
import { bubbleInset, defaultConfig, maximumWidth, type BubbleOptions } from "./config.ts";
import { resolveColor, withMarkdownStyle } from "./bubble-style.ts";

/** Padded user bubbles aligned to their configured transcript edge. */
export function installConversationLayout(getTheme: () => Theme, options: BubbleOptions = defaultConfig().user): () => void {
  const proto = UserMessageComponent.prototype;
  const nativeRender = proto.render;
  const nativeMouse = proto.handleMouse;
  const hadOwnMouse = Object.hasOwn(proto, "handleMouse");
  const layout = new WeakMap<UserMessageComponent, { inset: number; width: number; side: number }>();
  function render(this: UserMessageComponent, width: number) {
    if (width <= 0) return [];
    const pad = (this as any).outputPad ?? 1;
    const available = Math.max(1, width - pad);
    const maximum = maximumWidth(width, available, options.maxWidth);
    const side = width >= 50 && maximum >= 3 ? 1 : 0;
    const contentMaximum = Math.max(1, maximum - side * 2);
    const theme = getTheme();
    const styledRender = (columns: number) => {
      const markdown = this.children.find(child => child instanceof Markdown);
      const renderNative = () => nativeRender.call(this, columns);
      return markdown instanceof Markdown ? withMarkdownStyle(markdown, theme, options, renderNative) : renderNative();
    };
    const preview = styledRender(contentMaximum);
    const measured = Math.max(1, ...preview.map(line => visibleWidth(stripTerminalSequences(line).trimEnd())));
    const inner = Math.min(contentMaximum, Math.max(4, measured + pad));
    const native = styledRender(inner);
    if (!native.length) return [];
    const startMarkers = native[0].match(/\x1b\]133;[ABC]\x07/g)?.join("") ?? "";
    const endMarkers = native.at(-1)!.match(/\x1b\]133;[ABC]\x07/g)?.join("") ?? "";
    // Paint equal top/bottom padding explicitly: native blank rows are not
    // guaranteed to carry a background. Keep Markdown body styling intact.
    const bubbleWidth = inner + side * 2;
    const background = backgroundAnsi(resolveColor(options.background, theme.colors.userMessageBg), theme.getColorMode());
    const fill = (text: string) => options.background === "theme" ? theme.bg("userMessageBg", text) : background + text + "\x1b[49m";
    const padding = fill(" ".repeat(bubbleWidth));
    const body = [padding, ...native.slice(1, -1).map(line => {
      const bounded = visibleWidth(line) > inner ? truncateToWidth(line, inner) : line;
      return fill(" ".repeat(side)) + bounded + fill(" ".repeat(side));
    }), padding];
    const inset = bubbleInset(width, bubbleWidth, pad, options.alignment);
    layout.set(this, { inset, width: inner, side });
    return body.map((line, index) => {
      const bounded = visibleWidth(line) > bubbleWidth ? truncateToWidth(line, bubbleWidth) : line;
      // The fullscreen compositor consumes zone controls only at column zero.
      // Keep them before alignment spaces, never inside the painted row.
      return (index === 0 ? startMarkers : "")
        + (index === body.length - 1 ? endMarkers : "")
        + " ".repeat(inset)
        + bounded;
    });
  }
  function handleMouse(this: UserMessageComponent, event: TuiMouseEvent) {
    const bounds = layout.get(this);
    if (!bounds || event.y < 1 || event.y >= event.height - 1 || event.x < bounds.inset + bounds.side || event.x >= bounds.inset + bounds.side + bounds.width) return undefined;
    // Vertical padding matches native Markdown; only horizontal inset changes.
    return nativeMouse.call(this, { ...event, x: event.x - bounds.inset - bounds.side, width: bounds.width });
  }
  proto.render = render;
  proto.handleMouse = handleMouse;
  return () => {
    if (proto.render === render) proto.render = nativeRender;
    if (proto.handleMouse === handleMouse) {
      if (hadOwnMouse) proto.handleMouse = nativeMouse;
      else delete (proto as any).handleMouse;
    }
  };
}
