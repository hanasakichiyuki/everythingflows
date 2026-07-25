import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { MemoryFragment } from "@/types/memory";
import { Surface } from "@/components/ui/surface";
import { getTranslations } from "next-intl/server";

interface FragmentsProps {
  fragments: MemoryFragment[];
}

function shouldBypassImageOptimizer(src?: string) {
  if (!src) return false;

  try {
    return new URL(src).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export async function Fragments({ fragments }: FragmentsProps) {
  const t = await getTranslations("home");
  const displayFragments = fragments.slice(0, 4);

  return (
    <Surface
      className="anim-fade-up p-6"
      style={{ animationDelay: "0.16s" }}
    >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground/90 dark:text-foreground">
            {t("fragments")}
            <span className="ml-2 text-primary">•</span>
          </h3>
          <Link
            href="/fragments"
            className="text-xs text-muted transition-colors hover:text-primary"
          >
            {t("viewAll")} <span aria-hidden>→</span>
          </Link>
        </div>

        {displayFragments.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
          {displayFragments.map((fragment, index) => (
            <div
              key={fragment.id}
              className={`anim-fade-scale anim-delay-${index + 1} group cursor-pointer transition-transform duration-300 hover:-translate-y-0.5`}
            >
              <Link href={`/fragments`} className="block">
                {fragment.type === "image" ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-800/30 bg-zinc-900/30">
                    <Image
                      src={fragment.imageUrl || ""}
                      alt={fragment.text || "Fragment"}
                      fill
                      sizes="(max-width: 1024px) 50vw, 240px"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized={shouldBypassImageOptimizer(fragment.imageUrl)}
                    />
                    {fragment.text && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                        <p className="text-[10px] font-light leading-relaxed text-zinc-200/90 line-clamp-2">
                          {fragment.text}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-square flex-col justify-between rounded-xl border border-zinc-800/30 bg-zinc-900/30 p-4 transition-all duration-300 group-hover:border-zinc-700/40">
                    <p className="text-[11px] font-light leading-relaxed tracking-wide font-serif text-zinc-200 line-clamp-4">
                      {fragment.text}
                    </p>
                    <span className="text-[9px] tracking-wider text-zinc-500">
                      {new Date(fragment.createdAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </Link>
            </div>
          ))}
          </div>
        ) : (
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm text-muted">{t("fragmentsEmpty")}</p>
          </div>
        )}
    </Surface>
  );
}
