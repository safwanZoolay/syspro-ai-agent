import type { Server as SocketServer, Socket } from 'socket.io';
import { opcodeManager } from '../opencode.js';
import { db } from '../db/json-store.js';
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
      console.log('💬 Received chat_message:', { sessionId: data.sessionId, content: data.content?.substring(0, 50) });
      try {
        const { sessionId, content } = data;

        // Save user message
        const userMessage = db.createMessage({
          sessionId,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        });

        console.log('📤 Broadcasting user message to session:', sessionId);
        // Broadcast to all clients in the session
        io.to(sessionId).emit('message', userMessage);

        // Get session to find OpenCode session ID
        const session = db.getSession(sessionId);
        if (!session) {
          throw new Error('Session not found');
        }

        const opcodeSessionId = session.metadata?.opcodeSessionId;
        if (!opcodeSessionId) {
          console.error('Session missing opcodeSessionId:', session);
          throw new Error('OpenCode session not initialized. Please start a new session from the home page.');
        }

        // Log activity
        const activity = db.createActivity({
          sessionId,
          type: 'thinking',
          description: 'Processing your request...',
          timestamp: new Date().toISOString(),
        });

        io.to(sessionId).emit('activity', activity);

        console.log('🤖 Sending to OpenCode session:', opcodeSessionId);
        // Send prompt to OpenCode and get response
        const client = opcodeManager.getClient();

        console.log('📡 Calling OpenCode API...');
        const response = await client.session.prompt({
          path: { id: opcodeSessionId },
          body: {
            parts: [{ type: 'text', text: content }],
          },
        });

        console.log('✅ Got response from OpenCode:', { status: response.response?.status, hasData: !!response.data });
        console.log('📦 Response data:', JSON.stringify(response.data, null, 2));

        // Extract assistant response from messages
        const assistantContent = extractResponseContent(response);
        console.log('📝 Extracted content length:', assistantContent.length);

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
        console.error('❌ Error handling chat message:', error);
        console.error('Error stack:', error.stack);
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
    // OpenCode SDK returns messages array with content
    if (response.data?.messages && Array.isArray(response.data.messages)) {
      // Get the last assistant message
      const assistantMessages = response.data.messages.filter(
        (msg: any) => msg.role === 'assistant'
      );

      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];

        // Extract text from content blocks
        if (Array.isArray(lastMessage.content)) {
          const textBlocks = lastMessage.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text);
          return textBlocks.join('\n\n');
        }

        // Handle direct string content
        if (typeof lastMessage.content === 'string') {
          return lastMessage.content;
        }
      }
    }

    // Fallback: try to extract any text we can find
    if (response.data?.content) {
      return typeof response.data.content === 'string'
        ? response.data.content
        : JSON.stringify(response.data.content, null, 2);
    }

    console.warn('Unexpected response format:', response);
    return 'Received response but could not extract content';
  } catch (error) {
    console.error('Error extracting response content:', error);
    return 'Error: Could not parse response';
  }
}
