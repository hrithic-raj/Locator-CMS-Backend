import sanitizeHtml from "sanitize-html";
import type { BlogBlock } from "../models/Article.js";

const INLINE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["a", "b", "strong", "i", "em", "br", "sup", "sub"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

function sanitizeInline(html: string): string {
  return sanitizeHtml(html, INLINE_OPTIONS);
}

export function sanitizeBlogBlocks(blocks: BlogBlock[]): BlogBlock[] {
  return blocks.map((block): BlogBlock => {
    switch (block.type) {
      case "heading":
      case "p":
      case "quote":
        return { ...block, html: sanitizeInline(block.html) };
      case "ul":
      case "ol":
        return { ...block, items: block.items.map(sanitizeInline) };
      case "image":
        return { ...block, image: { ...block.image, alt: block.image.alt.trim() } };
      case "table":
        return { ...block, rows: block.rows.map((row) => ({ ...row, cells: row.cells.map(sanitizeInline) })) };
      case "group":
        return { ...block, blocks: sanitizeBlogBlocks(block.blocks) };
      case "split":
        return { ...block, blocks: sanitizeBlogBlocks(block.blocks), image: { ...block.image, alt: block.image.alt.trim() } };
    }
  });
}
