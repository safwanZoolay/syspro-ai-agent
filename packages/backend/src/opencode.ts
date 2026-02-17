import { createOpencode } from '@opencode-ai/sdk';
import type { Opencode } from '@opencode-ai/sdk';

class OpencodeManager {
  private static instance: OpencodeManager;
  private opencode: Opencode | null = null;
  private isInitialized = false;

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

    console.log('🚀 Initializing OpenCode server...');

    try {
      this.opencode = await createOpencode({
        port: 4096,
        timeout: 10000,
        config: {
          model: 'anthropic/claude-3-5-sonnet-20241022',
        },
      });

      this.isInitialized = true;
      console.log('✅ OpenCode server initialized on port 4096');

      return this.opencode;
    } catch (error) {
      console.error('❌ Failed to initialize OpenCode server:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.isInitialized || !this.opencode) {
      throw new Error('OpenCode not initialized. Call initialize() first.');
    }
    return this.opencode.client;
  }

  async shutdown() {
    if (this.opencode) {
      console.log('🛑 Shutting down OpenCode server...');
      // OpenCode SDK handles cleanup automatically
      this.opencode = null;
      this.isInitialized = false;
    }
  }
}

export const opcodeManager = OpencodeManager.getInstance();
