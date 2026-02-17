import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/hooks/useSocket';
import { fetchSession, fetchSessions } from '@/lib/api';
import type { Session } from '@opencode-web-ui/shared';
import { ArrowLeft, Send, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [pastSessions, setPastSessions] = useState<Session[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, isLoading, connected } = useChat(sessionId || null);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      loadPastSessions();
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

  async function loadPastSessions() {
    try {
      const sessions = await fetchSessions();
      // Filter out current session and limit to 10
      setPastSessions(sessions.filter((s) => s.id !== sessionId).slice(0, 10));
    } catch (error) {
      console.error('Failed to load past sessions:', error);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <img
              src="/syspro-logo.svg"
              alt="SYSPRO"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-auto opacity-50"
            />
          </div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/50 backdrop-blur-sm bg-card/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <img
                src="/syspro-logo.svg"
                alt="SYSPRO"
                className="h-8 w-auto"
              />
              <div className="h-8 w-px bg-primary/30" />
              <div>
                <h2 className="font-semibold text-lg">{session.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {connected ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      Disconnected
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-32 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
                  <img
                    src="/syspro-logo.svg"
                    alt="SYSPRO Pulse"
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-xl font-semibold mb-2">Ready to assist!</p>
                <p className="text-muted-foreground">Start the conversation below.</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-sm'
                    : 'bg-card/70 backdrop-blur-sm border border-border/50 rounded-2xl rounded-bl-sm'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {message.role === 'user' ? 'You' : 'AI Agent'}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                    {message.metadata?.isStreaming ? (
                      // Render plain text while streaming for speed
                      <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                    ) : (
                      // Render Markdown when complete
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card/70 backdrop-blur-sm border border-border/50 rounded-2xl rounded-bl-sm">
                <div className="p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Agent is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/50 backdrop-blur-sm bg-card/50 p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message... (Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !connected}
              rows={3}
              className="flex-1 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !connected || !input.trim()}
              className="h-full aspect-square bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Past Conversations Sidebar */}
      <div className="w-80 border-l border-border/50 backdrop-blur-sm bg-card/50 overflow-y-auto">
        <div className="p-4 border-b border-border/50 sticky top-0 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Past Conversations</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your recent sessions
          </p>
        </div>
        <div className="p-3 space-y-2">
          {pastSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No past conversations
            </p>
          )}

          {pastSessions.map((pastSession) => (
            <button
              key={pastSession.id}
              onClick={() => navigate(`/chat/${pastSession.id}`)}
              className="w-full text-left p-3 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all group"
            >
              <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {pastSession.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(pastSession.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
