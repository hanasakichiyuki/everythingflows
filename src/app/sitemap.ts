import type { MetadataRoute } from "next";
import { listPosts } from "@/lib/api/posts";
import { listFragments } from "@/lib/api/fragments";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

export const revalidate = 3600;

// localePrefix is "never" → public URLs carry no locale segment.
// With a single locale this is just the base; if more locales are added
// with a prefix strategy, switch buildPath to include the locale segment.
function buildPath(path: string) {
  return `${siteConfig.url}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: buildPath("/"), changeFrequency: "daily", priority: 1 },
    { url: buildPath("/blog"), changeFrequency: "weekly", priority: 0.8 },
    { url: buildPath("/archive"), changeFrequency: "weekly", priority: 0.6 },
    { url: buildPath("/fragments"), changeFrequency: "weekly", priority: 0.5 },
    { url: buildPath("/links"), changeFrequency: "monthly", priority: 0.4 },
    { url: buildPath("/about"), changeFrequency: "monthly", priority: 0.4 },
  ];

  const postRoutes: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    try {
      const posts = await listPosts(locale);
      for (const p of posts) {
        postRoutes.push({
          url: buildPath(`/blog/${p.slug}`),
          lastModified: p.updated ?? p.date,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    } catch {
      // skip a locale that fails to load rather than failing the whole sitemap
    }
  }

  let fragmentRoutes: MetadataRoute.Sitemap = [];
  try {
    const fragments = await listFragments();
    fragmentRoutes = fragments.map((fragment) => ({
      url: buildPath(`/fragments/${fragment.id}`),
      lastModified: fragment.createdAt,
      changeFrequency: "monthly",
      priority: 0.5,
    }));
  } catch {
    // Keep the sitemap available even if fragments fail to load.
  }

  return [...staticRoutes, ...postRoutes, ...fragmentRoutes];
}
