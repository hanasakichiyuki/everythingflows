/**
 * This route validates the upstream URL again on the server. Keeping URL
 * construction separate makes it safe for Client Components to use.
 */
export function getPostImageProxyUrl(source: string): string {
  return `/api/post-image?src=${encodeURIComponent(source)}`;
}
