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
        // Send prompt to OpenCode with streaming
        const client = opcodeManager.getClient();

        console.log('📡 Starting OpenCode stream...');

        // Create a placeholder message for streaming updates
        let streamedContent = '';
        let assistantMessage = db.createMessage({
          sessionId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        });

        // Use streaming endpoint
        const response = await fetch(`http://127.0.0.1:4096/session/${opcodeSessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: [{ type: 'text', text: content }],
            stream: true,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to start OpenCode stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const event = JSON.parse(data);
                  console.log('📨 Stream event:', event.type);

                  // Handle different event types
                  if (event.type === 'text') {
                    streamedContent += event.text;
                    assistantMessage.content = streamedContent;

                    // Update message in DB
                    db.updateMessage(assistantMessage.id, { content: streamedContent });

                    // Emit partial update to client
                    io.to(sessionId).emit('message_update', {
                      messageId: assistantMessage.id,
                      content: streamedContent,
                      isComplete: false,
                    });
                  } else if (event.type === 'thinking') {
                    // Show thinking activity
                    const thinkActivity = db.createActivity({
                      sessionId,
                      type: 'thinking',
                      description: event.text || 'Thinking...',
                      timestamp: new Date().toISOString(),
                    });
                    io.to(sessionId).emit('activity', thinkActivity);
                  } else if (event.type === 'tool_use') {
                    // Show tool usage
                    const toolActivity = db.createActivity({
                      sessionId,
                      type: 'tool_use',
                      description: `Using tool: ${event.tool_name}`,
                      timestamp: new Date().toISOString(),
                      data: event,
                    });
                    io.to(sessionId).emit('activity', toolActivity);
                  }
                } catch (e) {
                  console.error('Error parsing stream event:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        console.log('✅ Stream complete, total length:', streamedContent.length);

        // If streaming failed or no content, fallback to regular prompt
        if (!streamedContent) {
          console.log('⚠️ No streamed content, using fallback...');
          const fallbackResponse = await client.session.prompt({
            path: { id: opcodeSessionId },
            body: {
              parts: [{ type: 'text', text: content }],
            },
          });

          streamedContent = extractResponseContent(fallbackResponse);
          assistantMessage.content = streamedContent;
          db.updateMessage(assistantMessage.id, { content: streamedContent });
        }

        // Emit final complete message
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
    // OpenCode SDK returns parts array with content
    if (response.data?.parts && Array.isArray(response.data.parts)) {
      console.log('🔍 Found parts array, length:', response.data.parts.length);

      // Extract text from all text parts
      const textBlocks = response.data.parts
        .filter((part: any) => {
          console.log('  Part type:', part.type);
          return part.type === 'text';
        })
        .map((part: any) => part.text);

      if (textBlocks.length > 0) {
        console.log('✅ Extracted', textBlocks.length, 'text blocks');
        return textBlocks.join('\n\n');
      }
    }

    // Legacy format: OpenCode SDK returns messages array with content
    if (response.data?.messages && Array.isArray(response.data.messages)) {
      const assistantMessages = response.data.messages.filter(
        (msg: any) => msg.role === 'assistant'
      );

      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];

        if (Array.isArray(lastMessage.content)) {
          const textBlocks = lastMessage.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text);
          return textBlocks.join('\n\n');
        }

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

    console.warn('⚠️ Unexpected response format:', JSON.stringify(response.data, null, 2));
    return 'Received response but could not extract content';
  } catch (error) {
    console.error('❌ Error extracting response content:', error);
    return 'Error: Could not parse response';
  }
}
