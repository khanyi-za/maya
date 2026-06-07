import { create } from 'zustand';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'merchant';
  timestamp: Date;
  read: boolean;
}

export interface Conversation {
  merchantId: string;
  messages: Message[];
  lastMessageTime: Date;
  unreadCount: number;
}

interface ChatStore {
  conversations: { [merchantId: string]: Conversation };

  // Actions
  sendMessage: (merchantId: string, text: string) => void;
  receiveMessage: (merchantId: string, text: string) => void;
  getConversation: (merchantId: string) => Conversation | null;
  markAsRead: (merchantId: string) => void;
  deleteConversation: (merchantId: string) => void;
  getTotalUnreadCount: () => number;
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  conversations: {},

      sendMessage: (merchantId: string, text: string) => {
        const now = new Date();
        const newMessage: Message = {
          id: `${Date.now()}-${Math.random()}`,
          text,
          sender: 'user',
          timestamp: now,
          read: true,
        };

        set((state) => {
          const existing = state.conversations[merchantId] || {
            merchantId,
            messages: [],
            lastMessageTime: now,
            unreadCount: 0,
          };

          return {
            conversations: {
              ...state.conversations,
              [merchantId]: {
                ...existing,
                messages: [...existing.messages, newMessage],
                lastMessageTime: now,
              },
            },
          };
        });

        // Simulate merchant reply after 2-3 seconds
        const replyDelay = 2000 + Math.random() * 1000;
        setTimeout(() => {
          get().receiveMessage(merchantId, getAutoReply());
        }, replyDelay);
      },

      receiveMessage: (merchantId: string, text: string) => {
        const now = new Date();
        const newMessage: Message = {
          id: `${Date.now()}-${Math.random()}`,
          text,
          sender: 'merchant',
          timestamp: now,
          read: false,
        };

        set((state) => {
          const existing = state.conversations[merchantId] || {
            merchantId,
            messages: [],
            lastMessageTime: now,
            unreadCount: 0,
          };

          return {
            conversations: {
              ...state.conversations,
              [merchantId]: {
                ...existing,
                messages: [...existing.messages, newMessage],
                lastMessageTime: now,
                unreadCount: existing.unreadCount + 1,
              },
            },
          };
        });
      },

      getConversation: (merchantId: string) => {
        return get().conversations[merchantId] || null;
      },

      markAsRead: (merchantId: string) => {
        set((state) => {
          const existing = state.conversations[merchantId];
          if (!existing) return state;

          return {
            conversations: {
              ...state.conversations,
              [merchantId]: {
                ...existing,
                messages: existing.messages.map((msg) => ({ ...msg, read: true })),
                unreadCount: 0,
              },
            },
          };
        });
      },

      deleteConversation: (merchantId: string) => {
        set((state) => {
          const { [merchantId]: _, ...rest } = state.conversations;
          return { conversations: rest };
        });
      },

      getTotalUnreadCount: () => {
        const conversations = get().conversations;
        return Object.values(conversations).reduce(
          (total, conv) => total + conv.unreadCount,
          0
        );
      },
    }));

// Auto-reply messages for simulation
const autoReplies = [
  "Thanks for your message! I'll get back to you shortly.",
  "Hi! Thanks for reaching out. How can I help you today?",
  "I appreciate your interest! Let me know if you have any questions.",
  "Thank you for contacting me! I'm excited to help you.",
  "Hey! I received your message. I'll respond as soon as possible.",
  "Thanks for getting in touch! What can I assist you with?",
  "Hello! I'm glad you reached out. What would you like to know?",
  "I received your message! I'll get back to you soon.",
  "Thanks for your inquiry! I'm here to help.",
  "Hi there! Thanks for messaging. How may I assist you?",
];

function getAutoReply(): string {
  return autoReplies[Math.floor(Math.random() * autoReplies.length)];
}
