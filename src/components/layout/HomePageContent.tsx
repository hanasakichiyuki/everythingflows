import { LatestPosts } from "./LatestPosts";
import { Fragments } from "./Fragments";
import { HomeDate } from "./HomeDate";
import type { PostMeta } from "@/types";
import type { MemoryFragment } from "@/types/memory";
import { Surface } from "@/components/ui/surface";

interface HomePageContentProps {
  posts: PostMeta[];
  fragments: MemoryFragment[];
}

const text = `或许鸟儿
会借这拓展的空间,飞得愈发炽烈。
春天曾需要你。常有一颗星辰
静静等候,只为让你留意。`;

/* const chars = (() => {
  let delay = 0;
  return text.split("").map((char) => {
    const currentDelay = delay;

    if (char === "，") {
      delay += 0.22;
    } else if (char === "。") {
      delay += 0.45;
    } else if (char === "\n") {
      delay += 0.7;
    } else {
      delay += 0.06;
    }

    return {
      char,
      delay: currentDelay,
    };
  });
})(); */

export function HomePageContent({ posts, fragments }: HomePageContentProps) {
  return (
    <div className="space-y-6">
      <Surface
        className="px-8 py-10 sm:px-14"
        contentClassName="flex flex-col gap-8 md:flex-row md:items-start md:justify-between"
      >
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="mb-3 text-5xl font-bold tracking-tight">
                Everything
                <br />
                <span className="text-cyan-500">flows.</span>
              </h1>
            </div>

            <p
              className="
    max-w-[320px]
    text-[15px]
    leading-[2.2]
    tracking-[0.04em]
    text-neutral-700/70
    dark:text-neutral-300/65
    font-light
    whitespace-pre-line
  "
              style={{
                fontFamily: '"LXGW WenKai Screen", serif',
                textShadow: "0 0 20px rgba(255,255,255,0.05)",
              }}
            >
              {text}
            </p>
          </div>

          <HomeDate />
      </Surface>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <LatestPosts posts={posts} />
        <Fragments fragments={fragments} />
      </div>
    </div>
  );
}
