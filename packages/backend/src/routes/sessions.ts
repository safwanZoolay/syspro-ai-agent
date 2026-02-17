import { Router } from 'express';
import { db } from '../db/sqlite.js';
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
    const { workflowId, inputs } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'workflowId is required' });
    }

    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create OpenCode session
    const client = opcodeManager.getClient();
    const opcodeSession = await client.session.create({
      body: {
        title: `${workflow.name} - ${new Date().toLocaleString()}`,
      },
    });

    // Build and inject system prompt
    const systemPrompt = workflow.buildSystemPrompt(inputs || {});
    await client.session.prompt({
      path: { id: opcodeSession.data.id },
      body: {
        parts: [{ type: 'text', text: systemPrompt }],
        noReply: true, // Don't trigger agent response yet
      },
    });

    // Create session in our database
    const session = db.createSession({
      workflowId,
      title: workflow.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      metadata: {
        opcodeSessionId: opcodeSession.data.id,
        inputs,
      },
    });

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
