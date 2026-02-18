import { Router } from 'express';
import { db } from '../db/json-store.js';
import { opcodeManager } from '../opencode.js';
import { getWorkflow } from '../workflows/registry.js';

const router = Router();

// Get all sessions
router.get('/', (req, res) => {
  try {
    const sessions = db.getAllSessions();
    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific session
router.get('/:id', (req, res) => {
  try {
    const session = db.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = db.getMessages(req.params.id);
    const activities = db.getActivities(req.params.id);

    res.json({ session, messages, activities });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new session
router.post('/', async (req, res) => {
  try {
    console.log('\n🎬 ========== STARTING SESSION CREATION ==========');
    const { workflowId, inputs, customTitle } = req.body;
    console.log('📋 Request body:', { workflowId, inputs: inputs ? 'provided' : 'none', customTitle });

    if (!workflowId) {
      console.log('❌ Missing workflowId');
      return res.status(400).json({ error: 'workflowId is required' });
    }

    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      console.log('❌ Workflow not found:', workflowId);
      return res.status(404).json({ error: 'Workflow not found' });
    }
    console.log('✅ Workflow found:', workflow.name);

    // Use custom title if provided, otherwise use default
    const sessionTitle = customTitle || workflow.name;
    console.log('📝 Session title:', sessionTitle);

    // Create OpenCode session
    console.log('🔧 Creating OpenCode session...');
    const client = opcodeManager.getClient();
    const opcodeSession = await client.session.create({
      body: {
        title: `${sessionTitle} - ${new Date().toLocaleString()}`,
      },
    });

    if (!opcodeSession.data?.id) {
      throw new Error('Failed to create OpenCode session');
    }
    console.log('✅ OpenCode session created:', opcodeSession.data.id);

    // Create session in our database first
    console.log('💾 Creating session in database...');
    const session = db.createSession({
      workflowId,
      title: sessionTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        opcodeSessionId: opcodeSession.data.id,
        inputs,
      },
    });
    console.log('✅ Database session created:', session.id);

    // Build system prompt and initial message
    console.log('📝 Building system prompt...');
    const systemPrompt = workflow.buildSystemPrompt(inputs || {});
    console.log('✅ System prompt built (length:', systemPrompt.length, 'chars)');

    // Send initial message if workflow defines one
    // Combine system prompt with initial message so Claude has context
    if (workflow.initialMessage) {
      console.log('📨 Workflow has initialMessage - preparing to send...');
      const initialMsg = workflow.initialMessage(inputs || {});
      console.log('📝 Initial message:', initialMsg.substring(0, 100) + '...');

      // Combine system instructions with user message
      const combinedMessage = `<system_context>
${systemPrompt}
</system_context>

${initialMsg}`;
      console.log('📦 Combined message prepared (length:', combinedMessage.length, 'chars)');

      // Store the user message in our database (without system context)
      console.log('💾 Storing user message in database...');
      db.createMessage({
        sessionId: session.id,
        role: 'user',
        content: initialMsg,
        timestamp: new Date().toISOString(),
      });
      console.log('✅ User message stored');

      // Send combined message to OpenCode to trigger agent response
      // Note: We don't await this - let it happen in background
      // The socket handler will pick up the response via events
      console.log('🚀 Sending combined message to OpenCode (async)...');
      client.session.prompt({
        path: { id: opcodeSession.data.id },
        body: {
          parts: [
            { type: 'text', text: combinedMessage }
          ],
        },
      }).then(() => {
        console.log('✅ Initial message sent successfully to OpenCode');
      }).catch((error) => {
        console.error('❌ Failed to send initial message:', error);
      });
      console.log('⏳ Initial message sent (async - not waiting for response)');
    } else {
      console.log('⚠️ No initialMessage defined - using promptAsync with noReply');
      // No initial message - just inject system prompt
      await client.session.promptAsync({
        path: { id: opcodeSession.data.id },
        body: {
          parts: [{ type: 'text', text: systemPrompt }],
          noReply: true,
        },
      });
      console.log('✅ System prompt injected');
    }

    // Log initial activity
    console.log('📊 Creating initial activity log...');
    db.createActivity({
      sessionId: session.id,
      type: 'thinking',
      description: `Started ${workflow.name} session`,
      timestamp: new Date().toISOString(),
      data: { inputs },
    });
    console.log('✅ Activity logged');

    console.log('🎉 Session creation complete! Returning response...');
    console.log('========== SESSION CREATION COMPLETE ==========\n');
    res.json({ session });
  } catch (error: any) {
    console.error('❌ ========== SESSION CREATION FAILED ==========');
    console.error('Error creating session:', error);
    console.error('Stack:', error.stack);
    console.error('========================================\n');
    res.status(500).json({ error: error.message });
  }
});

// Delete a session
router.delete('/:id', async (req, res) => {
  try {
    const session = db.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete OpenCode session if it exists
    if (session.metadata?.opcodeSessionId) {
      try {
        const client = opcodeManager.getClient();
        await client.session.delete({
          path: { id: session.metadata.opcodeSessionId },
        });
      } catch (error) {
        console.warn('Failed to delete OpenCode session:', error);
      }
    }

    // Delete from our database
    db.deleteSession(req.params.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
