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
    Image.configure({
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
