import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";

export const CALLOUT_KINDS = [
  "info",
  "success",
  "warning",
  "danger",
] as const;

export type CalloutKind = (typeof CALLOUT_KINDS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (kind?: CalloutKind) => ReturnType;
      toggleCallout: (kind?: CalloutKind) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

/** 归一化 callout 类型；非法值退回 "info"。渲染器必须复用此函数，避免与编辑器行为漂移。 */
export function normalizeCalloutKind(value: unknown): CalloutKind {
  return CALLOUT_KINDS.includes(value as CalloutKind)
    ? (value as CalloutKind)
    : "info";
}

export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "info",
        parseHTML: (element) =>
          normalizeCalloutKind(element.getAttribute("data-callout-type")),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout-type]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const kind = normalizeCalloutKind(HTMLAttributes.kind);
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-callout-type": kind,
        class: `tiptap-callout tiptap-callout-${kind}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (kind: CalloutKind = "info") =>
        ({ commands }: CommandProps) =>
          commands.wrapIn(this.name, { kind: normalizeCalloutKind(kind) }),
      toggleCallout:
        (kind: CalloutKind = "info") =>
        ({ commands }: CommandProps) =>
          commands.toggleWrap(this.name, { kind: normalizeCalloutKind(kind) }),
      unsetCallout:
        () =>
        ({ commands }: CommandProps) =>
          commands.lift(this.name),
    };
  },
});
