import type { Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { BilibiliNode } from "./bilibili";
import { CalloutNode } from "./callout";
import { CodeBlockNode } from "./code-block";

type EditorExtensionOptions = {
  bilibiliExtension?: Extensions[number];
  calloutExtension?: Extensions[number];
  codeBlockExtension?: Extensions[number];
};

/**
 * 带"原图"信息的图片节点。
 *
 * `originalSrc` 必须在这里声明。ProseMirror 会按节点 schema 过滤属性：未声明的键在
 * `updateAttributes()`、粘贴、以及从 JSON 恢复文档时都会被**静默丢弃**，表现为
 * "写得进去、存不下来"。声明之后它才会出现在 `getJSON()` 里，公开渲染器才能据此
 * 提供"点击查看原图"。
 *
 * 属性名（JSON）与 `data-original-src`（HTML）的映射同时保留：编辑器内部的复制粘贴
 * 是走 HTML 序列化的，缺了 `renderHTML` 一侧，粘一遍就会丢原图。
 */
const PostImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      originalSrc: {
        default: null,
        // `|| null` 把空属性归一成"没有"：粘贴编辑器自己复制的 HTML 时，
        // `getAttribute` 会拿到 ""，空串会让保存校验拒绝整篇文档。
        parseHTML: (element) => element.getAttribute("data-original-src") || null,
        renderHTML: (attributes) =>
          attributes.originalSrc
            ? { "data-original-src": attributes.originalSrc as string }
            : {},
      },
    };
  },
});

export function createEditorExtensions(
  options: EditorExtensionOptions = {}
): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      codeBlock: false,
      heading: {
        levels: [2, 3, 4],
        HTMLAttributes: {
          class: "tiptap-heading",
        },
      },
      bulletList: {
        HTMLAttributes: {
          class: "tiptap-bullet-list",
        },
      },
      orderedList: {
        HTMLAttributes: {
          class: "tiptap-ordered-list",
        },
      },
      blockquote: {
        HTMLAttributes: {
          class: "tiptap-blockquote",
        },
      },
    }),
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
        class: "tiptap-link",
      },
      validate: (href) => /^(https?:\/\/|mailto:|\/|#)/i.test(href),
    }),
    PostImage.configure({
      allowBase64: false,
      inline: false,
      HTMLAttributes: {
        class: "tiptap-image",
        loading: "lazy",
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: "tiptap-task-list",
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "tiptap-task-item",
      },
    }),
    Underline,
    options.codeBlockExtension ?? CodeBlockNode,
    options.bilibiliExtension ?? BilibiliNode,
    options.calloutExtension ?? CalloutNode,
  ];

  return extensions;
}

export const serverEditorExtensions = createEditorExtensions();
