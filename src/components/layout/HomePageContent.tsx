import { ArrowRight, Bot, PenLine, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LatestPosts } from "./LatestPosts";
import { Fragments } from "./Fragments";
import { HomeDate } from "./HomeDate";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";
import { Surface } from "@/components/ui/surface";
import { Link } from "@/i18n/navigation";

interface HomePageContentProps {
  posts: PostMeta[];
  fragments: MemoryFragment[];
  postsUnavailable: boolean;
  fragmentsUnavailable: boolean;
}

function formatPostDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function FlowIllustration() {
  return (
    <div className="pointer-events-none relative mx-auto h-56 w-full max-w-sm lg:h-72" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-soft blur-2xl" />
      <svg viewBox="0 0 360 300" className="relative h-full w-full overflow-visible">
        <path d="M28 220C100 112 171 270 332 70" fill="none" stroke="var(--primary)" strokeOpacity="0.48" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 257C110 150 202 294 338 141" fill="none" stroke="var(--primary)" strokeOpacity="0.26" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M63 85C136 10 210 132 297 40" fill="none" stroke="var(--primary)" strokeOpacity="0.22" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 8" />
        <circle cx="74" cy="170" r="30" fill="var(--primary)" fillOpacity="0.07" stroke="var(--primary)" strokeOpacity="0.28" />
        <circle cx="251" cy="124" r="50" fill="var(--primary)" fillOpacity="0.04" stroke="var(--primary)" strokeOpacity="0.2" />
        <circle cx="157" cy="191" r="8" fill="var(--accent)" fillOpacity="0.72" />
        <circle cx="289" cy="78" r="5" fill="var(--accent)" fillOpacity="0.62" />
        <circle cx="206" cy="231" r="4" fill="var(--primary)" fillOpacity="0.72" />
        <path d="M150 70l6 14 14 6-14 6-6 14-6-14-14-6 14-6 6-14Z" fill="var(--accent)" fillOpacity="0.24" stroke="var(--accent)" strokeOpacity="0.55" />
      </svg>
    </div>
  );
}

export async function HomePageContent({
  posts,
  fragments,
  postsUnavailable,
  fragmentsUnavailable,
}: HomePageContentProps) {
  const t = await getTranslations("home");
  const featuredPost = posts[0];
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size;
  const stats = [
    { value: postsUnavailable ? "—" : posts.length, label: t("stats.posts") },
    { value: fragmentsUnavailable ? "—" : fragments.length, label: t("stats.fragments") },
    { value: postsUnavailable ? "—" : tagCount, label: t("stats.tags") },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-6">
        <Surface
          className="anim-fade-up min-h-[360px] px-6 py-8 sm:px-9 sm:py-10"
          contentClassName="grid h-full gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(17rem,0.88fr)] lg:items-center"
          tone="solid"
          overlay={false}
        >
          <div className="relative z-10">
            <h1 className="max-w-2xl font-serif text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[3.35rem]">
              {t("hero.title")}
              <br />
              <span className="text-accent">{t("hero.titleAccent")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted sm:text-[15px]">
              {t("hero.line1")}
              <br />
              {t("hero.line2")}
              <br />
              {t("hero.line3")}
              <br />
              {t("hero.line4")}
            </p>
          </div>
          <FlowIllustration />
        </Surface>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Surface className="anim-fade-up p-5 sm:p-6" tone="solid" overlay={false}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{t("featured.label")}</span>
                <Sparkles className="h-5 w-5 text-accent/70" />
              </div>
              {featuredPost ? (
                <Link href={`/blog/${encodeURIComponent(featuredPost.slug)}`} className="group mt-5 flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <h2 className="font-serif text-2xl font-semibold leading-tight text-foreground">
                    {featuredPost.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{featuredPost.description}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-7 text-xs text-muted">
                    <time dateTime={featuredPost.date}>{formatPostDate(featuredPost.date)}</time>
                    <span aria-hidden>·</span>
                    <span>{featuredPost.readingTime}</span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("featured.continueReading")} <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ) : (
                <p className="mt-8 text-sm leading-6 text-muted">
                  {postsUnavailable ? t("featured.unavailable") : t("featured.empty")}
                </p>
              )}
            </div>
          </Surface>
          <Fragments fragments={fragments} unavailable={fragmentsUnavailable} />
        </div>

        <LatestPosts posts={posts} unavailable={postsUnavailable} />
      </div>

      <aside className="grid gap-4 xl:sticky xl:top-28" aria-label={t("asideLabel")}>
        <HomeDate />

        <Surface className="anim-fade-up p-5" overlay={false} tone="solid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bot className="h-4 w-4 text-primary" />
              {t("ai.title")}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {t("ai.description")}
          </p>
          <Link href="/chat" className="group mt-5 flex min-h-11 items-center justify-between rounded-xl border border-primary/15 bg-primary-soft/55 px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t("ai.start")}
            <ArrowRight className="fine-pointer-group-hover h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Surface>

        <Surface className="anim-fade-up p-5" tone="solid" overlay={false}>
          <p className="text-sm font-semibold">{t("stats.title")}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.map(({ value, label }) => (
              <div key={label} className="home-stat text-center">
                <div className="font-serif text-2xl font-semibold text-primary">{value}</div>
                <div className="mt-1 text-[11px] text-muted">{label}</div>
              </div>
            ))}
          </div>
          {(postsUnavailable || fragmentsUnavailable) && (
            <p className="mt-4 text-center text-xs text-muted">{t("stats.unavailable")}</p>
          )}
        </Surface>
      </aside>
    </div>
  );
}
