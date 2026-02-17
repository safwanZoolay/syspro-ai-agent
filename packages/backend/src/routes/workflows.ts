import { Router } from 'express';
import { getWorkflowMetadata } from '../workflows/registry.js';

const router = Router();

// Get all available workflows
router.get('/', (req, res) => {
  try {
    const workflows = getWorkflowMetadata();
    res.json({ workflows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
