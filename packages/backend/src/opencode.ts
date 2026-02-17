import { createOpencode } from '@opencode-ai/sdk';
import type { OpencodeClient } from '@opencode-ai/sdk';

class OpencodeManager {
  private static instance: OpencodeManager;
  private client: OpencodeClient | null = null;
  private server: { url: string; close: () => void } | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): OpencodeManager {
    if (!OpencodeManager.instance) {
      OpencodeManager.instance = new OpencodeManager();
    }
    return OpencodeManager.instance;
  }

  async initialize() {
    if (this.isInitialized && this.client) {
      return this.client;
    }

    try {
      console.log('🚀 Initializing OpenCode SDK...');

      // Create OpenCode instance with server
      const { client, server } = await createOpencode({
        // Server options can be configured here if needed
      });

      this.client = client;
      this.server = server;
      this.isInitialized = true;

      console.log(`✅ OpenCode SDK initialized`);
      console.log(`🌐 OpenCode server running at: ${server.url}`);

      return this.client;
    } catch (error: any) {
      console.error('❌ Failed to initialize OpenCode SDK:', error);
      throw new Error(`OpenCode initialization failed: ${error.message}`);
    }
  }

  getClient(): OpencodeClient {
    if (!this.isInitialized || !this.client) {
      throw new Error('OpenCode not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getServerUrl(): string | null {
    return this.server?.url || null;
  }

  async shutdown() {
    if (this.server) {
      console.log('🛑 Shutting down OpenCode server...');
      this.server.close();
      this.server = null;
    }

    this.client = null;
    this.isInitialized = false;
    console.log('✅ OpenCode shutdown complete');
  }
}

export const opcodeManager = OpencodeManager.getInstance();
