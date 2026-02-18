import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchWorkflows, createSession } from '@/lib/api';
import type { Workflow } from '@opencode-web-ui/shared';
import { ArrowLeft, Sparkles } from 'lucide-react';

export function WorkflowStart() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [model, setModel] = useState<string>('claude-sonnet-4-5');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkflow();
  }, [workflowId]);

  async function loadWorkflow() {
    try {
      const workflows = await fetchWorkflows();
      const found = workflows.find((w) => w.id === workflowId);
      if (found) {
        setWorkflow(found);
        // Initialize inputs with empty values
        const initialInputs: Record<string, any> = {};
        found.inputs?.forEach((input) => {
          initialInputs[input.name] = '';
        });
        setInputs(initialInputs);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  }

  async function handleStart() {
    if (!workflow) return;

    // Validate required inputs
    const missingRequired = workflow.inputs?.filter(
      (input) => input.required && !inputs[input.name]?.trim()
    );

    if (missingRequired && missingRequired.length > 0) {
      alert(`Please fill in all required fields: ${missingRequired.map((i) => i.label).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      // Build custom title based on workflow
      let customTitle: string | undefined;
      if (workflow.id === 'code-reviewer' && inputs.businessObject) {
        customTitle = `Code review - ${inputs.businessObject}`;
      } else if (workflow.id === 'code-coverage-hunter' && inputs.businessObject) {
        customTitle = `Coverage Hunter - ${inputs.businessObject}`;
      }

      const session = await createSession(workflow.id, inputs, customTitle, model);
      navigate(`/chat/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!workflow) {
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
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-5xl">{workflow.icon}</span>
              <div>
                <CardTitle className="text-2xl">{workflow.name}</CardTitle>
                <CardDescription className="mt-2">{workflow.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Model Selector */}
            <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <label className="text-sm font-semibold">Claude Model</label>
              </div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="claude-sonnet-4-5">Claude 4.5 Sonnet (Recommended - Balanced)</option>
                <option value="claude-opus-4-6">Claude 4.6 Opus (Most Powerful)</option>
                <option value="claude-haiku-4-5">Claude 4.5 Haiku (Fastest & Cheapest)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Choose the model based on your needs: Opus for complex tasks, Sonnet for balance, Haiku for speed
              </p>
            </div>

            {workflow.inputs && workflow.inputs.length > 0 ? (
              <div className="space-y-4">
                {workflow.inputs.map((input) => (
                  <div key={input.name}>
                    <label className="block text-sm font-medium mb-2">
                      {input.label}
                      {input.required && <span className="text-destructive ml-1">*</span>}
                    </label>

                    {input.type === 'text' && (
                      <Input
                        placeholder={input.placeholder}
                        value={inputs[input.name] || ''}
                        onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                      />
                    )}

                    {input.type === 'password' && (
                      <Input
                        type="password"
                        placeholder={input.placeholder}
                        value={inputs[input.name] || ''}
                        onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                      />
                    )}

                    {input.type === 'textarea' && (
                      <Textarea
                        placeholder={input.placeholder}
                        value={inputs[input.name] || ''}
                        onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                        rows={4}
                      />
                    )}

                    {input.type === 'select' && input.options && (
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={inputs[input.name] || ''}
                        onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                      >
                        <option value="">{input.placeholder || 'Select an option'}</option>
                        {input.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}

                    {input.helpText && (
                      <p className="text-xs text-muted-foreground mt-1">{input.helpText}</p>
                    )}
                  </div>
                ))}

                <Button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full mt-6"
                  size="lg"
                >
                  {loading ? 'Starting...' : 'Start Session'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No configuration needed</p>
                <Button onClick={handleStart} disabled={loading} size="lg">
                  {loading ? 'Starting...' : 'Start Session'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
