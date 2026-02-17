import type { Workflow } from '@opencode-web-ui/shared';

export interface WorkflowHandler extends Workflow {
  // Build the system prompt to inject into OpenCode session
  buildSystemPrompt: (inputs: Record<string, any>) => string;
}

export type WorkflowRegistry = Map<string, WorkflowHandler>;
