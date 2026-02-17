# OpenCode Web UI

A beautiful web interface for interacting with OpenCode AI agents. Built for teams to easily leverage AI-powered workflows without needing technical expertise.

## 🚀 Features

- **🎨 Intuitive Web Interface** - Chat-based UI similar to CLI but easier for non-technical users
- **🔄 Real-time Streaming** - See agent actions and responses as they happen
- **⚙️ Workflow System** - Pre-configured workflows with guided inputs
- **📊 Activity Feed** - Transparent view of agent actions, file operations, and tool calls
- **💾 Session Persistence** - Resume conversations and review history
- **🔧 Extensible** - Easily add custom workflows and skills

## 📋 Architecture

```
┌─────────────────┐
│   React UI      │ ← User interacts here
└────────┬────────┘
         │ WebSocket/REST API
┌────────┴────────┐
│  Express API    │ ← Orchestration layer
└────────┬────────┘
         │ @opencode-ai/sdk
┌────────┴────────┐
│ OpenCode Server │ ← AI agent runtime
│  + Your Skills  │
└────────┬────────┘
         │
┌────────┴────────┐
│ File System     │ ← Scoped folders
└─────────────────┘
```

## 🏗️ Project Structure

```
opencode-web-ui/
├── packages/
│   ├── backend/          # Express + OpenCode SDK + Socket.io
│   ├── frontend/         # React + Vite + Tailwind + shadcn/ui
│   └── shared/           # Shared TypeScript types
├── config/               # Configuration files
├── skills/               # Custom OpenCode skills
└── package.json          # Monorepo root
```

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (fast dev server & build)
- Tailwind CSS + shadcn/ui components
- Socket.io Client (real-time communication)
- React Markdown (code block rendering)

**Backend:**
- Node.js + Express + TypeScript
- OpenCode SDK (@opencode-ai/sdk)
- Socket.io (WebSocket server)
- SQLite (better-sqlite3)

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- OpenCode CLI installed and configured

### Setup

1. **Install dependencies**

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

2. **Configure allowed paths** (optional)

Edit `config/allowed-paths.json` to whitelist directories your workflows can access:

```json
{
  "allowedPaths": [
    "/path/to/your/projects",
    "/home/user/workspace"
  ]
}
```

## 🚀 Running the Application

### Development Mode

**Option 1: Run everything together**

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) concurrently.

**Option 2: Run separately**

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **OpenCode Server:** http://localhost:4096

## 📝 Adding Custom Workflows

### 1. Create a Workflow File

Create a new file in `packages/backend/src/workflows/`:

```typescript
// my-workflow.ts
import type { WorkflowHandler } from './workflow.interface.js';

export const myWorkflow: WorkflowHandler = {
  id: 'my-workflow',
  name: 'My Custom Workflow',
  description: 'Description of what this workflow does',
  icon: '🎯',

  inputs: [
    {
      name: 'inputField',
      label: 'Input Field Label',
      type: 'text',
      required: true,
      placeholder: 'Enter something...',
    },
  ],

  buildSystemPrompt: (inputs) => {
    return `You are doing XYZ task.

    User input: ${inputs.inputField}

    Use the my-custom-skill to accomplish this.`;
  },

  skillName: 'my-custom-skill',

  allowedPaths: ['/home/user/projects'],
};
```

### 2. Register the Workflow

Edit `packages/backend/src/workflows/registry.ts`:

```typescript
import { myWorkflow } from './my-workflow.js';

export function initializeWorkflows() {
  console.log('📋 Initializing workflows...');
  registerWorkflow(codeReviewerWorkflow);
  registerWorkflow(myWorkflow); // Add this line
  console.log(`✅ ${workflows.size} workflow(s) registered`);
}
```

### 3. Restart the Backend

```bash
npm run dev:backend
```

Your workflow will now appear on the home screen!

## 🎯 Built-in Workflows

### Code Reviewer

Reviews code files or directories with AI-powered analysis.

**Inputs:**
- File/Directory Path (required)
- Review Focus (optional): General, Security, Performance, Code Quality, Best Practices
- Additional Context (optional)

**What it does:**
1. Reads the specified files
2. Analyzes code quality, security, performance
3. Provides detailed feedback and suggestions
4. Interactive Q&A for clarifications

## 🔧 Configuration

### Backend Environment Variables

Create `packages/backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment Variables

Create `packages/frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

## 📊 Database

SQLite database is automatically created at `packages/backend/data/opencode.db`

**Tables:**
- `sessions` - Workflow sessions
- `messages` - Chat messages
- `session_activity` - Agent activity log

## 🐛 Troubleshooting

### OpenCode server fails to start

Make sure OpenCode is installed and configured:

```bash
npm install -g @opencode-ai/cli
opencode --version
```

### Port conflicts

Change ports in:
- Backend: `packages/backend/src/server.ts` (PORT variable)
- Frontend: `packages/frontend/vite.config.ts` (server.port)
- OpenCode: `packages/backend/src/opencode.ts` (port config)

### WebSocket connection fails

- Ensure backend is running on port 3001
- Check CORS settings in `packages/backend/src/server.ts`
- Verify frontend connects to correct URL in `packages/frontend/src/hooks/useSocket.ts`

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

Builds:
- Backend: `packages/backend/dist/`
- Frontend: `packages/frontend/dist/`

### Run Production Build

```bash
# Backend
cd packages/backend
npm start

# Frontend (serve with any static server)
cd packages/frontend
npx serve -s dist
```

### Docker (coming soon)

A Dockerfile will be provided for easy containerized deployment.

## 🤝 Contributing

Feel free to add new workflows, improve the UI, or enhance features!

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- [OpenCode SDK](https://opencode.ai/docs/sdk/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Socket.io](https://socket.io/)
