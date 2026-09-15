import { api, buildQuery, getToken, isDemoMode, WS_BASE_URL } from "@/lib/api/client";
import type { ChatMessage, Conversation } from "@/lib/types";

export const chatService = {
  conversations() {
    return api.get<Conversation[]>("/messages/conversations");
  },
  getChatHistory(itemId: number, partnerId?: number) {
    return api.get<ChatMessage[]>(`/messages/${itemId}${buildQuery({ partner_id: partnerId })}`);
  },
  sendMessage(itemId: number, receiverId: number, message: string) {
    return api.post<ChatMessage>("/messages", {
      item_id: itemId,
      receiver_id: receiverId,
      message,
    });
  },
  markMessageAsRead(messageId: number) {
    return api.patch<ChatMessage>(`/messages/${messageId}/read`);
  },
};

export type ChatSocket = {
  send: (message: string) => void;
  close: () => void;
};

/**
 * Opens the native FastAPI WebSocket at /ws/chat/{item_id}.
 * In demo mode (no VITE_WS_BASE_URL) it degrades to REST polling so the chat
 * UI still works end-to-end inside the preview.
 */
export function connectToChat(
  itemId: number,
  partnerId: number,
  onMessage: (message: ChatMessage) => void,
  onStatus?: (status: "connecting" | "open" | "closed") => void,
): ChatSocket {
  if (isDemoMode || !WS_BASE_URL) {
    onStatus?.("open");
    let lastId = 0;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const history = await chatService.getChatHistory(itemId, partnerId);
        history.filter((m) => m.id > lastId).forEach((m) => onMessage(m));
        if (history.length) lastId = Math.max(lastId, ...history.map((m) => m.id));
      } catch {
        /* ignore transient polling errors */
      }
    };
    void poll();
    const timer = window.setInterval(poll, 4000);
    return {
      send: (message: string) => {
        void chatService.sendMessage(itemId, partnerId, message).then(poll);
      },
      close: () => {
        stopped = true;
        window.clearInterval(timer);
        onStatus?.("closed");
      },
    };
  }

  onStatus?.("connecting");
  const socket = new WebSocket(`${WS_BASE_URL}/ws/chat/${itemId}?token=${getToken() ?? ""}`);
  socket.onopen = () => onStatus?.("open");
  socket.onclose = () => onStatus?.("closed");
  socket.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data) as ChatMessage);
    } catch {
      /* ignore malformed frames */
    }
  };
  return {
    send: (message: string) =>
      socket.send(JSON.stringify({ receiver_id: partnerId, message })),
    close: () => socket.close(),
  };
}

export function disconnectFromChat(socket: ChatSocket | null) {
  socket?.close();
}
