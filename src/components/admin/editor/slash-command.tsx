"use client";

import {
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Lightbulb,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Sparkles,
  Text,
  Video,
} from "lucide-react";
import {
  Command,
  createSuggestionItems,
  renderItems,
  type SuggestionItem,
} from "novel";
import { parseBilibiliInput } from "@/lib/editor/bilibili";

const iconClass = "h-4 w-4";

export const editorSuggestionItems: SuggestionItem[] = createSuggestionItems([
  {
    title: "正文",
    description: "普通段落文本",
    searchTerms: ["text", "paragraph", "正文", "段落"],
    icon: <Text className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "二级标题",
    description: "章节标题",
    searchTerms: ["heading", "h2", "标题"],
    icon: <Heading2 className={iconClass} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run(),
  },
  {
    title: "三级标题",
    description: "小节标题",
    searchTerms: ["heading", "h3", "标题"],
    icon: <Heading3 className={iconClass} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run(),
  },
  {
    title: "无序列表",
    description: "创建项目符号列表",
    searchTerms: ["bullet", "list", "列表"],
    icon: <List className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "有序列表",
    description: "创建编号列表",
    searchTerms: ["ordered", "list", "列表"],
    icon: <ListOrdered className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "任务列表",
    description: "创建可勾选事项",
    searchTerms: ["todo", "task", "任务"],
    icon: <ListTodo className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "引用",
    description: "突出显示引用内容",
    searchTerms: ["quote", "blockquote", "引用"],
    icon: <Quote className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "代码块",
    description: "插入预格式化代码",
    searchTerms: ["code", "代码"],
    icon: <Code2 className={iconClass} />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock({ language: "plaintext" })
        .run(),
  },
  {
    title: "分隔线",
    description: "分隔文章章节",
    searchTerms: ["divider", "rule", "分隔"],
    icon: <Minus className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "提示块",
    description: "插入信息提示块",
    searchTerms: ["callout", "notice", "提示"],
    icon: <Lightbulb className={iconClass} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCallout("info").run(),
  },
  {
    title: "图片",
    description: "上传并插入图片",
    searchTerms: ["image", "photo", "图片"],
    icon: <ImagePlus className={iconClass} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("editor:request-image-upload"));
    },
  },
  {
    title: "Bilibili 视频",
    description: "通过 BV 号或视频链接嵌入",
    searchTerms: ["bilibili", "video", "视频", "B站"],
    icon: <Video className={iconClass} />,
    command: ({ editor, range }) => {
      const input = window.prompt("请输入 BV 号、av 号或 Bilibili 视频链接");
      if (!input) return;
      const attributes = parseBilibiliInput(input);
      if (!attributes) {
        window.alert("无法识别该 Bilibili 视频地址");
        return;
      }
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertBilibili(attributes)
        .run();
    },
  },
  {
    title: "AI 续写",
    description: "让 AI 从当前位置继续写作",
    searchTerms: ["ai", "continue", "续写"],
    icon: <Sparkles className={iconClass} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(
        new CustomEvent("editor:request-ai", { detail: { action: "continue" } })
      );
    },
  },
]);

export const SlashCommand = Command.configure({
  suggestion: {
    items: () => editorSuggestionItems,
    render: renderItems,
  },
});
