import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message, SessionActivity } from '@opencode-web-ui/shared';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('🔌 Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, connected };
}

export function useChat(sessionId: string | null) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<SessionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join session room
    socket.emit('join_session', sessionId);

    // Listen for session history
    socket.on('session_history', (data: { messages: Message[]; activities: SessionActivity[] }) => {
      setMessages(data.messages);
      setActivities(data.activities);
    });

    // Listen for new messages
    socket.on('message', (message: Message) => {
      console.log('📨 Frontend received message:', message.id, message.role, message.content.substring(0, 50));
      setMessages((prev) => {
        // Check if message already exists (from streaming)
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          // Update existing message and clear streaming flag
          const updated = [...prev];
          updated[existingIndex] = {
            ...message,
            metadata: {
              ...message.metadata,
              isStreaming: false,
            },
          };
          return updated;
        }
        // Add new message
        return [...prev, message];
      });
      setIsLoading(false);
    });

    // Listen for message updates (streaming)
    socket.on('message_update', (update: { messageId: string; content: string; isComplete: boolean }) => {
      console.log('📨 Frontend received message_update:', {
        messageId: update.messageId,
        contentLength: update.content.length,
        isComplete: update.isComplete
      });

      setMessages((prev) => {
        const existingIndex = prev.findIndex(m => m.id === update.messageId);
        console.log('📝 Updating message, exists:', existingIndex !== -1, 'current messages:', prev.length);

        if (existingIndex !== -1) {
          // Update existing message content
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: update.content,
            metadata: {
              ...updated[existingIndex].metadata,
              isStreaming: !update.isComplete,
            },
          };
          return updated;
        } else {
          // Create new message for streaming
          console.log('✨ Creating new streaming message');
          return [...prev, {
            id: update.messageId,
            sessionId: sessionId!,
            role: 'assistant',
            content: update.content,
            timestamp: new Date().toISOString(),
            metadata: {
              isStreaming: true,
            },
          }];
        }
      });

      // Keep loading state if not complete
      if (update.isComplete) {
        setIsLoading(false);
      }
    });

    // Listen for activities
    socket.on('activity', (activity: SessionActivity) => {
      console.log('📨 Frontend received activity:', activity.type, activity.description);
      setActivities((prev) => [...prev, activity]);
    });

    // Listen for errors
    socket.on('error', (errorData: { type: string; message: string; retryAttempt?: number }) => {
      console.error('Socket error:', errorData);

      // Format error message for user
      let userMessage = errorData.message;
      if (errorData.type === 'rate_limit') {
        userMessage = `⚠️ API Rate Limit: ${errorData.message}`;
        if (errorData.retryAttempt) {
          userMessage += ` (Retry attempt ${errorData.retryAttempt})`;
        }
      }

      setError(userMessage);
      setIsLoading(false);

      // Clear error after 10 seconds
      setTimeout(() => setError(null), 10000);
    });

    return () => {
      socket.off('session_history');
      socket.off('message');
      socket.off('message_update');
      socket.off('activity');
      socket.off('error');
    };
  }, [socket, sessionId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !sessionId || !content.trim()) return;

      setIsLoading(true);
      socket.emit('chat_message', { sessionId, content });
    },
    [socket, sessionId]
  );

  return {
    messages,
    activities,
    sendMessage,
    isLoading,
    connected,
    error,
  };
}
