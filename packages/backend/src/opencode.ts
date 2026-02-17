// Stub implementation for OpenCode - can be replaced with real SDK later
interface OpencodeSession {
  data: {
    id: string;
    title?: string;
  };
}

interface OpencodePromptResponse {
  data: {
    parts?: Array<{ type: string; text: string }>;
    content?: string;
  };
}

interface OpencodeClient {
  session: {
    create: (params: { body: { title: string } }) => Promise<OpencodeSession>;
    prompt: (params: {
      path: { id: string };
      body: {
        parts: Array<{ type: string; text: string }>;
        noReply?: boolean;
      };
    }) => Promise<OpencodePromptResponse>;
    delete: (params: { path: { id: string } }) => Promise<void>;
  };
}

interface Opencode {
  client: OpencodeClient;
}

class OpencodeManager {
  private static instance: OpencodeManager;
  private opencode: Opencode | null = null;
  private isInitialized = false;
  private sessionCounter = 0;

  private constructor() {}

  static getInstance(): OpencodeManager {
    if (!OpencodeManager.instance) {
      OpencodeManager.instance = new OpencodeManager();
    }
    return OpencodeManager.instance;
  }

  async initialize() {
    if (this.isInitialized) {
      return this.opencode!;
    }

    console.log('⚠️  OpenCode integration is stubbed (install @opencode-ai/sdk for full functionality)');

    // Create a stub opencode instance with mock client methods
    this.opencode = {
      client: {
        session: {
          create: async (params) => {
            this.sessionCounter++;
            return {
              data: {
                id: `stub_session_${this.sessionCounter}`,
                title: params.body.title,
              },
            };
          },
          prompt: async (params) => {
            // Mock response
            const userPrompt = params.body.parts[0]?.text || '';
            return {
              data: {
                parts: [
                  {
                    type: 'text',
                    text: `[OpenCode Stub] This is a mock response. OpenCode SDK is not installed.\n\nYour message was: "${userPrompt}"\n\nTo enable full AI functionality, install @opencode-ai/sdk.`,
                  },
                ],
              },
            };
          },
          delete: async (params) => {
            console.log(`[Stub] Deleted session: ${params.path.id}`);
          },
        },
      },
    };

    this.isInitialized = true;
    console.log('✅ OpenCode stub initialized');

    return this.opencode;
  }

  getClient() {
    if (!this.isInitialized || !this.opencode) {
      throw new Error('OpenCode not initialized. Call initialize() first.');
    }
    return this.opencode.client;
  }

  async shutdown() {
    if (this.opencode) {
      console.log('🛑 Shutting down OpenCode stub...');
      this.opencode = null;
      this.isInitialized = false;
    }
  }
}

export const opcodeManager = OpencodeManager.getInstance();
