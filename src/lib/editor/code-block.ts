import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

export const CODE_BLOCK_LANGUAGES = [
  { value: "plaintext", label: "纯文本" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "tsx", label: "TSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
  { value: "yaml", label: "YAML" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "graphql", label: "GraphQL" },
  { value: "diff", label: "Diff" },
] as const;

export const codeBlockLowlight = createLowlight(common);

export function isSafeCodeLanguage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 32 &&
    /^[a-z0-9+#.-]+$/i.test(value)
  );
}

export function getCodeLanguageLabel(language: string): string {
  return (
    CODE_BLOCK_LANGUAGES.find((option) => option.value === language)?.label ??
    language.toUpperCase()
  );
}

const EnhancedCodeBlockLowlight = CodeBlockLowlight.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => {
        if (!this.editor.isActive(this.name)) return false;
        return this.editor.commands.insertContent("  ");
      },
      "Shift-Tab": () => {
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parent.type.name !== this.name) return false;

        const textBeforeCursor = $from.parent.textBetween(
          0,
          $from.parentOffset,
          "\n"
        );
        const lineOffset = textBeforeCursor.lastIndexOf("\n") + 1;
        const line = $from.parent.textContent.slice(lineOffset);
        const indentLength = line.startsWith("\t")
          ? 1
          : line.startsWith("  ")
            ? 2
            : line.startsWith(" ")
              ? 1
              : 0;
        if (indentLength === 0) return false;

        const lineStart = $from.start() + lineOffset;
        view.dispatch(state.tr.delete(lineStart, lineStart + indentLength));
        return true;
      },
    };
  },
});

export const CodeBlockNode = EnhancedCodeBlockLowlight.configure({
  lowlight: codeBlockLowlight,
  defaultLanguage: "plaintext",
  HTMLAttributes: {
    class: "tiptap-code-block",
  },
});
