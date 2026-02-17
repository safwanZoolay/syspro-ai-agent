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
        const client = opcodeManager.getClient();

        // Create streaming message
        let streamedContent = '';
        const assistantMessage = db.createMessage({
          sessionId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        });

        console.log('📡 Starting event subscription for streaming...');

        // Subscribe to events for real-time updates
        const eventPromise = (async () => {
          try {
            const events = await client.event.subscribe();
            console.log('✅ Subscribed to events');

            for await (const event of events.stream) {
              const eventData = event as any;

              // Log full event for debugging
              if (eventData.type === 'message.part.delta' || eventData.type === 'message.part.updated') {
                console.log('📨 Event:', eventData.type, JSON.stringify(eventData, null, 2));
              } else {
                console.log('📨 Event:', eventData.type);
              }

              // Handle different event types based on OpenCode SDK structure
              if (eventData.type === 'message.part.delta') {
                // Text streaming - this is the actual text coming through!
                // Data is nested inside 'properties'
                const props = eventData.properties || eventData;
                if (props.field === 'text' && props.delta) {
                  streamedContent += props.delta;
                  db.updateMessage(assistantMessage.id, { content: streamedContent });

                  // Emit streaming update to frontend
                  io.to(sessionId).emit('message_update', {
                    messageId: assistantMessage.id,
                    content: streamedContent,
                    isComplete: false,
                  });
                  console.log('📤 Streamed:', props.delta);
                }
              } else if (eventData.type === 'message.part.updated') {
                // Tool usage or part updates
                // Data is nested inside 'properties'
                const props = eventData.properties || eventData;
                const part = props.part;
                if (part?.type === 'tool' && part.tool) {
                  const toolName = part.tool;
                  const status = part.state?.status;

                  if (status === 'running' || status === 'pending') {
                    const toolActivity = db.createActivity({
                      sessionId,
                      type: 'tool_use',
                      description: `Using tool: ${toolName}`,
                      timestamp: new Date().toISOString(),
                      data: part,
                    });
                    io.to(sessionId).emit('activity', toolActivity);
                    console.log('🔧 Tool:', toolName, status);
                  }
                }
              } else if (eventData.type === 'permission.asked') {
                // Permission request - auto-approve for now
                const props = eventData.properties || eventData;
                const permissionId = props.id;
                const permission = props.permission;
                const patterns = props.patterns || [];

                console.log('🔐 Permission requested:', permission, patterns);

                // Notify frontend
                const permissionActivity = db.createActivity({
                  sessionId,
                  type: 'tool_use',
                  description: `Permission requested: ${permission} for ${patterns.join(', ')}`,
                  timestamp: new Date().toISOString(),
                });
                io.to(sessionId).emit('activity', permissionActivity);

                // Auto-approve permission using direct HTTP call
                try {
                  const approvalResponse = await fetch(
                    `http://127.0.0.1:4096/session/${opcodeSessionId}/permissions/${permissionId}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ allow: true }),
                    }
                  );

                  if (approvalResponse.ok) {
                    console.log('✅ Permission auto-approved:', permissionId);
                  } else {
                    console.error('❌ Permission approval failed:', approvalResponse.status, await approvalResponse.text());
                  }
                } catch (error) {
                  console.error('❌ Failed to approve permission:', error);
                }
              } else if (eventData.type === 'session.status' || eventData.type === 'session.idle') {
                // Session status changes - check both event types
                const status = eventData.properties?.status?.type || eventData.status?.type;
                if (status === 'idle' || eventData.type === 'session.idle') {
                  console.log('✅ Session idle - message complete');
                  break;
                }
              }
            }
          } catch (error) {
            console.error('⚠️ Event subscription error:', error);
            // Continue - will use fallback prompt
          }
        })();

        // Send prompt (this triggers the events)
        console.log('📤 Sending prompt...');
        const promptPromise = client.session.prompt({
          path: { id: opcodeSessionId },
          body: {
            parts: [{ type: 'text', text: content }],
          },
        });

        // Wait for both to complete
        const [, response] = await Promise.all([eventPromise, promptPromise]);

        console.log('✅ Got final response');

        // If we didn't get content from streaming, extract from response
        if (!streamedContent) {
          console.log('⚠️ No streamed content, extracting from response...');
          streamedContent = extractResponseContent(response);
          db.updateMessage(assistantMessage.id, { content: streamedContent });
        }

        // Emit final message
        assistantMessage.content = streamedContent;
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
