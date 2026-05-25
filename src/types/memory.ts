export interface MemoryFragment {
  id: string;
  type: "image" | "text";
  imageUrl?: string;
  text?: string;
  width: "sm" | "md" | "lg";
  height: "short" | "medium" | "tall";
  createdAt: string;
}
