import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { opcodeManager } from './opencode.js';
import { db } from './db/json-store.js';
import { initializeWorkflows } from './workflows/registry.js';
import { setupSocketHandlers } from './socket/handler.js';
import workflowsRouter from './routes/workflows.js';
import sessionsRouter from './routes/sessions.js';

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function startServer() {
  console.log('🚀 Starting OpenCode Web UI Server...\n');

  // Initialize database
  db.initialize();

  // Initialize workflows
  initializeWorkflows();

  // Initialize OpenCode
  await opcodeManager.initialize();

  // Create Express app
  const app = express();
  const httpServer = createServer(app);

  // Setup Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Middleware
  app.use(cors({ origin: FRONTEND_URL }));
  app.use(express.json());

  // Routes
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/workflows', workflowsRouter);
  app.use('/api/sessions', sessionsRouter);

  // Setup Socket.IO handlers
  setupSocketHandlers(io);

  // Start server
  httpServer.listen(PORT, () => {
    console.log('\n✅ Server ready!\n');
    console.log(`📡 API Server: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
    console.log(`🤖 OpenCode Server: http://localhost:4096`);
    console.log(`\n🎨 Frontend URL: ${FRONTEND_URL}`);
    console.log('\n---\n');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');

    httpServer.close(() => {
      console.log('✓ HTTP server closed');
    });

    io.close(() => {
      console.log('✓ Socket.IO server closed');
    });

    await opcodeManager.shutdown();
    console.log('✓ OpenCode server closed');

    db.close();
    console.log('✓ Database closed');

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
