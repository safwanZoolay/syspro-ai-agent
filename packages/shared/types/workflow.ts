export interface WorkflowInput {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Pre-chat form inputs (optional)
  inputs?: WorkflowInput[];

  // Which OpenCode skill to use
  skillName: string;

  // Scoped file paths for this workflow
  allowedPaths?: string[];
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  sessionId: string;
  inputs: Record<string, any>;
  createdAt: string;
}
