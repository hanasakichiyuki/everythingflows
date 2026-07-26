const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateEditorImage(file: File): void {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("图片不能超过 5MB");
  }
}

export async function uploadEditorImage(file: File): Promise<string> {
  validateEditorImage(file);

  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const result = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? "图片上传失败");
  }
  return result.url;
}
