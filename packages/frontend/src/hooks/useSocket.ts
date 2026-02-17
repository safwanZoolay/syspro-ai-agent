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
      setMessages((prev) => {
        // Check if message already exists (from streaming)
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex !== -1) {
          // Update existing message
          const updated = [...prev];
          updated[existingIndex] = message;
          return updated;
        }
        // Add new message
        return [...prev, message];
      });
      setIsLoading(false);
    });

    // Listen for message updates (streaming)
    socket.on('message_update', (update: { messageId: string; content: string; isComplete: boolean }) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex(m => m.id === update.messageId);
        if (existingIndex !== -1) {
          // Update existing message content
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            content: update.content,
          };
          return updated;
        } else {
          // Create new message for streaming
          return [...prev, {
            id: update.messageId,
            sessionId: sessionId!,
            role: 'assistant',
            content: update.content,
            timestamp: new Date().toISOString(),
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
      setActivities((prev) => [...prev, activity]);
    });

    // Listen for errors
    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      setIsLoading(false);
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
  };
}
