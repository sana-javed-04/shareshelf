import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton } from "@/components/LoadingSkeleton";
import { chatService, connectToChat, type ChatSocket } from "@/services/chatService";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation } from "@/lib/types";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Messages — ShareShelf" },
      { name: "description", content: "Chat with neighbours about pickups — no phone numbers shared." },
      { property: "og:title", content: "Messages — ShareShelf" },
      { property: "og:description", content: "Private, in-app messaging for every listing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ChatPage />
    </RequireAuth>
  ),
});

function Thread({ conversation }: { conversation: Conversation }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<ChatSocket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([]);
    const socket = connectToChat(conversation.item_id, conversation.partner_id, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    socketRef.current = socket;
    return () => socket.close();
  }, [conversation.item_id, conversation.partner_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    socketRef.current?.send(text);
    setDraft("");
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-2xl border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">{conversation.item_title}</h2>
        <p className="text-xs text-muted-foreground">with {conversation.partner_username}</p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
              m.sender_id === user?.id
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            <p>{m.message}</p>
            <p className="mt-1 text-[10px] opacity-70">{timeAgo(m.timestamp)}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          aria-label="Message"
          maxLength={1000}
        />
        <Button type="submit" size="icon" aria-label="Send message">
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

function ChatPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: chatService.conversations,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => data?.find((c) => c.id === activeId) ?? data?.[0] ?? null,
    [data, activeId],
  );

  return (
    <SiteLayout>
      <PageHeader
        title="Messages"
        description="Coordinate pickups privately — ShareShelf never shares your phone number."
      />
      {isLoading ? (
        <RowsSkeleton />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Message a neighbour from any listing to start a thread."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <ul className="space-y-2">
            {data.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition hover:bg-secondary/60",
                    active?.id === c.id && "border-primary bg-secondary/60",
                  )}
                >
                  <p className="truncate text-sm font-semibold">{c.item_title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.partner_username}: {c.last_message}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {active && <Thread key={active.id} conversation={active} />}
        </div>
      )}
    </SiteLayout>
  );
}
