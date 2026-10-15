import { UserMessageComponent, type Theme } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences, truncateToWidth, visibleWidth, type TuiMouseEvent } from "@earendil-works/pi-tui";

/** Padded right-aligned user bubbles; native replies stay on the left. */
export function installConversationLayout(getTheme: () => Theme): () => void {
  const proto = UserMessageComponent.prototype;
  const nativeRender = proto.render;
  const nativeMouse = proto.handleMouse;
  const hadOwnMouse = Object.hasOwn(proto, "handleMouse");
  const layout = new WeakMap<UserMessageComponent, { inset: number; width: number; side: number }>();
  function render(this: UserMessageComponent, width: number) {
    if (width <= 0) return [];
    const pad = (this as any).outputPad ?? 1;
    const available = Math.max(1, width - pad);
    const maximum = Math.max(1, Math.min(available, Math.floor(width * 0.9)));
    const side = width >= 50 ? 1 : 0;
    const contentMaximum = Math.max(1, maximum - side * 2);
    const preview = nativeRender.call(this, contentMaximum);
    const measured = Math.max(1, ...preview.map(line => visibleWidth(stripTerminalSequences(line).trimEnd())));
    const inner = Math.min(contentMaximum, Math.max(4, measured + pad));
    const native = nativeRender.call(this, inner);
    if (!native.length) return [];
    const startMarkers = native[0].match(/\x1b\]133;[ABC]\x07/g)?.join("") ?? "";
    const endMarkers = native.at(-1)!.match(/\x1b\]133;[ABC]\x07/g)?.join("") ?? "";
    // Paint equal top/bottom padding explicitly: native blank rows are not
    // guaranteed to carry a background. Keep Markdown body styling intact.
    const theme = getTheme();
    const bubbleWidth = inner + side * 2;
    const fill = (text: string) => theme.bg("userMessageBg", text);
    const padding = fill(" ".repeat(bubbleWidth));
    const body = [padding, ...native.slice(1, -1).map(line => {
      const bounded = visibleWidth(line) > inner ? truncateToWidth(line, inner) : line;
      return fill(" ".repeat(side)) + bounded + fill(" ".repeat(side));
    }), padding];
    const inset = Math.max(0, width - pad - bubbleWidth);
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
