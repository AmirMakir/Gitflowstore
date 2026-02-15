import * as vscode from 'vscode';
import type { GitService } from './gitService';
import { ConfigManager } from '../utils/config';
import { copyFiles, createSymlinks } from '../utils/fileOps';
import { log, logError } from '../utils/logger';

interface PipelineStep {
  name: string;
  execute: (worktreePath: string, mainWorktreePath: string) => Promise<void>;
}

export class SetupPipeline {
  constructor(
    private config: ConfigManager,
    private gitService: GitService
  ) {}

  async run(
    worktreePath: string,
    options: { copyEnvFiles: boolean; installDeps: boolean }
  ): Promise<void> {
    const steps = this.buildSteps(options);
    if (steps.length === 0) {
      return;
    }

    // Resolve the main worktree path at runtime so it's always correct,
    // even when VS Code is opened inside a secondary worktree.
    const mainWorktreePath = await this.resolveMainWorktreePath();

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'GitFlow Store: Setting up worktree...',
        cancellable: true,
      },
      async (progress, token) => {
        for (let i = 0; i < steps.length; i++) {
          if (token.isCancellationRequested) {
            log('Setup pipeline cancelled by user');
            break;
          }

          progress.report({
            message: steps[i].name,
            increment: 100 / steps.length,
          });

          try {
            await steps[i].execute(worktreePath, mainWorktreePath);
            log(`Setup step completed: ${steps[i].name}`);
          } catch (err) {
            logError(`Setup step failed: ${steps[i].name}`, err);
            const action = await vscode.window.showWarningMessage(
              `Setup step "${steps[i].name}" failed: ${err instanceof Error ? err.message : err}`,
              'Continue',
              'Abort'
            );
            if (action === 'Abort') {
              break;
            }
          }
        }
      }
    );
  }

  private async resolveMainWorktreePath(): Promise<string> {
    const worktrees = await this.gitService.listWorktrees();
    // The first entry in `git worktree list` is always the main worktree
    return worktrees[0].path;
  }

  private buildSteps(options: {
    copyEnvFiles: boolean;
    installDeps: boolean;
  }): PipelineStep[] {
    const steps: PipelineStep[] = [];

    if (options.copyEnvFiles) {
      const filesToCopy = this.config.get<string[]>('autoSetup.copyFiles', [
        '.env',
        '.env.local',
      ]);
      if (filesToCopy.length > 0) {
        steps.push({
          name: `Copying ${filesToCopy.join(', ')}`,
          execute: async (wt, main) => copyFiles(main, wt, filesToCopy),
        });
      }
    }

    const symlinkDirs = this.config.get<string[]>('autoSetup.symlinkDirs', []);
    if (symlinkDirs.length > 0) {
      steps.push({
        name: `Creating symlinks: ${symlinkDirs.join(', ')}`,
        execute: async (wt, main) => createSymlinks(main, wt, symlinkDirs),
      });
    }

    if (options.installDeps) {
      const postCommands = this.config.get<string[]>(
        'autoSetup.postCreateCommands',
        []
      );
      for (const cmd of postCommands) {
        steps.push({
          name: `Running: ${cmd}`,
          execute: async (wt) => {
            const terminal = vscode.window.createTerminal({
              name: `GitFlow Setup: ${cmd}`,
              cwd: wt,
            });
            terminal.sendText(cmd);
            terminal.show();
          },
        });
      }
    }

    return steps;
  }
}
