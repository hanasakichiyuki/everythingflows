import { MemoryWall } from "@/components/memory/MemoryWall";
import { listFragments } from "@/lib/api/fragments";

// ISR：碎碎念变更频率低；1h 兜底，增删改时由 API 路由精确 revalidate。
export const revalidate = 3600;

async function getFragments() {
  try {
    return await listFragments();
  } catch {
    console.error("[fragments] unable to load fragments");
    return [];
  }
}

export default async function FragmentsPage() {
  const fragments = await getFragments();

  return <MemoryWall fragments={fragments} />;
}
