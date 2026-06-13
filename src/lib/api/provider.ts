/**
 * 数据后端标识 —— 当前固定为 Supabase。
 *
 * 保留此模块作为「数据层接缝」的语义锚点：未来更换数据库时，
 * 在此调整返回值，并在 lib/api/posts.ts 把委托指向新实现。
 */
export type DataProvider = "supabase";

export function getDataProvider(): DataProvider {
  return "supabase";
}

export function isFilesystemMode() {
  return false;
}
