import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Send, ShieldCheck } from "lucide-react";
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
import { api } from "@/lib/api/client";
import type { ChatMessage, Conversation, User } from "@/lib/types";

type ChatSearchParams = {
  item?: number;
  partner?: number;
};

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): ChatSearchParams => ({
    item: search.item !== undefined ? Number(search.item) : undefined,
    partner: search.partner !== undefined ? Number(search.partner) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — ShareShelf" },
      {
        name: "description",
        content: "Chat with neighbours and ShareShelf support privately.",
      },
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

  const isSupportThread =
    conversation.item_id === 0 ||
    conversation.partner_username.includes("Support") ||
    conversation.item_title.includes("Support");

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
    <div className="flex h-128 flex-col rounded-2xl border bg-card shadow-soft">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold flex items-center gap-1.5">
            {isSupportThread && <ShieldCheck className="size-4 text-primary" />}
            {conversation.item_title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isSupportThread
              ? "Official ShareShelf Administration & Dispute Resolution"
              : `with ${conversation.partner_username}`}
          </p>
        </div>
        {isSupportThread && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            Official Support
          </span>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="text-xs font-medium text-foreground">
              {isSupportThread
                ? "Start your inquiry with ShareShelf Support."
                : `Start the conversation with ${conversation.partner_username}. Say hi and discuss details.`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isSupportThread
                ? "Send your questions or dispute details here."
                : "Safe & private chat."}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                m.sender_id === user?.id
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
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
          placeholder={isSupportThread ? "Type your inquiry for admin…" : "Write a message…"}
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

  const isSupportInquiry =
    search.item === 0 || (search.item === undefined && search.partner !== undefined);

  const { data: currentItem } = useQuery({
    queryKey: ["item", search.item],
    queryFn: () => (search.item && search.item > 0 ? itemService.get(search.item) : null),
    enabled: Boolean(search.item && search.item > 0),
  });

  // Partner ka real username fetch karna (bina kisi default 'demo' ke)
  const { data: partnerUser } = useQuery({
    queryKey: ["user", search.partner],
    queryFn: () => (search.partner ? api.get<User>(`/users/${search.partner}`) : null),
    enabled: Boolean(search.partner),
  });

  const [activeId, setActiveId] = useState<string | number | null>(null);

  const newThread = useMemo<Conversation | null>(() => {
    if (search.partner === undefined) return null;

    if (isSupportInquiry) {
      return {
        id: `0:${search.partner}`,
        item_id: 0,
        item_title: "ShareShelf Support Desk",
        partner_id: search.partner,
        partner_username: "ShareShelf Support",
        last_message: "Start an inquiry with admin",
        last_timestamp: new Date().toISOString(),
      } as unknown as Conversation;
    }

    if (!search.item) return null;

    // Sahi dynamic partner username set karein
    const displayPartnerName =
      partnerUser?.username ??
      (currentItem?.owner?.id === search.partner
        ? currentItem.owner.username
        : `Member #${search.partner}`);

    return {
      id: `${search.item}:${search.partner}`,
      item_id: search.item,
      item_title: currentItem?.title ?? "Listing Chat",
      partner_id: search.partner,
      partner_username: displayPartnerName,
      last_message: "Start a conversation",
      last_timestamp: new Date().toISOString(),
    } as unknown as Conversation;
  }, [search.item, search.partner, isSupportInquiry, currentItem, partnerUser]);

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
        description="Coordinate pickups and communicate with ShareShelf support privately."
      />

      {isLoading ? (
        <RowsSkeleton />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Message a neighbour from any listing or contact support to start a thread."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <ul className="space-y-2">
            {conversations.map((c) => {
              const isSupport =
                c.item_id === 0 ||
                c.item_title.includes("Support") ||
                c.partner_username.includes("Support");

              return (
                <li key={String(c.id)}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition hover:bg-secondary/60",
                      String(active?.id) === String(c.id) && "border-primary bg-secondary/60",
                      isSupport && "border-primary/30 bg-primary/2",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold flex items-center gap-1.5">
                        {isSupport && <Headphones className="size-3.5 text-primary shrink-0" />}
                        {c.item_title}
                      </p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {c.partner_username}: {c.last_message}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {active && <Thread key={String(active.id)} conversation={active} />}
        </div>
      )}
    </SiteLayout>
  );
}
