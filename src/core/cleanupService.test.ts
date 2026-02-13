import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CleanupService } from './cleanupService';
import type { GitService } from './gitService';
import type { WorktreeService } from './worktreeService';
import type { ConfigManager } from '../utils/config';
import type { WorktreeCard, CommitInfo } from '../shared/types';

vi.mock('../utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
}));

function makeCommit(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    sha: 'abc123',
    shortSha: 'abc',
    message: 'test',
    author: 'Test',
    date: new Date().toISOString(),
    relativeDate: 'just now',
    ...overrides,
  };
}

function makeCard(overrides: Partial<WorktreeCard> = {}): WorktreeCard {
  return {
    path: '/wt/feature',
    head: 'abc123',
    branch: 'refs/heads/feature',
    branchShort: 'feature',
    isBare: false,
    isDetached: false,
    isLocked: false,
    isPrunable: false,
    modifiedCount: 0,
    untrackedCount: 0,
    stagedCount: 0,
    ahead: 0,
    behind: 0,
    lastCommit: makeCommit(),
    state: 'idle',
    isMain: false,
    displayName: 'feature',
    ...overrides,
  };
}

describe('CleanupService', () => {
  let service: CleanupService;
  let mockGit: {
    removeWorktree: ReturnType<typeof vi.fn>;
    pruneWorktrees: ReturnType<typeof vi.fn>;
    isBranchMergedInto: ReturnType<typeof vi.fn>;
  };
  let mockWorktreeService: { getAll: ReturnType<typeof vi.fn>; refresh: ReturnType<typeof vi.fn> };
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGit = {
      removeWorktree: vi.fn().mockResolvedValue(undefined),
      pruneWorktrees: vi.fn().mockResolvedValue(undefined),
      isBranchMergedInto: vi.fn().mockResolvedValue(false),
    };

    mockWorktreeService = {
      getAll: vi.fn().mockResolvedValue([]),
      refresh: vi.fn().mockResolvedValue([]),
    };

    mockConfig = {
      get: vi.fn((_key: string, defaultValue?: unknown) => {
        return defaultValue;
      }),
    };

    service = new CleanupService(
      mockGit as unknown as GitService,
      mockWorktreeService as unknown as WorktreeService,
      mockConfig as unknown as ConfigManager
    );
  });

  // Test 24
  it('analyze skips main worktree', async () => {
    mockWorktreeService.getAll.mockResolvedValue([
      makeCard({ isMain: true, branchShort: 'main', path: '/main' }),
      makeCard({ branchShort: 'feature', path: '/wt/feature', isPrunable: true }),
    ]);

    const candidates = await service.analyze();

    expect(candidates.every((c) => !c.worktree.isMain)).toBe(true);
    expect(candidates).toHaveLength(1);
  });

  // Test 25
  it('analyze categorizes prunable worktrees as always safe', async () => {
    mockWorktreeService.getAll.mockResolvedValue([
      makeCard({ isMain: true, branchShort: 'main', path: '/main' }),
      makeCard({ isPrunable: true, branchShort: 'old', path: '/wt/old' }),
    ]);

    const candidates = await service.analyze();

    expect(candidates).toHaveLength(1);
    expect(candidates[0].reason).toBe('prunable');
    expect(candidates[0].safeToDelete).toBe(true);
    expect(candidates[0].details).toContain('no longer exists');
  });

  // Test 26
  it('analyze categorizes merged branch with no changes as safe', async () => {
    mockGit.isBranchMergedInto.mockResolvedValue(true);
    mockWorktreeService.getAll.mockResolvedValue([
      makeCard({ isMain: true, branchShort: 'main', path: '/main' }),
      makeCard({
        branchShort: 'merged-feat',
        path: '/wt/merged',
        modifiedCount: 0,
        untrackedCount: 0,
        stagedCount: 0,
      }),
    ]);

    const candidates = await service.analyze();

    expect(candidates).toHaveLength(1);
    expect(candidates[0].reason).toBe('merged');
    expect(candidates[0].safeToDelete).toBe(true);
  });

  // Test 27
  it('analyze categorizes merged branch with uncommitted changes as unsafe', async () => {
    mockGit.isBranchMergedInto.mockResolvedValue(true);
    mockWorktreeService.getAll.mockResolvedValue([
      makeCard({ isMain: true, branchShort: 'main', path: '/main' }),
      makeCard({
        branchShort: 'merged-dirty',
        path: '/wt/dirty',
        modifiedCount: 2,
        untrackedCount: 1,
      }),
    ]);

    const candidates = await service.analyze();

    expect(candidates).toHaveLength(1);
    expect(candidates[0].reason).toBe('merged');
    expect(candidates[0].safeToDelete).toBe(false);
    expect(candidates[0].details).toContain('uncommitted changes');
  });

  // Test 28
  it('analyze categorizes stale worktrees with correct day count', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    mockGit.isBranchMergedInto.mockResolvedValue(false);
    mockWorktreeService.getAll.mockResolvedValue([
      makeCard({ isMain: true, branchShort: 'main', path: '/main' }),
      makeCard({
        branchShort: 'stale-feat',
        path: '/wt/stale',
        lastCommit: makeCommit({ date: oldDate.toISOString() }),
      }),
    ]);

    const candidates = await service.analyze();

    expect(candidates).toHaveLength(1);
    expect(candidates[0].reason).toBe('stale');
    expect(candidates[0].details).toMatch(/30 days/);
  });

  // Test 29
  it('batchRemove tracks successes and failures, prunes only on success', async () => {
    mockGit.removeWorktree
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('lock error'))
      .mockResolvedValueOnce(undefined);

    const result = await service.batchRemove(['/wt/a', '/wt/b', '/wt/c']);

    expect(result.succeeded).toEqual(['/wt/a', '/wt/c']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].path).toBe('/wt/b');
    expect(result.failed[0].error).toContain('lock error');
    expect(mockGit.pruneWorktrees).toHaveBeenCalled();
    expect(mockWorktreeService.refresh).toHaveBeenCalled();
  });
});
