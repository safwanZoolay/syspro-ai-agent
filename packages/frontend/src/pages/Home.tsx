import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchWorkflows, fetchSessions, deleteSession } from '@/lib/api';
import type { Workflow, Session } from '@opencode-web-ui/shared';
import { Trash2, Sparkles, Clock, TrendingUp } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 blur-3xl" />
        <div className="relative">
          <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <img
                    src="/syspro-logo.svg"
                    alt="SYSPRO"
                    className="h-12 w-auto"
                  />
                  <div className="h-12 w-px bg-primary/30" />
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Pulse
                  </h1>
                </div>
                <p className="text-lg text-muted-foreground ml-1">
                  Real-time AI workflow automation
                </p>
              </div>

              {/* Stats */}
              <div className="hidden md:flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{workflows.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Workflows</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">{sessions.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-12 max-w-7xl">
        {/* Workflows Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">Start a New Workflow</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <Card
                key={workflow.id}
                className="group cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 bg-card/50 backdrop-blur-sm"
                onClick={() => navigate(`/workflow/${workflow.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      {workflow.icon}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {workflow.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {workflow.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-semibold">Recent Sessions</h2>
            </div>
            <div className="space-y-3">
              {sessions.map((session) => {
                const workflow = workflows.find((w) => w.id === session.workflowId);
                return (
                  <Card
                    key={session.id}
                    className="group hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card/50 backdrop-blur-sm"
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => navigate(`/chat/${session.id}`)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                          {workflow?.icon || '💬'}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold group-hover:text-primary transition-colors">
                            {session.title}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(session.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
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
