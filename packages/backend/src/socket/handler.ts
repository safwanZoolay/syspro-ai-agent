import type { Server as SocketServer, Socket } from 'socket.io';
import { opcodeManager } from '../opencode.js';
import { db } from '../db/sqlite.js';
import type { Message, StreamEvent, SessionActivity } from '@opencode-web-ui/shared';
import { getWorkflow } from '../workflows/registry.js';

interface ChatMessage {
  sessionId: string;
  content: string;
}

export function setupSocketHandlers(io: SocketServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join session room
    socket.on('join_session', (sessionId: string) => {
      socket.join(sessionId);
      console.log(`📥 Client ${socket.id} joined session: ${sessionId}`);

      // Send existing messages and activities
      const messages = db.getMessages(sessionId);
      const activities = db.getActivities(sessionId);

      socket.emit('session_history', {
        messages,
        activities,
      });
    });

    // Handle chat messages
    socket.on('chat_message', async (data: ChatMessage) => {
      try {
        const { sessionId, content } = data;

        // Save user message
        const userMessage = db.createMessage({
          sessionId,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        });

        // Broadcast to all clients in the session
        io.to(sessionId).emit('message', userMessage);

        // Get session to find OpenCode session ID
        const session = db.getSession(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }

        const opcodeSessionId = session.metadata?.opcodeSessionId;
        if (!opcodeSessionId) {
          throw new Error('OpenCode session not initialized');
        }

        // Log activity
        const activity = db.createActivity({
          sessionId,
          type: 'thinking',
          description: 'Processing your request...',
          timestamp: new Date().toISOString(),
        });

        io.to(sessionId).emit('activity', activity);

        // Send prompt to OpenCode
        const client = opcodeManager.getClient();
        const response = await client.session.prompt({
          path: { id: opcodeSessionId },
          body: {
            parts: [{ type: 'text', text: content }],
          },
        });

        // Extract assistant response
        const assistantContent = extractResponseContent(response);

        // Save assistant message
        const assistantMessage = db.createMessage({
          sessionId,
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        });

        io.to(sessionId).emit('message', assistantMessage);

        // Log completion activity
        const completeActivity = db.createActivity({
          sessionId,
          type: 'thinking',
          description: 'Response complete',
          timestamp: new Date().toISOString(),
        });

        io.to(sessionId).emit('activity', completeActivity);

        // Update session timestamp
        db.updateSession(sessionId, {
          updatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Error handling chat message:', error);
        socket.emit('error', {
          message: error.message || 'Failed to process message',
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

// Helper to extract content from OpenCode response
function extractResponseContent(response: any): string {
  try {
    // OpenCode API returns response in different formats
    // Adjust this based on actual API response structure
    if (response.data?.parts) {
      const textParts = response.data.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text);
      return textParts.join('\n');
    }

    if (response.data?.content) {
      return response.data.content;
    }

    if (typeof response.data === 'string') {
      return response.data;
    }

    return JSON.stringify(response.data, null, 2);
  } catch (error) {
    console.error('Error extracting response content:', error);
    return 'Error: Could not parse response';
  }
}
