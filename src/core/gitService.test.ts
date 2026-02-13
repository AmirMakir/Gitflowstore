import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitService, GitError } from './gitService';

// Mock child_process
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  rm: vi.fn(),
}));

// Mock logger to prevent output channel creation
vi.mock('../utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
}));

import { execFile } from 'child_process';
import * as fs from 'fs/promises';

const mockExecFile = vi.mocked(execFile);
const mockRm = vi.mocked(fs.rm);

function setupExecFile(stdout: string, stderr = '') {
  mockExecFile.mockImplementation(
    ((_cmd: unknown, _args: unknown, _opts: unknown, callback: Function) => {
      callback(null, stdout, stderr);
    }) as unknown as typeof execFile
  );
}

function setupExecFileError(message: string, stderr = '') {
  mockExecFile.mockImplementation(
    ((_cmd: unknown, _args: unknown, _opts: unknown, callback: Function) => {
      const err = new Error(message);
      callback(err, '', stderr);
    }) as unknown as typeof execFile
  );
}

describe('GitService', () => {
  let git: GitService;

  beforeEach(() => {
    vi.clearAllMocks();
    git = new GitService('/test/repo');
  });

  // Test 1
  it('listWorktrees parses porcelain output with two worktrees', async () => {
    const porcelain = [
      'worktree /home/user/project',
      'HEAD abc123def456789',
      'branch refs/heads/main',
      '',
      'worktree /home/user/project-feat',
      'HEAD 789abcdef012345',
      'branch refs/heads/feature/login',
      '',
    ].join('\n');

    setupExecFile(porcelain);

    const result = await git.listWorktrees();

    expect(result).toHaveLength(2);
    expect(result[0].branchShort).toBe('main');
    expect(result[0].head).toBe('abc123def456789');
    expect(result[0].isDetached).toBe(false);
    expect(result[1].branchShort).toBe('feature/login');
    expect(result[1].branch).toBe('refs/heads/feature/login');
  });

  // Test 2
  it('listWorktrees handles detached HEAD worktree', async () => {
    const porcelain = [
      'worktree /home/user/project',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /home/user/detached-wt',
      'HEAD def456',
      'detached',
      '',
    ].join('\n');

    setupExecFile(porcelain);

    const result = await git.listWorktrees();

    expect(result).toHaveLength(2);
    expect(result[1].isDetached).toBe(true);
    expect(result[1].branch).toBeNull();
    expect(result[1].branchShort).toBe('detached-wt');
  });

  // Test 3
  it('listWorktrees handles locked with reason and prunable flags', async () => {
    const porcelain = [
      'worktree /home/user/project',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /home/user/locked-wt',
      'HEAD def456',
      'branch refs/heads/feature',
      'locked some lock reason',
      'prunable',
      '',
    ].join('\n');

    setupExecFile(porcelain);

    const result = await git.listWorktrees();

    expect(result[1].isLocked).toBe(true);
    expect(result[1].lockReason).toBe('some lock reason');
    expect(result[1].isPrunable).toBe(true);
  });

  // Test 4
  it('listWorktrees returns empty array for empty output', async () => {
    setupExecFile('');

    const result = await git.listWorktrees();

    expect(result).toEqual([]);
  });

  // Test 5
  it('addWorktree builds correct args for new branch with base', async () => {
    setupExecFile('');

    await git.addWorktree('/wt/path', 'feat/x', {
      newBranch: true,
      baseBranch: 'main',
    });

    expect(mockExecFile).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '-b', 'feat/x', '/wt/path', 'main'],
      expect.any(Object),
      expect.any(Function)
    );
  });

  // Test 6
  it('addWorktree builds correct args for existing branch', async () => {
    setupExecFile('');

    await git.addWorktree('/wt/path', 'feat/x');

    expect(mockExecFile).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '/wt/path', 'feat/x'],
      expect.any(Object),
      expect.any(Function)
    );
  });

  // Test 7
  it('removeWorktree falls back to fs.rm on Permission denied', async () => {
    let callCount = 0;
    mockExecFile.mockImplementation(
      ((_cmd: unknown, args: unknown, _opts: unknown, callback: Function) => {
        callCount++;
        const argArr = args as string[];
        if (callCount === 1 && argArr[0] === 'worktree' && argArr[1] === 'remove') {
          callback(new Error('Permission denied'), '', 'Permission denied');
        } else {
          callback(null, '', '');
        }
      }) as unknown as typeof execFile
    );
    mockRm.mockResolvedValue(undefined);

    await git.removeWorktree('/wt/path');

    expect(mockRm).toHaveBeenCalledWith('/wt/path', {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 500,
    });
    // Should have called prune after
    expect(mockExecFile).toHaveBeenCalledTimes(2);
  });

  // Test 8
  it('removeWorktree passes --force flag when force is true', async () => {
    setupExecFile('');

    await git.removeWorktree('/wt/path', true);

    expect(mockExecFile).toHaveBeenCalledWith(
      'git',
      ['worktree', 'remove', '/wt/path', '--force'],
      expect.any(Object),
      expect.any(Function)
    );
  });

  // Test 9
  it('removeWorktree re-throws non-permission errors', async () => {
    setupExecFileError('fatal: not a valid worktree', 'fatal: not a valid worktree');

    await expect(git.removeWorktree('/wt/path')).rejects.toThrow(GitError);
  });

  // Test 10
  it('listLocalBranches parses tracking info correctly', async () => {
    const output = [
      'main\torigin/main\tahead 2, behind 1\t2024-01-01T00:00:00Z',
      'feature\t\t\t2024-02-01T00:00:00Z',
    ].join('\n');

    setupExecFile(output);

    const result = await git.listLocalBranches();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('main');
    expect(result[0].upstream).toBe('origin/main');
    expect(result[0].ahead).toBe(2);
    expect(result[0].behind).toBe(1);
    expect(result[1].name).toBe('feature');
    expect(result[1].upstream).toBeUndefined();
    expect(result[1].ahead).toBe(0);
    expect(result[1].behind).toBe(0);
  });

  // Test 11
  it('listRemoteBranches filters HEAD reference', async () => {
    const output = [
      'origin/HEAD\t2024-01-01T00:00:00Z',
      'origin/main\t2024-01-01T00:00:00Z',
      'origin/develop\t2024-02-01T00:00:00Z',
    ].join('\n');

    setupExecFile(output);

    const result = await git.listRemoteBranches();

    expect(result).toHaveLength(2);
    expect(result.every((b) => !b.name.includes('HEAD'))).toBe(true);
    expect(result[0].isRemote).toBe(true);
  });

  // Test 12
  it('getStatus parses porcelain v2 output correctly', async () => {
    const output = [
      '# branch.oid abc123',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +3 -1',
      '1 M. N... 100644 100644 100644 abc def src/file.ts',
      '1 .M N... 100644 100644 100644 abc def src/other.ts',
      '? untracked.txt',
    ].join('\n');

    setupExecFile(output);

    const result = await git.getStatus('/some/path');

    expect(result.ahead).toBe(3);
    expect(result.behind).toBe(1);
    expect(result.stagedCount).toBe(1);
    expect(result.modifiedCount).toBe(1);
    expect(result.untrackedCount).toBe(1);
  });

  // Test 13
  it('getLastCommit parses 6-line format correctly', async () => {
    const output = [
      'abc123full0000000000000000000000000000',
      'abc123f',
      'Fix authentication bug',
      'John Doe',
      '2024-01-15T10:00:00Z',
      '2 days ago',
    ].join('\n');

    setupExecFile(output);

    const result = await git.getLastCommit('/some/path');

    expect(result.sha).toBe('abc123full0000000000000000000000000000');
    expect(result.shortSha).toBe('abc123f');
    expect(result.message).toBe('Fix authentication bug');
    expect(result.author).toBe('John Doe');
    expect(result.date).toBe('2024-01-15T10:00:00Z');
    expect(result.relativeDate).toBe('2 days ago');
  });

  // Test 14
  it('getLastCommit returns default when output is incomplete', async () => {
    setupExecFile('abc\n');

    const result = await git.getLastCommit('/some/path');

    expect(result.sha).toBe('');
    expect(result.message).toBe('No commits');
    expect(result.relativeDate).toBe('never');
  });
});
