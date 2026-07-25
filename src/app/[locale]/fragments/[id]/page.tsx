import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { setRequestLocale } from "next-intl/server";
import { getFragment } from "@/lib/api/fragments";
import { siteConfig } from "@/config/site";
import { PageShell } from "@/components/ui/surface";
import { FragmentDetail } from "@/components/memory/FragmentDetail";

export const revalidate = 3600;

const getFragmentForRequest = cache((id: string) => getFragment(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const fragment = await getFragmentForRequest(id);
  if (!fragment) return { title: "未找到碎片" };

  const description = fragment.text?.replace(/\s+/g, " ").slice(0, 160) || "一条来自万物流转的碎片记录。";
  const url = `${siteConfig.url}/fragments/${encodeURIComponent(fragment.id)}`;

  return {
    title: "碎片详情",
    description,
    alternates: { canonical: url },
    openGraph: {
      title: "碎片详情",
      description,
      url,
      type: "article",
      publishedTime: fragment.createdAt,
      images: fragment.imageUrl ? [{ url: fragment.imageUrl }] : undefined,
    },
  };
}

export default async function FragmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const fragment = await getFragmentForRequest(id);
  if (!fragment) notFound();

  return (
    <PageShell surfaceClassName="mx-auto max-w-4xl px-5 py-7 sm:px-9 sm:py-10">
      <FragmentDetail fragment={fragment} />
    </PageShell>
  );
}
