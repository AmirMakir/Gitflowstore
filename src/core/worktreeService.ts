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
  private isRefreshing = false;
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
    if (this.isRefreshing) {
      return this.cache;
    }
    this.isRefreshing = true;

    try {
      const worktrees = await this.git.listWorktrees();
      let repoRoot: string;
      try {
        repoRoot = await this.git.getRepoRoot();
      } catch {
        repoRoot = worktrees[0]?.path ?? '';
      }

      const mergedBranches = await this.git.getMergedBranches().catch(() => [] as string[]);

      const cards = await Promise.all(
        worktrees.map((wt) => this.buildCard(wt, repoRoot, mergedBranches))
      );

      this.cache = cards;
      this._onDidChange.fire();
      return cards;
    } catch (err) {
      logError('Failed to refresh worktrees', err);
      return this.cache;
    } finally {
      this.isRefreshing = false;
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
    const worktreePath = path.join(basePath, dirName);

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
    mergedBranches: string[]
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
    mergedBranches: string[]
  ): 'active' | 'idle' | 'merged' | 'stale' {
    if (mergedBranches.includes(wt.branchShort)) {
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

  private sanitizeBranchName(branch: string): string {
    return branch.replace(/[/\\:*?"<>|]/g, '-');
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
