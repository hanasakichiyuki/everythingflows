export const MAX_FRAGMENT_TEXT_LENGTH = 1000;

type FragmentTextValidation =
  | { ok: true; text: string | null }
  | { ok: false; error: string };

export function validateFragmentText(
  value: unknown,
  { required }: { required: boolean },
): FragmentTextValidation {
  if (value !== undefined && value !== null && typeof value !== "string") {
    return { ok: false, error: "文字内容格式不正确" };
  }

  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) {
    return { ok: false, error: "文字内容不能为空" };
  }
  if (text.length > MAX_FRAGMENT_TEXT_LENGTH) {
    return {
      ok: false,
      error: `文字内容不能超过 ${MAX_FRAGMENT_TEXT_LENGTH} 个字符`,
    };
  }

  return { ok: true, text: text || null };
}
