import type { BlogBlock } from "../models/Article.js";

const WORDS_PER_MINUTE = 200;

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
}

function collectText(blocks: BlogBlock[], parts: string[]) {
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
      case "p":
      case "quote":
        parts.push(stripHtml(block.html));
        break;
      case "ul":
      case "ol":
        parts.push(...block.items.map(stripHtml));
        break;
      case "table":
        for (const row of block.rows) parts.push(...row.cells.map(stripHtml));
        break;
      case "group":
        collectText(block.blocks, parts);
        break;
      case "split":
        collectText(block.blocks, parts);
        break;
      case "image":
        parts.push(block.image.alt);
        break;
    }
  }
}

export function estimateReadTimeMinutes(blocks: BlogBlock[]): number {
  const parts: string[] = [];
  collectText(blocks, parts);
  const words = parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
