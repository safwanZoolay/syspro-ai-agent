import type { WorkflowRegistry, WorkflowHandler } from './workflow.interface.js';
import { codeReviewerWorkflow } from './code-reviewer.js';

// Registry of all available workflows
const workflows: WorkflowRegistry = new Map();

// Register workflows
function registerWorkflow(workflow: WorkflowHandler) {
  workflows.set(workflow.id, workflow);
  console.log(`✓ Registered workflow: ${workflow.name}`);
}

// Initialize all workflows
export function initializeWorkflows() {
  console.log('📋 Initializing workflows...');
  registerWorkflow(codeReviewerWorkflow);
  console.log(`✅ ${workflows.size} workflow(s) registered`);
}

export function getWorkflow(id: string): WorkflowHandler | undefined {
  return workflows.get(id);
}

export function getAllWorkflows(): WorkflowHandler[] {
  return Array.from(workflows.values());
}

export function getWorkflowMetadata() {
  return Array.from(workflows.values()).map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    icon: w.icon,
    inputs: w.inputs,
  }));
}
