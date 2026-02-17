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
      setMessages((prev) => [...prev, message]);
      setIsLoading(false);
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
