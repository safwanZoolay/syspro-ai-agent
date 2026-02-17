import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Session, SessionActivity, Message } from '@opencode-web-ui/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

interface DataStore {
  sessions: Session[];
  messages: Message[];
  activities: SessionActivity[];
}

class JSONDatabaseManager {
  private static instance: JSONDatabaseManager;
  private data: DataStore = {
    sessions: [],
    messages: [],
    activities: [],
  };

  private constructor() {}

  static getInstance(): JSONDatabaseManager {
    if (!JSONDatabaseManager.instance) {
      JSONDatabaseManager.instance = new JSONDatabaseManager();
    }
    return JSONDatabaseManager.instance;
  }

  initialize() {
    console.log('💾 Initializing JSON file storage...');

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Load existing data
    this.loadData();
    console.log('✅ JSON storage initialized');
  }

  private loadData() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        this.data.sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      }
      if (fs.existsSync(MESSAGES_FILE)) {
        this.data.messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
      }
      if (fs.existsSync(ACTIVITIES_FILE)) {
        this.data.activities = JSON.parse(fs.readFileSync(ACTIVITIES_FILE, 'utf-8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not load existing data, starting fresh');
    }
  }

  private saveSessions() {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(this.data.sessions, null, 2));
  }

  private saveMessages() {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(this.data.messages, null, 2));
  }

  private saveActivities() {
    fs.writeFileSync(ACTIVITIES_FILE, JSON.stringify(this.data.activities, null, 2));
  }

  // Session operations
  createSession(session: Omit<Session, 'id'>): Session {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newSession: Session = { id, ...session };
    this.data.sessions.push(newSession);
    this.saveSessions();
    return newSession;
  }

  getSession(id: string): Session | null {
    return this.data.sessions.find((s) => s.id === id) || null;
  }

  getAllSessions(): Session[] {
    return [...this.data.sessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  updateSession(id: string, updates: Partial<Session>) {
    const index = this.data.sessions.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.data.sessions[index] = {
        ...this.data.sessions[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveSessions();
    }
  }

  deleteSession(id: string) {
    this.data.sessions = this.data.sessions.filter((s) => s.id !== id);
    this.data.messages = this.data.messages.filter((m) => m.sessionId !== id);
    this.data.activities = this.data.activities.filter((a) => a.sessionId !== id);
    this.saveSessions();
    this.saveMessages();
    this.saveActivities();
  }

  // Message operations
  createMessage(message: Omit<Message, 'id'>): Message {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newMessage: Message = { id, ...message };
    this.data.messages.push(newMessage);
    this.saveMessages();
    return newMessage;
  }

  getMessages(sessionId: string): Message[] {
    return this.data.messages
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Activity operations
  createActivity(activity: Omit<SessionActivity, 'id'>): SessionActivity {
    const id = `activity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newActivity: SessionActivity = { id, ...activity };
    this.data.activities.push(newActivity);
    this.saveActivities();
    return newActivity;
  }

  getActivities(sessionId: string): SessionActivity[] {
    return this.data.activities
      .filter((a) => a.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  close() {
    console.log('💾 Closing JSON storage (data already saved)');
  }
}

export const db = JSONDatabaseManager.getInstance();
