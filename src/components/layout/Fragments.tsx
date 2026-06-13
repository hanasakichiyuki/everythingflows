import { Link } from "@/i18n/routing";
import type { MemoryFragment } from "@/types/memory";

interface FragmentsProps {
  fragments: MemoryFragment[];
}

export function Fragments({ fragments }: FragmentsProps) {
  const displayFragments = fragments.slice(0, 4);

  return (
    <div
      className="anim-fade-up relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-6 shadow-lg dark:border-white/10 dark:bg-gray-900/50"
      style={{ animationDelay: "0.16s" }}
    >
      <div className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-gray-900/30 pointer-events-none" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground/90 dark:text-foreground">
            Fragments
            <span className="ml-2 text-pink-500">•</span>
          </h3>
          <Link
            href="/fragments"
            className="text-xs text-muted transition-colors hover:text-pink-500"
          >
            查看全部 →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {displayFragments.map((fragment, index) => (
            <div
              key={fragment.id}
              className={`anim-fade-scale anim-delay-${index + 1} group cursor-pointer transition-transform duration-300 hover:-translate-y-0.5`}
            >
              <Link href={`/fragments`} className="block">
                {fragment.type === "image" ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-800/30 bg-zinc-900/30">
                    <img
                      src={fragment.imageUrl || ""}
                      alt={fragment.text || "Fragment"}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
      </div>
    </div>
  );
}
