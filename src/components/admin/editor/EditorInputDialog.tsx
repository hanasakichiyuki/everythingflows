"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type EditorInputDialogProps = {
  title: string;
  description?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  /**
   * 提交回调。
   *
   * 返回字符串表示输入不合法：对话框保持打开并把它显示成错误提示；返回 null 表示成功，
   * 对话框关闭。校验放在调用方，便于直接复用编辑器自己的解析/校验函数。
   */
  onSubmit: (value: string) => string | null;
  onCancel: () => void;
};

/**
 * 编辑器里的单行输入对话框。
 *
 * 取代 `window.prompt`：后者样式无法与站点一致、读屏体验差，而且在部分浏览器的
 * 沙箱/嵌入式环境里会被直接拦掉。这里复用项目既有的 Dialog 组件（Radix）。
 *
 * 使用方式：**打开时才挂载**（`{open && <EditorInputDialog … />}`）。这样输入值直接从
 * 挂载时的 `defaultValue` 初始化，不需要用 effect 重置状态（也就不会有级联渲染）。
 */
export function EditorInputDialog({
  title,
  description,
  label,
  defaultValue = "",
  placeholder,
  confirmText = "确定",
  onSubmit,
  onCancel,
}: EditorInputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const message = onSubmit(value);
    if (message) {
      setError(message);
      return;
    }
    onCancel();
  };

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle>{title}</DialogTitle>
        {description && (
          <DialogDescription className="mt-2">{description}</DialogDescription>
        )}
        <form
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label
            className="block text-xs font-medium text-muted"
            htmlFor="editor-input-dialog"
          >
            {label}
          </label>
          <Input
            id="editor-input-dialog"
            className="mt-1.5"
            value={value}
            placeholder={placeholder}
            autoFocus
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
          {error && (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" size="sm">
              {confirmText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
