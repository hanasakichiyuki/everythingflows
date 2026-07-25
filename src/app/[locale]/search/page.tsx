import { setRequestLocale } from "next-intl/server";
import { getSearchIndex } from "@/lib/api/posts";
import { SearchBox } from "@/components/search/SearchBox";
import { PageCanvas } from "@/components/ui/surface";

export const revalidate = 3600;

export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const items = await getSearchIndex(locale);

  return (
    <PageCanvas>
      <SearchBox items={items} />
    </PageCanvas>
  );
}
