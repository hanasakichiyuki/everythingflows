import type { JSONContent } from "@tiptap/core";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { CodeBlockEnhancer } from "./CodeBlockEnhancer";
import {
  BILIBILI_IFRAME_ALLOW,
  BILIBILI_IFRAME_SANDBOX,
  buildBilibiliPlayerUrl,
  clampBilibiliPage,
} from "@/lib/editor/bilibili";
import { normalizeCalloutKind } from "@/lib/editor/callout";
import { isSafeCodeLanguage } from "@/lib/editor/code-block";
import { highlightCodeToReact } from "@/lib/editor/highlight";
import type { TiptapDocument } from "@/lib/editor/types";
import { getPostImageSource, isManagedPostImageUrl } from "@/lib/post-image-proxy";

/**
 * 服务端正文渲染器：把已通过 `validateTiptapDocument` 白名单校验的结构化内容
 * 直接映射成 React 元素。
 *
 * 刻意不使用 `dangerouslySetInnerHTML`，也不存在"HTML 字符串 → DOM 解析 → 净化"
 * 这条链路，因此服务端不需要浏览器 DOM 模拟器，脚本与事件属性也无从注入。
 * 保持服务端组件（不要加 "use client"），正文必须留在首屏 HTML 里。
 *
 * 全量节点/标记见 `lib/editor/types.ts` 的 ALLOWED_NODE_TYPES / ALLOWED_MARK_TYPES，
 * 此处的映射必须与之一一对应；类名与 DOM 结构与旧版 `generateHTML` 输出保持一致，
 * 否则 `globals.css` 里的 `.prose-blog` / `.tiptap-*` / `.hljs-*` 规则会失效。
 */

/** TipTap Heading 的 levels 配置；level 非法或缺省时退回 h2（与上游一致）。 */
const HEADING_LEVELS = [2, 3, 4] as const;

/**
 * 标记的嵌套顺序，索引越小越靠外层（对齐 ProseMirror 的 schema 顺序）。
 * 只有同时带多个标记的文本才会用到。
 */
const MARK_ORDER = [
  "bold",
  "code",
  "italic",
  "strike",
  "link",
  "underline",
] as const;

const BILIBILI_REFERRER_POLICY = "strict-origin-when-cross-origin";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** 拼接节点内的全部文本（代码块等原子块使用）。 */
function extractText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(extractText).join("");
}

function renderChildren(node: JSONContent, key: string): ReactNode[] {
  return (node.content ?? []).map((child, index) =>
    renderNode(child, `${key}.${index}`)
  );
}

function renderMarks(
  node: JSONContent,
  content: ReactNode,
  key: string
): ReactNode {
  const marks = node.marks ?? [];
  if (marks.length === 0) return content;

  const byType = new Map(marks.map((mark) => [mark.type, mark]));
  let element = content;
  let wrapped = false;

  // 逆序包裹，使 MARK_ORDER 中靠前的标记成为最外层。
  for (let index = MARK_ORDER.length - 1; index >= 0; index -= 1) {
    const type = MARK_ORDER[index];
    if (!byType.has(type)) continue;

    switch (type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "link": {
        // href 已在校验层做协议白名单，这里再兜一层：没有有效 href 就不输出 <a>，
        // 避免产生"看起来是链接但点不动"的伪链接。
        const href = asString(byType.get("link")?.attrs?.href);
        element = href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="tiptap-link"
          >
            {element}
          </a>
        ) : (
          element
        );
        break;
      }
    }

    wrapped = true;
  }

  // 文本节点会作为数组项出现在父节点里，需要把 key 落到最外层包装元素上。
  if (wrapped && isValidElement(element)) {
    return cloneElement(element as ReactElement, { key });
  }

  return element;
}

function renderText(node: JSONContent, key: string): ReactNode {
  return renderMarks(node, node.text ?? "", key);
}

function renderHeading(node: JSONContent, key: string): ReactNode {
  const raw = node.attrs?.level;
  const level = HEADING_LEVELS.includes(raw) ? raw : HEADING_LEVELS[0];
  const Tag = `h${level}` as "h2" | "h3" | "h4";

  return (
    <Tag key={key} className="tiptap-heading">
      {renderChildren(node, key)}
    </Tag>
  );
}

function renderTaskItem(node: JSONContent, key: string): ReactNode {
  const checked = node.attrs?.checked === true;

  return (
    <li
      key={key}
      className="tiptap-task-item"
      // 上游 taskItem 的 checked 属性 renderHTML 返回布尔值，DOMSerializer 会写成
      // "true"/"false" 且始终存在；这里保持一致，避免以后加 [data-checked="true"] 样式时踩坑。
      data-checked={checked ? "true" : "false"}
      data-type="taskItem"
    >
      <label>
        {/* 展示用的只读勾选框：用 defaultChecked 避免受控组件告警 */}
        <input type="checkbox" defaultChecked={checked} />
        <span />
      </label>
      <div>{renderChildren(node, key)}</div>
    </li>
  );
}

