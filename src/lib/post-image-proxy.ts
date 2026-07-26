import { isR2PostImageUrl } from "@/lib/api/media";
import { getPostImageProxyUrl } from "@/lib/post-image-url";

/**
 * Only proxy public images uploaded by this site. Keeping this allowlist here
 * prevents the image endpoint from becoming an arbitrary remote-fetch proxy.
 */
export function isManagedPostImageUrl(value: string): boolean {
  return isR2PostImageUrl(value);
}

/**
 * Use a same-origin fetch only for this site's R2 images. This
 * avoids the Next image optimizer and client proxy/DNS interference while
 * external images continue to load directly from their original source.
 */
export function getPostImageSource(value: string): string {
  if (!isManagedPostImageUrl(value)) return value;
  return getPostImageProxyUrl(value);
}
