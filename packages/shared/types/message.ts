export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: {
    thinking?: boolean;
    toolUse?: string;
    error?: string;
    isStreaming?: boolean;
  };
}

export interface StreamEvent {
  type: 'token' | 'tool_use' | 'tool_result' | 'complete' | 'error';
  data: any;
  timestamp: string;
}
