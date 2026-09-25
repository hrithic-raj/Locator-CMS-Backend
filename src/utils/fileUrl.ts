/**
 * We store only the relative path (e.g. "/uploads/images/xxx.webp") in
 * the DB, and compute the absolute URL on read. That keeps records
 * portable across dev/staging/prod — no need to rewrite URLs when the
 * domain changes, and it's the one place to touch if we ever move
 * storage to S3/Cloudinary later.
 */
export function toAbsoluteFileUrl(relativePath: string): string {
  const base =
    process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

  return `${base.replace(/\/$/, "")}${relativePath}`;
}
