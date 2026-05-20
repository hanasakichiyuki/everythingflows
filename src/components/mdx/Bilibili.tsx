"use client";

interface BilibiliProps {
  bvid?: string;
  aid?: string;
  cid?: string;
  page?: number;
  autoplay?: boolean;
}

/**
 * Embed Bilibili video in MDX:
 * <Bilibili bvid="BV1xx411c7mD" />
 */
export function Bilibili({ bvid, aid, cid, page = 1, autoplay = false }: BilibiliProps) {
  let src = "";
  if (bvid) {
    src = `https://player.bilibili.com/player.html?bvid=${bvid}&page=${page}&high_quality=1&autoplay=${autoplay ? 1 : 0}`;
  } else if (aid) {
    src = `https://player.bilibili.com/player.html?aid=${aid}${cid ? `&cid=${cid}` : ""}&page=${page}&autoplay=${autoplay ? 1 : 0}`;
  }

  if (!src) return null;

  return (
    <div className="my-6 aspect-video w-full overflow-hidden rounded-xl border border-border">
      <iframe
        src={src}
        title="Bilibili video"
        className="h-full w-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