function renderCallout(node: JSONContent, key: string): ReactNode {
  const kind = normalizeCalloutKind(node.attrs?.kind);

  return (
    <aside
      key={key}
      className={`tiptap-callout tiptap-callout-${kind}`}
      data-callout-type={kind}
    >
      {renderChildren(node, key)}
    </aside>
  );
}

function renderCodeBlock(node: JSONContent, key: string): ReactNode {
  const rawLanguage = node.attrs?.language;
  const language = isSafeCodeLanguage(rawLanguage) ? rawLanguage : "plaintext";
  const code = extractText(node);

  return (
    <pre key={key} className="tiptap-code-block">
      <code className={`language-${language} hljs`}>
        {highlightCodeToReact(code, language)}
      </code>
    </pre>
  );
}

function renderImage(node: JSONContent, key: string): ReactNode {
  const src = asString(node.attrs?.src);
  // 只保留本站已托管的 R2 图片，其余一律不渲染（与旧净化的 remove() 等价）。
  if (!src || !isManagedPostImageUrl(src)) return null;

  return (
    // 受管图片统一经同源 R2 代理读取（尺寸不可预知），且渲染结果需与历史 HTML 逐节点
    // 保持一致，因此保留原生 img，交给 Next 图片优化器反而会改变输出结构。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={key}
      className="tiptap-image"
      loading="lazy"
      src={getPostImageSource(src)}
      alt={asString(node.attrs?.alt)}
      title={asString(node.attrs?.title)}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}

function renderBilibili(node: JSONContent, key: string): ReactNode {
  const attrs = {
    bvid: asString(node.attrs?.bvid),
    aid: asString(node.attrs?.aid),
    cid: asString(node.attrs?.cid),
    page: clampBilibiliPage(node.attrs?.page),
    autoplay: node.attrs?.autoplay === true,
  };
  const src = buildBilibiliPlayerUrl(attrs);

  if (!src) {
    return (
      <div
        key={key}
        className="tiptap-bilibili tiptap-bilibili-invalid"
        data-bilibili-embed=""
      >
        无效的 Bilibili 视频
      </div>
    );
  }

  return (
    <div
      key={key}
      className="tiptap-bilibili"
      data-bilibili-embed=""
      data-bvid={attrs.bvid ?? ""}
      data-aid={attrs.aid ?? ""}
      data-cid={attrs.cid ?? ""}
      data-page={String(attrs.page)}
      data-autoplay={String(attrs.autoplay)}
    >
      <iframe
        src={src}
        title="Bilibili video"
        loading="lazy"
        allowFullScreen
        allow={BILIBILI_IFRAME_ALLOW}
        sandbox={BILIBILI_IFRAME_SANDBOX}
        referrerPolicy={BILIBILI_REFERRER_POLICY}
      />
    </div>
  );
}

function renderNode(node: JSONContent, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return <p key={key}>{renderChildren(node, key)}</p>;
    case "heading":
      return renderHeading(node, key);
    case "bulletList":
      return (
        <ul key={key} className="tiptap-bullet-list">
          {renderChildren(node, key)}
        </ul>
      );
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
      return (
        <ol
          key={key}
          className="tiptap-ordered-list"
          start={start === 1 ? undefined : start}
        >
          {renderChildren(node, key)}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{renderChildren(node, key)}</li>;
    case "taskList":
      return (
        <ul
          key={key}
          className="tiptap-task-list"
          data-type="taskList"
        >
          {renderChildren(node, key)}
        </ul>
      );
    case "taskItem":
      return renderTaskItem(node, key);
    case "blockquote":
      return (
        <blockquote key={key} className="tiptap-blockquote">
          {renderChildren(node, key)}
        </blockquote>
      );
    case "codeBlock":
      return renderCodeBlock(node, key);
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "image":
      return renderImage(node, key);
    case "bilibili":
      return renderBilibili(node, key);
    case "callout":
      return renderCallout(node, key);
    case "doc":
      return renderChildren(node, key);
    default:
      // 校验层已挡掉未知节点；这里静默跳过而不是抛错，避免一篇坏内容拖垮整个页面。
      return null;
  }
}

export function TiptapContent({ doc }: { doc: TiptapDocument }) {
  return (
    <>
      <div className="prose-blog" data-rich-content>
        {renderNode(doc, "doc")}
      </div>
      <CodeBlockEnhancer />
    </>
  );
}
