// Claude Code Bridge — Phase 2
// Handles Claude Code CLI-specific integration:
// - Launching claude with --resume and context flags
// - Detecting Claude Code installation
// - Passing task context to the agent

import * as vscode from 'vscode';
import { log } from '../utils/logger';

export class ClaudeCodeBridge {
  async isInstalled(): Promise<boolean> {
    // TODO: Check if `claude` CLI is available in PATH
    log('[AI] Checking Claude Code installation');
    return false;
  }

  async launch(
    worktreePath: string,
    options?: { resume?: boolean; prompt?: string }
  ): Promise<vscode.Terminal> {
    log(`[AI] Launching Claude Code in ${worktreePath}`);

    const args = [];
    if (options?.resume) {
      args.push('--resume');
    }

    const terminal = vscode.window.createTerminal({
      name: `Claude Code: ${worktreePath}`,
      cwd: worktreePath,
    });

    // TODO: Build the full command with context injection
    const cmd = ['claude', ...args].join(' ');
    terminal.sendText(cmd);
    terminal.show();

    return terminal;
  }
}
