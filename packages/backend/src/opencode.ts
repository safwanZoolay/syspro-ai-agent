import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';
import type { OpencodeClient } from '@opencode-ai/sdk';
import * as os from 'os';
import * as path from 'path';

class OpencodeManager {
  private static instance: OpencodeManager;
  private client: OpencodeClient | null = null;
  private server: { url: string; close: () => void } | null = null;
  private isInitialized = false;

  private constructor() {
    // Ensure OpenCode is in PATH on Windows
    this.ensureOpenCodeInPath();
  }

  static getInstance(): OpencodeManager {
    if (!OpencodeManager.instance) {
      OpencodeManager.instance = new OpencodeManager();
    }
    return OpencodeManager.instance;
  }

  private ensureOpenCodeInPath() {
    // On Windows, npm global binaries are often in %APPDATA%\npm
    if (process.platform === 'win32') {
      const npmPath = path.join(os.homedir(), 'AppData', 'Roaming', 'npm');
      const currentPath = process.env.PATH || '';

      if (!currentPath.includes(npmPath)) {
        process.env.PATH = `${npmPath};${currentPath}`;
        console.log(`📁 Added npm global path to PATH: ${npmPath}`);
      }
    }
  }

  async initialize() {
    if (this.isInitialized && this.client) {
      return this.client;
    }

    try {
      console.log('🚀 Initializing OpenCode SDK...');

      // Check if we're running inside a Claude Code session
      const isNested = process.env.CLAUDECODE !== undefined;

      if (isNested) {
        console.log('⚠️  Detected nested Claude Code session');
        console.log('🔌 Connecting to existing Claude Code instance...');

        // Connect to existing Claude Code server (usually on port 4096)
        this.client = createOpencodeClient({
          baseUrl: process.env.CLAUDECODE || 'http://127.0.0.1:4096',
        });

        this.isInitialized = true;
        console.log(`✅ Connected to Claude Code at: ${process.env.CLAUDECODE || 'http://127.0.0.1:4096'}`);
      } else {
        // Create new OpenCode instance with server
        const { client, server } = await createOpencode({
          // Server options can be configured here if needed
        });

        this.client = client;
        this.server = server;
        this.isInitialized = true;

        console.log(`✅ OpenCode SDK initialized`);
        console.log(`🌐 OpenCode server running at: ${server.url}`);
      }

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
    return this.server?.url || process.env.CLAUDECODE || null;
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
