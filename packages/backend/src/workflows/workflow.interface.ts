import type { Workflow } from '@opencode-web-ui/shared';

export interface WorkflowHandler extends Workflow {
  // Build the system prompt to inject into OpenCode session
  buildSystemPrompt: (inputs: Record<string, any>) => string;

  // Optional: Build an initial message to send after system prompt
  // If provided, this message will be sent automatically to trigger the agent
  initialMessage?: (inputs: Record<string, any>) => string;
}

export type WorkflowRegistry = Map<string, WorkflowHandler>;
