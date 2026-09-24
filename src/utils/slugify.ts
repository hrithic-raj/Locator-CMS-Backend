/**
 * Converts a string into a URL-safe slug: lowercase, hyphen-separated,
 * diacritics stripped. Used wherever content needs a slug (categories,
 * tags, articles, releases, events...).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
