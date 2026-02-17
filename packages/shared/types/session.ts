export interface Session {
  id: string;
  workflowId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'error';
  metadata?: Record<string, any>;
}

export interface SessionActivity {
  id: string;
  sessionId: string;
  type: 'file_read' | 'file_write' | 'tool_use' | 'mcp_call' | 'thinking';
  description: string;
  timestamp: string;
  data?: any;
}
