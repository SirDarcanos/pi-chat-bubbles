import type { Theme } from "@earendil-works/pi-coding-agent";
import { backgroundAnsi, foregroundAnsi, rgbColor, type Color, type DefaultTextStyle, type Markdown, type MarkdownTheme } from "@earendil-works/pi-tui";
import type { AssistantOptions, BubbleColor, BubbleOptions } from "./config.ts";

export function resolveColor(value: BubbleColor, fallback: Color): Color {
  if (value === "theme") return fallback;
  return rgbColor(Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16));
}

export function colorText(value: BubbleColor, theme: Theme): (text: string) => string {
  const ansi = foregroundAnsi(resolveColor(value, theme.colors.text), theme.getColorMode());
  return text => ansi + text + "\x1b[39m";
}

interface InlineToken {
  type: string;
  tokens?: InlineToken[];
}
interface InlineStyleContext {
  applyText: (text: string) => string;
  stylePrefix: string;
}

/** Pi exposes no per-message style setter. Scope private style changes to the
 * native render call, retaining Markdown identity and restoring even on failure.
 * Never match ANSI colors: distinct Markdown roles may share the same color. */
export function withMarkdownStyle<T>(markdown: Markdown, theme: Theme, options: BubbleOptions | AssistantOptions, render: () => T): T {
  const assistant = "inlineCode" in options ? options : undefined;
  const customSurface = !assistant && (options.text !== "theme" || options.background !== "theme");
  const customAccent = assistant && [assistant.heading, assistant.link, assistant.inlineCode].some(value => value !== "theme");
  if (!customSurface && !customAccent) return render();
  const state = markdown as unknown as {
    theme: MarkdownTheme;
    defaultTextStyle?: DefaultTextStyle;
    defaultStylePrefix?: string;
    renderInlineTokens: (tokens: InlineToken[], context?: InlineStyleContext) => string;
    getDefaultInlineStyleContext: () => InlineStyleContext;
  };
  const originalInlineRender = state.renderInlineTokens;
  const ownInlineRender = Object.hasOwn(state, "renderInlineTokens");
  const originalTheme = state.theme;
  const originalStyle = state.defaultTextStyle;
  const originalPrefix = state.defaultStylePrefix;
  try {
    state.defaultTextStyle = { ...originalStyle };
    // Reply surface/text are painted by the outer bubble. Setting a native
    // prose color would nest it inside links and override their accent color.
    if (!assistant && options.text !== "theme") state.defaultTextStyle.color = colorText(options.text, theme);
    if (!assistant && options.background !== "theme") {
      const ansi = backgroundAnsi(resolveColor(options.background, theme.colors.userMessageBg), theme.getColorMode());
      state.defaultTextStyle.bgColor = text => ansi + text + "\x1b[49m";
    }
    if (assistant) {
      state.theme = { ...originalTheme };
      if (assistant.heading !== "theme") state.theme.heading = colorText(assistant.heading, theme);
      if (assistant.link !== "theme") {
        const linkColor = colorText(assistant.link, theme);
        state.theme.link = state.theme.linkUrl = linkColor;
        const labels = new WeakSet<InlineToken[]>();
        // Native headings color each label text before wrapping it with link().
        // Give only link-label plain text an inner link color; preserve the
        // heading's bold/underline, nested inline-code colors, and token identity.
        state.renderInlineTokens = (tokens, context) => {
          for (const token of tokens) {
            if (token.type === "link" && token.tokens) labels.add(token.tokens);
          }
          if (labels.has(tokens)) {
            const enclosing = context ?? state.getDefaultInlineStyleContext();
            context = { ...enclosing, applyText: text => enclosing.applyText(linkColor(text)) };
          }
          return originalInlineRender.call(markdown, tokens, context);
        };
      }
      if (assistant.inlineCode !== "theme") state.theme.code = colorText(assistant.inlineCode, theme);
    }
    state.defaultStylePrefix = undefined;
    markdown.invalidate();
    return render();
  } finally {
    state.theme = originalTheme;
    state.defaultTextStyle = originalStyle;
    state.defaultStylePrefix = originalPrefix;
    if (ownInlineRender) state.renderInlineTokens = originalInlineRender;
    else Reflect.deleteProperty(state, "renderInlineTokens");
    markdown.invalidate();
  }
}
