"use client";

import { ReactNodeViewRenderer } from "@tiptap/react";
import { BilibiliNode } from "@/lib/editor/bilibili";
import { CalloutNode } from "@/lib/editor/callout";
import { CodeBlockNode } from "@/lib/editor/code-block";
import { BilibiliNodeView } from "./BilibiliNodeView";
import { CalloutNodeView } from "./CalloutNodeView";
import { CodeBlockNodeView } from "./CodeBlockNodeView";

export const ClientBilibiliNode = BilibiliNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(BilibiliNodeView);
  },
});

export const ClientCalloutNode = CalloutNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
});

export const ClientCodeBlockNode = CodeBlockNode.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
});
