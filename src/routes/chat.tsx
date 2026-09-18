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
import { itemService } from "@/services/itemService";
import { useAuth } from "@/context/AuthContext";
import { timeAgo } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation } from "@/lib/types";

type ChatSearchParams = {
  item?: number;
  partner?: number;
};

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): ChatSearchParams => ({
    item: search.item ? Number(search.item) : undefined,
    partner: search.partner ? Number(search.partner) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — ShareShelf" },
      {
        name: "description",
        content: "Chat with neighbours about pickups — no phone numbers shared.",
      },
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

  // 1. Initial Chat History Load Karein
  useEffect(() => {
    let isMounted = true;
    setMessages([]);

    chatService
      .getChatHistory(conversation.item_id, conversation.partner_id)
      .then((history) => {
        if (isMounted && history) {
          setMessages(history);
        }
      })
      .catch(() => {
        if (isMounted) setMessages([]);
      });

    // 2. Real-Time Socket Listen Karein
    const socket = connectToChat(conversation.item_id, conversation.partner_id, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    socketRef.current = socket;

    return () => {
      isMounted = false;
      socket.close();
    };
  }, [conversation.item_id, conversation.partner_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    socketRef.current?.send(text);
    setDraft("");
  }

  return (
    <div className="flex h-128 flex-col rounded-2xl border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="font-semibold">{conversation.item_title}</h2>
        <p className="text-xs text-muted-foreground">with {conversation.partner_username}</p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Start the conversation. Say hi and agree on a pickup time.
          </p>
        ) : (
          messages.map((m) => (
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
          ))
        )}
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
  const search = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: chatService.conversations,
  });

  const { data: currentItem } = useQuery({
    queryKey: ["item", search.item],
    queryFn: () => (search.item ? itemService.get(search.item) : null),
    enabled: Boolean(search.item),
  });

  const [activeId, setActiveId] = useState<string | number | null>(null);

  const newThread = useMemo<Conversation | null>(() => {
    if (!search.item || !search.partner) return null;
    return {
      id: -(search.item * 10000 + search.partner),
      item_id: search.item,
      item_title: currentItem?.title ?? "Listing Chat",
      partner_id: search.partner,
      partner_username: currentItem?.owner?.username ?? "Owner",
      last_message: "Start a conversation",
      last_timestamp: new Date().toISOString(),
    } as unknown as Conversation;
  }, [search.item, search.partner, currentItem]);

  const conversations = useMemo(() => {
    const list = data ? [...data] : [];
    if (
      newThread &&
      !list.some((c) => c.item_id === newThread.item_id && c.partner_id === newThread.partner_id)
    ) {
      list.unshift(newThread);
    }
    return list;
  }, [data, newThread]);

  const active = useMemo(() => {
    if (activeId !== null) {
      return conversations.find((c) => String(c.id) === String(activeId)) ?? null;
    }
    if (newThread) {
      return newThread;
    }
    return conversations[0] ?? null;
  }, [conversations, activeId, newThread]);

  return (
    <SiteLayout>
      <PageHeader
        title="Messages"
        description="Coordinate pickups privately — ShareShelf never shares your phone number."
      />
      {isLoading ? (
        <RowsSkeleton />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Message a neighbour from any listing to start a thread."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <ul className="space-y-2">
            {conversations.map((c) => (
              <li key={String(c.id)}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition hover:bg-secondary/60",
                    String(active?.id) === String(c.id) && "border-primary bg-secondary/60",
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
          {active && <Thread key={String(active.id)} conversation={active} />}
        </div>
      )}
    </SiteLayout>
  );
}
