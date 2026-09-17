import type { TiptapDocument } from "@/lib/editor/types";
import { validateTiptapDocument } from "@/lib/editor/types";
import { TiptapContent } from "./TiptapContent";

type Props = {
  contentJson?: TiptapDocument | null;
};

const UNAVAILABLE_CLASS =
  "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600";

/**
 * 服务端组件 —— 把正文渲染进首屏 HTML（爬虫可读，且是真实的 LCP 元素）。
 *
 * 正文只有一种格式：结构化的 TipTap JSON，直接映射成 React 元素，
 * 不经过 HTML 字符串、不经过净化环节。
 *
 * 校验失败（例如库中仍有未迁移的旧行）时输出安全提示而不是抛错，
 * 避免单篇坏数据拖垮整个页面 —— 这也是数据迁移的兜底。
 */
export function PostContent({ contentJson }: Props) {
  const result = validateTiptapDocument(contentJson);
  if (!result.success) {
    // 渲染失败只对外暴露中性文案，但必须在服务端留下原因：否则一篇坏数据在线上
    // 只会显示"暂时无法显示"，日志里查不到任何线索。
    console.error("文章正文校验失败，已降级为占位提示：", result.error);
    return <p className={UNAVAILABLE_CLASS}>文章内容暂时无法显示。</p>;
  }

  return <TiptapContent doc={result.data} />;
}
