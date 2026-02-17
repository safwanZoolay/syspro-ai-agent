// Stub implementation for OpenCode - can be replaced with real SDK later
interface OpencodeClient {
  // Add client methods as needed
}

interface Opencode {
  client: OpencodeClient;
}

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

    console.log('⚠️  OpenCode integration is stubbed (install @opencode-ai/sdk for full functionality)');

    // Create a stub opencode instance
    this.opencode = {
      client: {} as OpencodeClient,
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
