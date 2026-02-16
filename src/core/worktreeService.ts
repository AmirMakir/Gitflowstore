import * as vscode from 'vscode';
import * as path from 'path';
import { GitService } from './gitService';
import { ConfigManager } from '../utils/config';
import { logError } from '../utils/logger';
import type { WorktreeCard, WorktreeInfo, CommitInfo, WorktreeStatusInfo } from '../shared/types';

export class WorktreeService implements vscode.Disposable {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private cache: WorktreeCard[] = [];
  private refreshPromise: Promise<WorktreeCard[]> | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private git: GitService,
    private config: ConfigManager
  ) {
    this.disposables.push(this._onDidChange);
  }

  async getAll(forceRefresh = false): Promise<WorktreeCard[]> {
    if (this.cache.length > 0 && !forceRefresh) {
      return this.cache;
    }
    return this.refresh();
  }

  async refresh(): Promise<WorktreeCard[]> {
    // If a refresh is already in progress, return the same promise
    // so all concurrent callers get the fresh result
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<WorktreeCard[]> {
    try {
      const worktrees = await this.git.listWorktrees();
      let repoRoot: string;
      try {
        repoRoot = await this.git.getRepoRoot();
      } catch {
        repoRoot = worktrees[0]?.path ?? '';
      }

      // Find the main branch to check merged status against
      const mainBranch = await this.detectMainBranch(worktrees);

      // Check each non-main branch individually using merge-base --is-ancestor
      const mainWt = worktrees.find((wt) => wt.branchShort === mainBranch);
      const mainHead = mainWt?.head;
      const mergedSet = new Set<string>();
      await Promise.all(
        worktrees
          .filter((wt) => wt.branchShort && wt.branchShort !== mainBranch)
          .map(async (wt) => {
            // Skip branches pointing to the same commit as main —
            // they were just created from main, not actually merged.
            if (mainHead && wt.head === mainHead) {
              return;
            }
            const merged = await this.git
              .isBranchMergedInto(wt.branchShort, mainBranch)
              .catch(() => false);
            if (merged) {
              mergedSet.add(wt.branchShort);
            }
          })
      );

      const cards = await Promise.all(
        worktrees.map((wt) => this.buildCard(wt, repoRoot, mergedSet))
      );

      this.cache = cards;
      this._onDidChange.fire();
      return cards;
    } catch (err) {
      logError('Failed to refresh worktrees', err);
      return this.cache;
    }
  }

  async create(options: {
    branch: string;
    baseBranch?: string;
    isNewBranch: boolean;
    customPath?: string;
  }): Promise<string> {
    const repoRoot = await this.git.getRepoRoot();
    const basePath = this.config.get<string>('worktreeBasePath', '') || path.dirname(repoRoot);
    const dirName = options.customPath || this.sanitizeBranchName(options.branch);
    const worktreePath = path.resolve(basePath, dirName);

    // Ensure the resolved path stays within the base directory
    const normalizedBase = path.resolve(basePath);
    if (!worktreePath.startsWith(normalizedBase + path.sep) && worktreePath !== normalizedBase) {
      throw new Error(`Worktree path must be within ${normalizedBase}`);
    }

    await this.git.addWorktree(worktreePath, options.branch, {
      newBranch: options.isNewBranch,
      baseBranch: options.baseBranch,
    });

    await this.refresh();
    return worktreePath;
  }

  async remove(worktreePath: string, force = false): Promise<void> {
    await this.git.removeWorktree(worktreePath, force);
    await this.refresh();
  }

  async openInNewWindow(worktreePath: string): Promise<void> {
    const uri = vscode.Uri.file(worktreePath);
    await vscode.commands.executeCommand('vscode.openFolder', uri, {
      forceNewWindow: true,
    });
  }

  private async buildCard(
    wt: WorktreeInfo,
    repoRoot: string,
    mergedBranches: Set<string>
  ): Promise<WorktreeCard> {
    const [status, lastCommit] = await Promise.all([
      this.git.getStatus(wt.path).catch((): WorktreeStatusInfo => ({
        modifiedCount: 0,
        untrackedCount: 0,
        stagedCount: 0,
        ahead: 0,
        behind: 0,
      })),
      this.git.getLastCommit(wt.path).catch((): CommitInfo => ({
        sha: '',
        shortSha: '',
        message: 'No commits',
        author: '',
        date: new Date().toISOString(),
        relativeDate: 'never',
      })),
    ]);

    const state = this.determineState(wt, status, lastCommit, mergedBranches);
    const isMain = path.normalize(wt.path).toLowerCase() === path.normalize(repoRoot).toLowerCase();

    return {
      ...wt,
      ...status,
      lastCommit,
      state,
      isMain,
      displayName: wt.branchShort || path.basename(wt.path),
    };
  }

  private determineState(
    wt: WorktreeInfo,
    status: WorktreeStatusInfo,
    lastCommit: CommitInfo,
    mergedBranches: Set<string>
  ): 'active' | 'idle' | 'merged' | 'stale' {
    if (mergedBranches.has(wt.branchShort)) {
      return 'merged';
    }

    const hasChanges = status.modifiedCount > 0 || status.untrackedCount > 0 || status.stagedCount > 0;
    if (hasChanges) {
      return 'active';
    }

    const staleThreshold = this.config.get<number>('staleThresholdDays', 14);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleThreshold);
    const commitDate = new Date(lastCommit.date);
    if (commitDate < cutoff) {
      return 'stale';
    }

    return 'idle';
  }

  private async detectMainBranch(worktrees: WorktreeInfo[]): Promise<string> {
    // Find the main worktree's branch (first worktree is usually main)
    const mainWt = worktrees[0];
    if (mainWt?.branchShort) {
      return mainWt.branchShort;
    }
    // Fallback: check for common main branch names
    try {
      const branches = await this.git.listLocalBranches();
      const names = branches.map((b) => b.name);
      for (const candidate of ['main', 'master', 'develop']) {
        if (names.includes(candidate)) return candidate;
      }
    } catch {
      // ignore
    }
    return 'main';
  }

  private sanitizeBranchName(branch: string): string {
    return branch.replace(/[/\\:*?"<>|]/g, '-');
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
