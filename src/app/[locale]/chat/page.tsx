import { ChatShell } from "@/components/chat/ChatShell";

interface ChatPageProps {
  searchParams: Promise<{ id?: string }>;
}

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { id } = await searchParams;

  return (
    <div className="anim-fade-up relative -mx-6 -my-8 px-6 py-8 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12">
      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-lg dark:border-white/10 dark:bg-gray-900/50">
        <div className="absolute inset-0 rounded-2xl bg-white/10 dark:bg-gray-900/30 pointer-events-none" />
        <div className="relative z-10 flex h-[calc(100vh-8rem)] flex-col">
          <ChatShell initialConversationId={id} />
        </div>
      </div>
    </div>
  );
}
