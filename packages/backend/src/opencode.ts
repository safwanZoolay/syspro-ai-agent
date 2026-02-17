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

      console.log(`🔍 Platform: ${process.platform}`);
      console.log(`🔍 Home dir: ${os.homedir()}`);
      console.log(`🔍 npm path: ${npmPath}`);
      console.log(`🔍 Current PATH includes npm path: ${currentPath.includes(npmPath)}`);

      if (!currentPath.includes(npmPath)) {
        process.env.PATH = `${npmPath};${currentPath}`;
        console.log(`📁 Added npm global path to PATH: ${npmPath}`);
      } else {
        console.log(`✓ npm path already in PATH`);
      }

      console.log(`🔍 Final PATH: ${process.env.PATH?.substring(0, 200)}...`);
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

      // On Windows, spawn has issues with .cmd files, so try client mode first
      const isWindows = process.platform === 'win32';
      const tryClientMode = isNested || (isWindows && process.env.OPENCODE_SERVER_URL);

      if (tryClientMode) {
        const reason = isNested ? 'nested session' : 'Windows client mode';
        console.log(`⚠️  Detected ${reason}`);
        console.log('🔌 Connecting to existing OpenCode instance...');

        const serverUrl = process.env.OPENCODE_SERVER_URL || process.env.CLAUDECODE || 'http://127.0.0.1:4096';

        // Connect to existing OpenCode server
        this.client = createOpencodeClient({
          baseUrl: serverUrl,
        });

        this.isInitialized = true;
        console.log(`✅ Connected to OpenCode at: ${serverUrl}`);

        if (isWindows && !process.env.OPENCODE_SERVER_URL) {
          console.log('\n💡 Tip: Start OpenCode server manually with:');
          console.log('   opencode serve --hostname=127.0.0.1 --port=4096');
          console.log('   Or set OPENCODE_SERVER_URL environment variable\n');
        }
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

      // On Windows, provide helpful error message
      if (process.platform === 'win32' && error.code === 'ENOENT') {
        console.log('\n💡 Workaround for Windows:');
        console.log('1. Open a separate terminal');
        console.log('2. Run: opencode serve --hostname=127.0.0.1 --port=4096');
        console.log('3. Set environment variable: set OPENCODE_SERVER_URL=http://127.0.0.1:4096');
        console.log('4. Restart this server\n');
      }

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
