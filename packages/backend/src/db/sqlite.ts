import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Session, SessionActivity, Message } from '@opencode-web-ui/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/opencode.db');

class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  initialize() {
    console.log('💾 Initializing SQLite database...');

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    import('fs').then((fs) => {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    });

    this.db = new Database(DB_PATH);
    this.createTables();
    console.log('✅ Database initialized');
  }

  private createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata TEXT
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )
    `);

    // Session activity table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_activity (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        data TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_session
        ON messages(session_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_activity_session
        ON session_activity(session_id, timestamp);
    `);
  }

  // Session operations
  createSession(session: Omit<Session, 'id'>): Session {
    if (!this.db) throw new Error('Database not initialized');

    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newSession: Session = { id, ...session };

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, workflow_id, title, created_at, updated_at, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newSession.id,
      newSession.workflowId,
      newSession.title,
      newSession.createdAt,
      newSession.updatedAt,
      newSession.status,
      JSON.stringify(newSession.metadata || {})
    );

    return newSession;
  }

  getSession(id: string): Session | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      workflowId: row.workflow_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  getAllSessions(): Session[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      id: row.id,
      workflowId: row.workflow_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  updateSession(id: string, updates: Partial<Session>) {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.metadata) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE sessions SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  deleteSession(id: string) {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(id);
  }

  // Message operations
  createMessage(message: Omit<Message, 'id'>): Message {
    if (!this.db) throw new Error('Database not initialized');

    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newMessage: Message = { id, ...message };

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newMessage.id,
      newMessage.sessionId,
      newMessage.role,
      newMessage.content,
      newMessage.timestamp,
      JSON.stringify(newMessage.metadata || {})
    );

    return newMessage;
  }

  getMessages(sessionId: string): Message[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC
    `);
    const rows = stmt.all(sessionId) as any[];

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  // Activity operations
  createActivity(activity: Omit<SessionActivity, 'id'>): SessionActivity {
    if (!this.db) throw new Error('Database not initialized');

    const id = `activity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newActivity: SessionActivity = { id, ...activity };

    const stmt = this.db.prepare(`
      INSERT INTO session_activity (id, session_id, type, description, timestamp, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      newActivity.id,
      newActivity.sessionId,
      newActivity.type,
      newActivity.description,
      newActivity.timestamp,
      JSON.stringify(newActivity.data || {})
    );

    return newActivity;
  }

  getActivities(sessionId: string): SessionActivity[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM session_activity WHERE session_id = ? ORDER BY timestamp ASC
    `);
    const rows = stmt.all(sessionId) as any[];

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      type: row.type,
      description: row.description,
      timestamp: row.timestamp,
      data: JSON.parse(row.data || '{}'),
    }));
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const db = DatabaseManager.getInstance();
