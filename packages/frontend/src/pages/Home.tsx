import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWorkflows, fetchSessions, deleteSession } from '@/lib/api';
import type { Workflow, Session } from '@opencode-web-ui/shared';
import { Trash2 } from 'lucide-react';

export function Home() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [workflowsData, sessionsData] = await Promise.all([
        fetchWorkflows(),
        fetchSessions(),
      ]);
      setWorkflows(workflowsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">🤖</div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">OpenCode Web UI</h1>
          <p className="text-muted-foreground">
            AI-powered workflows for your team
          </p>
        </div>

        {/* Workflows Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Start a New Workflow</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/workflow/${workflow.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{workflow.icon}</span>
                    <CardTitle className="text-xl">{workflow.name}</CardTitle>
                  </div>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.map((session) => {
                const workflow = workflows.find((w) => w.id === session.workflowId);
                return (
                  <Card key={session.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => navigate(`/chat/${session.id}`)}
                      >
                        <span className="text-2xl">{workflow?.icon || '💬'}</span>
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
