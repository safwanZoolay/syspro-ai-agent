import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchWorkflows, createSession } from '@/lib/api';
import type { Workflow } from '@opencode-web-ui/shared';
import { ArrowLeft } from 'lucide-react';

export function WorkflowStart() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
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
      const session = await createSession(workflow.id, inputs);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl mb-2">🤖</div>
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
