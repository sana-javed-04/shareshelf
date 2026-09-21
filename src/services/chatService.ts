import { api, getToken, isDemoMode, WS_BASE_URL } from "@/lib/api/client";
import type { ChatMessage, Conversation } from "@/lib/types";

export const chatService = {
  conversations() {
    return api.get<Conversation[]>("/messages/conversations");
  },
  getChatHistory(itemId: number, partnerId: number) {
    return api.get<ChatMessage[]>(`/messages/${itemId}/${partnerId}`);
  },
  sendMessage(itemId: number, receiverId: number, message: string) {
    return api.post<ChatMessage>("/messages", {
      item_id: itemId,
      receiver_id: receiverId,
      message,
    });
  },
};

export type ChatSocket = {
  send: (message: string) => void;
  close: () => void;
};

export function connectToChat(
  itemId: number,
  partnerId: number,
  onMessage: (message: ChatMessage) => void,
  onStatus?: (status: "connecting" | "open" | "closed") => void,
): ChatSocket {
  const token = getToken();

  if (isDemoMode || !WS_BASE_URL || !token) {
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
        // ignore polling error
      }
    };

    void poll();
    const timer = window.setInterval(poll, 3000);

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
  const wsUrl = `${WS_BASE_URL}/api/messages/ws/${token}`;
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => onStatus?.("open");
  socket.onclose = () => onStatus?.("closed");
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const incomingItemId = Number(data.item_id || 0);
      const targetItemId = Number(itemId || 0);

      if (incomingItemId === targetItemId) {
        onMessage({
          id: data.id,
          item_id: data.item_id,
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          is_read: data.is_read ?? false,
        } as unknown as ChatMessage);
      }
    } catch {
      // ignore
    }
  };

  return {
    send: (message: string) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            receiver_id: partnerId,
            item_id: itemId,
            message,
          }),
        );
      } else {
        void chatService.sendMessage(itemId, partnerId, message);
      }
    },
    close: () => socket.close(),
  };
}

export function disconnectFromChat(socket: ChatSocket | null) {
  socket?.close();
}
