import { setRequestLocale } from "next-intl/server";
import { getSearchIndex } from "@/lib/api/posts";
import { SearchBox } from "@/components/search/SearchBox";
import { ContentCard } from "@/components/layout/ContentCard";

export const dynamic = "auto";

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const items = await getSearchIndex(locale);

  return (
    <ContentCard>
      <SearchBox items={items} />
    </ContentCard>
  );
}
