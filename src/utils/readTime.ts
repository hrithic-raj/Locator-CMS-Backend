const WORDS_PER_MINUTE = 200;

/**
 * Strips HTML tags and estimates reading time, the way "3 min read"
 * labels on the live site are computed. Always at least 1 minute.
 */
export function estimateReadTimeMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
