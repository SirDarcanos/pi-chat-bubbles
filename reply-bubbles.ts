import { AssistantMessageComponent, type Theme } from "@earendil-works/pi-coding-agent";
import { Markdown, backgroundAnsi, foregroundAnsi, mixColors, rgbColor, stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { bubbleInset, defaultConfig, maximumWidth, type AssistantOptions } from "./config.ts";
import { resolveColor, withMarkdownStyle } from "./bubble-style.ts";

/** Distinct reply surface, derived from the active palette rather than tool styling. */
export function replyColors(theme: Theme, options: AssistantOptions = defaultConfig().assistant) {
  return {
    background: resolveColor(options.background, mixColors(theme.colors.toolPendingBg, theme.colors.mdLink, 0.12, "srgb")),
    foreground: resolveColor(options.text, mixColors(theme.colors.text, theme.appearance === "light" ? rgbColor(0, 0, 0) : rgbColor(255, 255, 255), 0.6, "srgb")),
  };
}

/** Style only prose, retaining Markdown identity for compact-tools silent mode. */
export function installReplyBubbles(getTheme: () => Theme, options: AssistantOptions = defaultConfig().assistant): () => void {
  const proto = AssistantMessageComponent.prototype;
  const original = proto.render;
  const patched = new WeakSet<Markdown>();
  const restorers: Array<() => void> = [];
  let active = true;

  function prepare(markdown: Markdown, outputPad: number) {
    if (patched.has(markdown)) return;
    patched.add(markdown);
    const native = markdown.render;
    const ownRender = Object.hasOwn(markdown, "render");
    function render(this: Markdown, width: number): string[] {
      if (!active) return native.call(this, width);
      if (width <= 0) return [];
      const margin = Math.min(outputPad, Math.max(0, width - 1));
      const maximum = maximumWidth(width, width - margin, options.maxWidth);
      const side = width >= 50 && maximum >= 3 ? 1 : 0;
      const contentMaximum = Math.max(1, maximum - side * 2);
      const theme = getTheme();
      const styledRender = (columns: number) => withMarkdownStyle(this, theme, options, () => native.call(this, columns));
      const preview = styledRender(contentMaximum);
      if (!preview.length) return [];
      const measured = Math.max(1, ...preview.map(line => visibleWidth(stripTerminalSequences(line).trimEnd())));
      const inner = Math.min(contentMaximum, Math.max(4, measured + outputPad));
      const body = styledRender(inner);
      const colors = replyColors(theme, options);
      const background = backgroundAnsi(colors.background, theme.getColorMode());
      const foreground = foregroundAnsi(colors.foreground, theme.getColorMode());
      const fill = (text: string) => background + foreground
        + text.replace(/\x1b\[(0|39|49)m/g, (reset, code) => {
          if (code === "0") return reset + background + foreground;
          return reset + (code === "39" ? foreground : background);
        }) + "\x1b[39;49m";
      const bubbleWidth = inner + side * 2;
      const inset = bubbleInset(width, bubbleWidth, outputPad, options.alignment);
      const left = " ".repeat(inset);
      const padding = left + fill(" ".repeat(bubbleWidth));
      return [padding, ...body.map(line => {
        const bounded = visibleWidth(line) > inner ? truncateToWidth(line, inner) : line;
        return left + fill(" ".repeat(side) + bounded + " ".repeat(Math.max(0, inner - visibleWidth(bounded)) + side));
      }), padding];
    }
    markdown.render = render;
    const ref = new WeakRef(markdown);
    restorers.push(() => {
      const component = ref.deref();
      if (component?.render !== render) return;
      if (ownRender) component.render = native;
      else delete (component as any).render;
      component.invalidate();
    });
  }

  function render(this: AssistantMessageComponent, width: number) {
    if (active) {
      const content = (this as any).contentContainer;
      if (Array.isArray(content?.children)) {
        for (const child of content.children) {
          // Thinking lives inside MouseRegion; errors are Text. Neither is prose.
          if (child instanceof Markdown) prepare(child, (this as any).outputPad ?? 1);
        }
      }
    }
    return original.call(this, width);
  }
  proto.render = render;
  return () => {
    active = false;
    if (proto.render === render) proto.render = original;
    for (const restore of restorers) restore();
    restorers.length = 0;
  };
}
