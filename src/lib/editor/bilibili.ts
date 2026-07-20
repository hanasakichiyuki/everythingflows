import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";

export type BilibiliAttributes = {
  bvid?: string;
  aid?: string;
  cid?: string;
  page: number;
  autoplay: boolean;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bilibili: {
      insertBilibili: (
        attributes: Partial<BilibiliAttributes>
      ) => ReturnType;
    };
  }
}

function clampPage(value: unknown): number {
  const page = Number(value);
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.min(1000, Math.floor(page)));
}

export function buildBilibiliPlayerUrl(
  attributes: Partial<BilibiliAttributes>
): string | null {
  const page = clampPage(attributes.page);
  const autoplay = attributes.autoplay ? "1" : "0";

  if (
    typeof attributes.bvid === "string" &&
    /^BV[0-9A-Za-z]{10}$/.test(attributes.bvid)
  ) {
    const params = new URLSearchParams({
      bvid: attributes.bvid,
      page: String(page),
      high_quality: "1",
      autoplay,
    });
    return `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  if (
    typeof attributes.aid === "string" &&
    /^\d+$/.test(attributes.aid)
  ) {
    const params = new URLSearchParams({
      aid: attributes.aid,
      page: String(page),
      autoplay,
    });
    if (attributes.cid && /^\d+$/.test(attributes.cid)) {
      params.set("cid", attributes.cid);
    }
    return `https://player.bilibili.com/player.html?${params.toString()}`;
  }

  return null;
}

export function parseBilibiliInput(input: string): BilibiliAttributes | null {
  const value = input.trim();
  const bareBvid = value.match(/^(BV[0-9A-Za-z]{10})$/);
  if (bareBvid) {
    return { bvid: bareBvid[1], page: 1, autoplay: false };
  }

  const bareAid = value.match(/^(?:av)?(\d+)$/i);
  if (bareAid) {
    return { aid: bareAid[1], page: 1, autoplay: false };
  }

  try {
    const url = new URL(value);
    if (!/(^|\.)bilibili\.com$/i.test(url.hostname)) return null;

    const pathBvid = url.pathname.match(/\/video\/(BV[0-9A-Za-z]{10})/i);
    const queryBvid = url.searchParams.get("bvid");
    const queryAid = url.searchParams.get("aid");
    const pathAid = url.pathname.match(/\/video\/av(\d+)/i);
    const page = clampPage(url.searchParams.get("p") ?? url.searchParams.get("page"));

    if (pathBvid?.[1] || (queryBvid && /^BV[0-9A-Za-z]{10}$/i.test(queryBvid))) {
      const bvid = pathBvid?.[1] ?? queryBvid!;
      return {
        bvid: `BV${bvid.slice(2)}`,
        page,
        autoplay: false,
      };
    }

    const aid = queryAid ?? pathAid?.[1];
    if (aid && /^\d+$/.test(aid)) {
      return {
        aid,
        cid: url.searchParams.get("cid") ?? undefined,
        page,
        autoplay: false,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export const BilibiliNode = Node.create({
  name: "bilibili",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      bvid: { default: null },
      aid: { default: null },
      cid: { default: null },
      page: { default: 1 },
      autoplay: { default: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-bilibili-embed]",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            bvid: element.getAttribute("data-bvid") || null,
            aid: element.getAttribute("data-aid") || null,
            cid: element.getAttribute("data-cid") || null,
            page: clampPage(element.getAttribute("data-page")),
            autoplay: element.getAttribute("data-autoplay") === "true",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attributes: BilibiliAttributes = {
      bvid:
        typeof HTMLAttributes.bvid === "string"
          ? HTMLAttributes.bvid
          : undefined,
      aid:
        typeof HTMLAttributes.aid === "string" ? HTMLAttributes.aid : undefined,
      cid:
        typeof HTMLAttributes.cid === "string" ? HTMLAttributes.cid : undefined,
      page: clampPage(HTMLAttributes.page),
      autoplay: Boolean(HTMLAttributes.autoplay),
    };
    const src = buildBilibiliPlayerUrl(attributes);
    if (!src) {
      return [
        "div",
        {
          "data-bilibili-embed": "",
          class: "tiptap-bilibili tiptap-bilibili-invalid",
        },
        "无效的 Bilibili 视频",
      ];
    }

    return [
      "div",
      mergeAttributes({
        "data-bilibili-embed": "",
        "data-bvid": attributes.bvid ?? "",
        "data-aid": attributes.aid ?? "",
        "data-cid": attributes.cid ?? "",
        "data-page": String(attributes.page),
        "data-autoplay": String(attributes.autoplay),
        class: "tiptap-bilibili",
      }),
      [
        "iframe",
        {
          src,
          title: "Bilibili video",
          loading: "lazy",
          allowfullscreen: "true",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          sandbox:
            "allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox",
        },
      ],
    ];
  },

  addCommands() {
    return {
      insertBilibili:
        (attributes: Partial<BilibiliAttributes>) =>
        ({ commands }: CommandProps) => {
          if (!buildBilibiliPlayerUrl(attributes)) return false;
          return commands.insertContent({
            type: this.name,
            attrs: {
              bvid: attributes.bvid ?? null,
              aid: attributes.aid ?? null,
              cid: attributes.cid ?? null,
              page: clampPage(attributes.page),
              autoplay: Boolean(attributes.autoplay),
            },
          });
        },
    };
  },
});
