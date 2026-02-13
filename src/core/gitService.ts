import { execFile } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { WorktreeInfo, WorktreeStatusInfo, CommitInfo, BranchInfo } from '../shared/types';
import { logCommand, logError } from '../utils/logger';

export class GitError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly args: string[]
  ) {
    super(message);
    this.name = 'GitError';
  }
}

export class GitService {
  constructor(private cwd: string) {}

  // --- Worktree Operations ---

  async listWorktrees(): Promise<WorktreeInfo[]> {
    const output = await this.exec(['worktree', 'list', '--porcelain']);
    return this.parseWorktreeList(output);
  }

  async addWorktree(
    worktreePath: string,
    branch: string,
    options?: { newBranch?: boolean; baseBranch?: string }
  ): Promise<void> {
    const args = ['worktree', 'add'];

    if (options?.newBranch) {
      args.push('-b', branch, worktreePath);
      if (options.baseBranch) {
        args.push(options.baseBranch);
      }
    } else {
      args.push(worktreePath, branch);
    }

    await this.exec(args, { timeout: 30000 });
  }

  async removeWorktree(worktreePath: string, force = false): Promise<void> {
    const args = ['worktree', 'remove', worktreePath];
    if (force) {
      args.push('--force');
    }
    try {
      await this.exec(args, { timeout: 15000 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission denied') || msg.includes('EBUSY') || msg.includes('EPERM')) {
        // Windows fallback: git can't delete because of file locks.
        // Manually remove the directory then let git prune clean up metadata.
        logError('git worktree remove failed with permission error, trying fs.rm fallback', err);
        await fs.rm(worktreePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
        await this.exec(['worktree', 'prune']);
      } else {
        throw err;
      }
    }
  }

  async pruneWorktrees(): Promise<void> {
    await this.exec(['worktree', 'prune']);
  }

  // --- Branch Operations ---

  async listLocalBranches(): Promise<BranchInfo[]> {
    const format = '%(refname:short)\t%(upstream:short)\t%(upstream:track,nobracket)\t%(committerdate:iso-strict)';
    const output = await this.exec([
      'for-each-ref',
      `--format=${format}`,
      'refs/heads/',
    ]);

    return output
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => {
        const [name, upstream, track, dateStr] = line.split('\t');
        const { ahead, behind } = this.parseTrack(track || '');
        return {
          name,
          isRemote: false,
          upstream: upstream || undefined,
          ahead,
          behind,
          lastCommitDate: dateStr || new Date().toISOString(),
        };
      });
  }

  async listRemoteBranches(): Promise<BranchInfo[]> {
    const format = '%(refname:short)\t%(committerdate:iso-strict)';
    const output = await this.exec([
      'for-each-ref',
      `--format=${format}`,
      'refs/remotes/',
    ]);

    return output
      .trim()
      .split('\n')
      .filter((line) => line.length > 0 && !line.includes('/HEAD'))
      .map((line) => {
        const [name, dateStr] = line.split('\t');
        return {
          name,
          isRemote: true,
          ahead: 0,
          behind: 0,
          lastCommitDate: dateStr || new Date().toISOString(),
        };
      });
  }

  async getMergedBranches(targetBranch?: string): Promise<string[]> {
    const args = ['branch', '--merged'];
    if (targetBranch) {
      args.push(targetBranch);
    }
    const output = await this.exec(args);

    return output
      .trim()
      .split('\n')
      .map((line) => line.replace(/^\*?\s+/, '').trim())
      .filter((name) => name.length > 0);
  }

  async isBranchMergedInto(branch: string, target: string): Promise<boolean> {
    try {
      await this.exec(['merge-base', '--is-ancestor', branch, target]);
      return true;
    } catch {
      return false;
    }
  }

  // --- Status Operations ---

  async getStatus(worktreePath: string): Promise<WorktreeStatusInfo> {
    const output = await this.exec(
      ['status', '--porcelain=v2', '--branch'],
      { cwd: worktreePath }
    );

    let ahead = 0;
    let behind = 0;
    let modifiedCount = 0;
    let stagedCount = 0;
    let untrackedCount = 0;

    for (const line of output.split('\n')) {
      if (line.startsWith('# branch.ab')) {
        const match = line.match(/\+(\d+)\s+-(\d+)/);
        if (match) {
          ahead = parseInt(match[1], 10);
          behind = parseInt(match[2], 10);
        }
      } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
        const xy = line.substring(2, 4);
        const x = xy[0];
        const y = xy[1];
        if (x !== '.' && x !== '?') stagedCount++;
        if (y !== '.' && y !== '?') modifiedCount++;
      } else if (line.startsWith('? ')) {
        untrackedCount++;
      }
    }

    return { modifiedCount, untrackedCount, stagedCount, ahead, behind };
  }

