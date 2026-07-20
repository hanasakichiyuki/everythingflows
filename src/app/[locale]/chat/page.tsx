import { ChatShell } from "@/components/chat/ChatShell";
import { PageShell } from "@/components/ui/surface";

interface ChatPageProps {
  searchParams: Promise<{ id?: string }>;
}

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { id } = await searchParams;

  return (
    <PageShell
      surfaceClassName="p-0 sm:p-0"
      contentClassName="chat-viewport flex flex-col"
    >
      <ChatShell initialConversationId={id} />
    </PageShell>
  );
}
