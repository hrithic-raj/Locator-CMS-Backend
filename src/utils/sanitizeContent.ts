import sanitizeHtml from "sanitize-html";

/**
 * Whitelist matches exactly what TipTap's standard toolbar produces:
 * headings, paragraphs, marks (bold/italic/underline), lists, tables,
 * blockquotes, links, and images. Anything else (script tags, inline
 * event handlers, style attributes, iframes) is stripped.
 */
export function sanitizeArticleContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "blockquote",
      "br",
      "hr",
      "figure",
      "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Force safe rel on any target=_blank link an editor pastes in.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}
