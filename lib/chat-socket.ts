// socket.io client for the nuwa /chat namespace (docs/api/chat.md, CH-1).
// REST owns the durable writes; this socket only receives fan-out events.
// JWT rides in the handshake auth payload and is verified server-side.

import { io, type Socket } from 'socket.io-client';
import { AUTH_BASE, ensureFreshAccessToken } from './api';
import type { ChatMessage } from './api-client';

export interface ChatSocketHandlers {
  onMessage: (message: ChatMessage) => void;
  onRead?: (event: { conversationId: string; by: string }) => void;
}

/**
 * Connect, join the conversation room, and stream events. Returns a cleanup
 * function (leave + disconnect) for the caller's effect teardown.
 */
export async function openChatSocket(
  conversationId: string,
  handlers: ChatSocketHandlers
): Promise<() => void> {
  const token = await ensureFreshAccessToken();

  const socket: Socket = io(`${AUTH_BASE}/chat`, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    socket.emit('join', { conversationId });
  });

  socket.on('message:new', (message: ChatMessage) => {
    if (message.conversationId === conversationId) {
      handlers.onMessage(message);
    }
  });

  if (handlers.onRead) {
    socket.on('read', handlers.onRead);
  }

  return () => {
    socket.emit('leave', { conversationId });
    socket.disconnect();
  };
}
