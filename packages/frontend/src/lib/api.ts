import type { Workflow, Session } from '@opencode-web-ui/shared';

const API_URL = '/api';

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
  inputs: Record<string, any>
): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workflowId, inputs }),
  });

  if (!response.ok) {
    throw new Error('Failed to create session');
  }

  const data = await response.json();
  return data.session;
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/sessions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }
}
