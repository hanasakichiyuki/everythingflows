import { afterEach, describe, expect, it } from "vitest";
import { getPostImageSource, isManagedPostImageUrl } from "./post-image-proxy";

const originalR2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
const source = "https://media.example.com/posts/example.webp";

afterEach(() => {
  if (originalR2PublicBaseUrl === undefined) {
    delete process.env.R2_PUBLIC_BASE_URL;
  } else {
    process.env.R2_PUBLIC_BASE_URL = originalR2PublicBaseUrl;
  }
});

describe("post image proxy allowlist", () => {
  it("proxies only the configured R2 posts prefix", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com";

    expect(isManagedPostImageUrl(source)).toBe(true);
    expect(getPostImageSource(source)).toBe(
      `/api/post-image?src=${encodeURIComponent(source)}`
    );
  });

  it("does not proxy a different host or prefix", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://media.example.com";

    expect(
      isManagedPostImageUrl(
        "https://other.example.com/posts/example.webp"
      )
    ).toBe(false);
    expect(
      isManagedPostImageUrl(
        "https://media.example.com/private/example.webp"
      )
    ).toBe(false);
  });
});
