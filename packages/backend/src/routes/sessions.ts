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
    const { workflowId, inputs, customTitle } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId is required' });
    }

    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Use custom title if provided, otherwise use default
    const sessionTitle = customTitle || workflow.name;

    // Create OpenCode session
    const client = opcodeManager.getClient();
    const opcodeSession = await client.session.create({
      body: {
        title: `${sessionTitle} - ${new Date().toLocaleString()}`,
      },
    });

    if (!opcodeSession.data?.id) {
      throw new Error('Failed to create OpenCode session');
    }

    // Create session in our database first
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

    // Build system prompt and initial message
    const systemPrompt = workflow.buildSystemPrompt(inputs || {});

    // Send initial message if workflow defines one
    // Combine system prompt with initial message so Claude has context
    if (workflow.initialMessage) {
      const initialMsg = workflow.initialMessage(inputs || {});

      // Combine system instructions with user message
      const combinedMessage = `<system_context>
${systemPrompt}
</system_context>

${initialMsg}`;

      // Store the user message in our database (without system context)
      db.createMessage({
        sessionId: session.id,
        role: 'user',
        content: initialMsg,
        timestamp: new Date().toISOString(),
      });

      // Send combined message to OpenCode to trigger agent response
      // Note: We don't await this - let it happen in background
      // The socket handler will pick up the response via events
      client.session.prompt({
        path: { id: opcodeSession.data.id },
        body: {
          parts: [
            { type: 'text', text: combinedMessage }
          ],
        },
      }).catch((error) => {
        console.error('Failed to send initial message:', error);
      });
    } else {
      // No initial message - just inject system prompt
      await client.session.promptAsync({
        path: { id: opcodeSession.data.id },
        body: {
          parts: [{ type: 'text', text: systemPrompt }],
          noReply: true,
        },
      });
    }

    // Log initial activity
    db.createActivity({
      sessionId: session.id,
      type: 'thinking',
      description: `Started ${workflow.name} session`,
      timestamp: new Date().toISOString(),
      data: { inputs },
    });

    res.json({ session });
  } catch (error: any) {
    console.error('Error creating session:', error);
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
