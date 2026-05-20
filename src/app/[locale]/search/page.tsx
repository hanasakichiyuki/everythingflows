import { setRequestLocale } from "next-intl/server";
import { getSearchIndex } from "@/lib/api/posts";
import { SearchBox } from "@/components/search/SearchBox";

export const dynamic =
  process.env.DATA_PROVIDER === "supabase" ? "force-dynamic" : undefined;

export default async function SearchPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  setRequestLocale(locale);
  const items = await getSearchIndex(locale);

  return <SearchBox items={items} />;
}
