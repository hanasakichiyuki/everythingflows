import { FileText, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/utils";
import type { SearchItem } from "./types";

function highlightText(text: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;
  const index = text.toLocaleLowerCase().indexOf(trimmedQuery.toLocaleLowerCase());
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-accent/20 px-0.5 text-inherit">{text.slice(index, index + trimmedQuery.length)}</mark>
      {text.slice(index + trimmedQuery.length)}
    </>
  );
}

export function SearchResultList({
  results,
  query,
  activeIndex,
  onSelect,
}: {
  results: SearchItem[];
  query: string;
  activeIndex?: number;
  onSelect?: () => void;
}) {
  const t = useTranslations("search");

  return (
    <ul className="space-y-2" aria-label={t("resultsLabel")}>
      {results.map((item, index) => (
        <li key={item.slug} id={`search-result-${index}`}>
          <Link
            href={`/blog/${encodeURIComponent(item.slug)}`}
            onClick={onSelect}
            className={`group block rounded-xl border px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeIndex === index
                ? "border-primary/40 bg-primary-soft"
                : "border-transparent hover:border-surface-border hover:bg-primary-soft/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileText className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{highlightText(item.title, query)}</h3>
                  <time className="shrink-0 text-[11px] text-muted" dateTime={item.date}>{formatDate(item.date, "zh-CN")}</time>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{highlightText(item.description, query)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-primary">{t("article")}</span>
                  {item.category && <span>{item.category}</span>}
                  {item.tags.slice(0, 3).map((tag) => <span key={tag} className="inline-flex items-center gap-0.5"><Tag className="h-3 w-3" />{tag}</span>)}
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