  async getLastCommit(worktreePath: string): Promise<CommitInfo> {
    const format = '%H%n%h%n%s%n%an%n%aI%n%ar';
    const output = await this.exec(
      ['log', '-1', `--format=${format}`],
      { cwd: worktreePath }
    );

    const lines = output.trim().split('\n');
    if (lines.length < 6) {
      return this.defaultCommit();
    }

    return {
      sha: lines[0],
      shortSha: lines[1],
      message: lines[2],
      author: lines[3],
      date: lines[4],
      relativeDate: lines[5],
    };
  }

  // --- Utility ---

  async getRepoRoot(): Promise<string> {
    const output = await this.exec(['rev-parse', '--show-toplevel']);
    return path.normalize(output.trim());
  }

  async getCommonGitDir(): Promise<string> {
    const output = await this.exec(['rev-parse', '--git-common-dir']);
    return path.resolve(this.cwd, output.trim());
  }

  async getCurrentBranch(): Promise<string> {
    const output = await this.exec(['rev-parse', '--abbrev-ref', 'HEAD']);
    return output.trim();
  }

  // --- Internal ---

  private exec(
    args: string[],
    options?: { cwd?: string; timeout?: number }
  ): Promise<string> {
    const cwd = options?.cwd ?? this.cwd;
    const timeout = options?.timeout ?? 10000;

    logCommand(args, cwd);

    return new Promise((resolve, reject) => {
      execFile(
        'git',
        args,
        {
          cwd,
          timeout,
          maxBuffer: 1024 * 1024,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            logError(`git ${args[0]} failed`, error);
            reject(new GitError(error.message, stderr, args));
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }

  private parseWorktreeList(output: string): WorktreeInfo[] {
    const worktrees: WorktreeInfo[] = [];
    // Split by double newline to get blocks; handle both \r\n and \n
    const normalized = output.replace(/\r\n/g, '\n');
    const blocks = normalized.split('\n\n').filter((b) => b.trim().length > 0);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const info: Partial<WorktreeInfo> = {
        isBare: false,
        isDetached: false,
        isLocked: false,
        isPrunable: false,
        branch: null,
        branchShort: '',
      };

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          info.path = path.normalize(line.substring(9));
        } else if (line.startsWith('HEAD ')) {
          info.head = line.substring(5);
        } else if (line.startsWith('branch ')) {
          info.branch = line.substring(7);
          info.branchShort = info.branch.replace(/^refs\/heads\//, '');
        } else if (line === 'bare') {
          info.isBare = true;
        } else if (line === 'detached') {
          info.isDetached = true;
        } else if (line.startsWith('locked')) {
          info.isLocked = true;
          const reason = line.substring(7).trim();
          if (reason) {
            info.lockReason = reason;
          }
        } else if (line === 'prunable') {
          info.isPrunable = true;
        }
      }

      if (info.path && info.head) {
        if (!info.branchShort && info.path) {
          info.branchShort = path.basename(info.path);
        }
        worktrees.push(info as WorktreeInfo);
      }
    }

    return worktrees;
  }

  private parseTrack(track: string): { ahead: number; behind: number } {
    let ahead = 0;
    let behind = 0;

    const aheadMatch = track.match(/ahead\s+(\d+)/);
    if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);

    const behindMatch = track.match(/behind\s+(\d+)/);
    if (behindMatch) behind = parseInt(behindMatch[1], 10);

    return { ahead, behind };
  }

  private defaultCommit(): CommitInfo {
    return {
      sha: '',
      shortSha: '',
      message: 'No commits',
      author: '',
      date: new Date().toISOString(),
      relativeDate: 'never',
    };
  }
}
