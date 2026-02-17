import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/hooks/useSocket';
import { fetchSession } from '@/lib/api';
import type { Session } from '@opencode-web-ui/shared';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, activities, sendMessage, isLoading, connected } = useChat(sessionId || null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadSession() {
    try {
      const data = await fetchSession(sessionId!);
      setSession(data);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleSend() {
    if (!input.trim() || isLoading) return;

    sendMessage(input);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">🤖</div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-semibold">{session.title}</h2>
              <p className="text-sm text-muted-foreground">
                {connected ? (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    Disconnected
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">🤖 Ready to help!</p>
                <p className="text-sm">Start the conversation below.</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase">
                      {message.role === 'user' ? 'You' : 'Agent'}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-muted">
                <div className="p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Agent is thinking...</span>
                </div>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-card">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message... (Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !connected}
              rows={3}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !connected || !input.trim()}
              size="icon"
              className="h-full aspect-square"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Feed Sidebar */}
      <div className="w-80 border-l bg-card overflow-y-auto">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Activity Feed</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time agent actions
          </p>
        </div>
        <div className="p-4 space-y-3">
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet
            </p>
          )}

          {activities.map((activity) => (
            <div key={activity.id} className="text-sm">
              <div className="flex items-start gap-2">
                <span className="mt-1">
                  {activity.type === 'file_read' && '📖'}
                  {activity.type === 'file_write' && '✏️'}
                  {activity.type === 'tool_use' && '🔧'}
                  {activity.type === 'mcp_call' && '⚙️'}
                  {activity.type === 'thinking' && '💭'}
                </span>
                <div className="flex-1">
                  <p>{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
