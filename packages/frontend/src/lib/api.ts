import type { Workflow, Session } from '@opencode-web-ui/shared';

const API_URL = '/api';

export interface Model {
  id: string;
  name: string;
  provider: string;
  quotaExhausted?: boolean;
  retryAfter?: number;
  quotaMessage?: string;
}

export async function fetchModels(): Promise<Model[]> {
  const response = await fetch(`${API_URL}/models`);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  const data = await response.json();
  return data.models;
}

export async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await fetch(`${API_URL}/workflows`);
  if (!response.ok) {
    throw new Error('Failed to fetch workflows');
  }
  const data = await response.json();
  return data.workflows;
}

export async function fetchSessions(): Promise<Session[]> {
  const response = await fetch(`${API_URL}/sessions`);
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  const data = await response.json();
  return data.sessions;
}

export async function fetchSession(id: string): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  const data = await response.json();
  return data.session;
}

export async function createSession(
  workflowId: string,
  inputs: Record<string, any>,
  customTitle?: string,
  model?: string
): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workflowId, inputs, customTitle, model }),
  });

  if (!response.ok) {
    throw new Error('Failed to create session');
  }

  const data = await response.json();
  return data.session;
}

export async function sendChatMessage(
  sessionId: string,
  content: string
): Promise<void> {
  // This function is used for sending messages via REST API
  // The actual implementation will use Socket.IO in the chat component
  // This is just for initial auto-messages
  const response = await fetch(`${API_URL}/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/sessions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}
