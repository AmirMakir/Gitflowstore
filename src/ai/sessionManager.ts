// AI Session Manager — Phase 2
// Manages AI agent sessions (Claude Code, Aider) per worktree.
// Each worktree can have one active AI session.

import * as vscode from 'vscode';
import { log } from '../utils/logger';

export interface AiSession {
  worktreePath: string;
  agentType: 'claude-code' | 'aider' | 'copilot-cli';
  status: 'running' | 'paused' | 'stopped';
  terminal?: vscode.Terminal;
}

export class SessionManager implements vscode.Disposable {
  private sessions = new Map<string, AiSession>();

  async startSession(
    worktreePath: string,
    agentType: AiSession['agentType']
  ): Promise<AiSession> {
    log(`[AI] Starting ${agentType} session for ${worktreePath}`);

    // TODO: Implement agent-specific launch logic
    // - Claude Code: spawn `claude` CLI in terminal
    // - Aider: spawn `aider` in terminal
    // - Set up session tracking and event listeners

    const session: AiSession = {
      worktreePath,
      agentType,
      status: 'running',
    };

    this.sessions.set(worktreePath, session);
    return session;
  }

  async stopSession(worktreePath: string): Promise<void> {
    const session = this.sessions.get(worktreePath);
    if (session) {
      log(`[AI] Stopping session for ${worktreePath}`);
      session.terminal?.dispose();
      session.status = 'stopped';
      this.sessions.delete(worktreePath);
    }
  }

  getSession(worktreePath: string): AiSession | undefined {
    return this.sessions.get(worktreePath);
  }

  getAllSessions(): AiSession[] {
    return Array.from(this.sessions.values());
  }

  dispose(): void {
    for (const session of this.sessions.values()) {
      session.terminal?.dispose();
    }
    this.sessions.clear();
  }
}
