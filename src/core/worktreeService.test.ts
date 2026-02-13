import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorktreeService } from './worktreeService';
import type { GitService } from './gitService';
import type { ConfigManager } from '../utils/config';
import type { WorktreeInfo, WorktreeStatusInfo, CommitInfo } from '../shared/types';

vi.mock('../utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
}));

function makeWorktreeInfo(overrides: Partial<WorktreeInfo> = {}): WorktreeInfo {
  return {
    path: '/test/worktree',
    head: 'abc123',
    branch: 'refs/heads/feature',
    branchShort: 'feature',
    isBare: false,
    isDetached: false,
    isLocked: false,
    isPrunable: false,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<WorktreeStatusInfo> = {}): WorktreeStatusInfo {
  return {
    modifiedCount: 0,
    untrackedCount: 0,
    stagedCount: 0,
    ahead: 0,
    behind: 0,
    ...overrides,
  };
}

function makeCommit(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    sha: 'abc123',
    shortSha: 'abc',
    message: 'test commit',
    author: 'Test',
    date: new Date().toISOString(),
    relativeDate: 'just now',
    ...overrides,
  };
}

function createMockGit() {
  return {
    listWorktrees: vi.fn<() => Promise<WorktreeInfo[]>>().mockResolvedValue([
      makeWorktreeInfo({ path: '/main/repo', branchShort: 'main', branch: 'refs/heads/main' }),
      makeWorktreeInfo({ path: '/test/feature', branchShort: 'feature' }),
    ]),
    addWorktree: vi.fn().mockResolvedValue(undefined),
    removeWorktree: vi.fn().mockResolvedValue(undefined),
    pruneWorktrees: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue(makeStatus()),
    getLastCommit: vi.fn().mockResolvedValue(makeCommit()),
    getRepoRoot: vi.fn().mockResolvedValue('/main/repo'),
    isBranchMergedInto: vi.fn().mockResolvedValue(false),
    listLocalBranches: vi.fn().mockResolvedValue([]),
    listRemoteBranches: vi.fn().mockResolvedValue([]),
    getMergedBranches: vi.fn().mockResolvedValue([]),
    getCurrentBranch: vi.fn().mockResolvedValue('main'),
    getCommonGitDir: vi.fn().mockResolvedValue('/main/repo/.git'),
  } as unknown as GitService & { [K: string]: ReturnType<typeof vi.fn> };
}

function createMockConfig() {
  return {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      if (key === 'worktreeBasePath') return '';
      if (key === 'staleThresholdDays') return 14;
      return defaultValue;
    }),
    getAll: vi.fn(),
    onDidChange: vi.fn(),
  } as unknown as ConfigManager;
}

describe('WorktreeService', () => {
  let service: WorktreeService;
  let mockGit: ReturnType<typeof createMockGit>;
  let mockConfig: ReturnType<typeof createMockConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGit = createMockGit();
    mockConfig = createMockConfig();
    service = new WorktreeService(
      mockGit as unknown as GitService,
      mockConfig as unknown as ConfigManager
    );
  });

  // Test 15
  it('getAll returns cache when populated and forceRefresh is false', async () => {
    await service.refresh();
    vi.mocked(mockGit.listWorktrees).mockClear();

    await service.getAll();

    expect(mockGit.listWorktrees).not.toHaveBeenCalled();
  });

  // Test 16
  it('getAll triggers refresh when cache is empty', async () => {
    await service.getAll();

    expect(mockGit.listWorktrees).toHaveBeenCalled();
  });

  // Test 17
  it('getAll with forceRefresh bypasses cache', async () => {
    await service.refresh();
    vi.mocked(mockGit.listWorktrees).mockClear();

    await service.getAll(true);

    expect(mockGit.listWorktrees).toHaveBeenCalled();
  });

  // Test 18
  it('refresh guards against concurrent invocations', async () => {
    vi.mocked(mockGit.listWorktrees).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([
        makeWorktreeInfo({ path: '/main/repo', branchShort: 'main', branch: 'refs/heads/main' }),
      ]), 50))
    );

    const p1 = service.refresh();
    const p2 = service.refresh();
    await Promise.all([p1, p2]);

    expect(mockGit.listWorktrees).toHaveBeenCalledTimes(1);
  });

  // Test 19
  it('create sanitizes branch name in path', async () => {
    vi.mocked(mockGit.getRepoRoot).mockResolvedValue('/home/user/project');
    vi.mocked(mockConfig.get as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string, def?: unknown) => (key === 'worktreeBasePath' ? '' : def)
    );

    await service.create({
      branch: 'feature/my:branch*name',
      isNewBranch: true,
    });

    const callArgs = vi.mocked(mockGit.addWorktree).mock.calls[0];
    const worktreePath = callArgs[0] as string;
    expect(worktreePath).toContain('feature-my-branch-name');
    // Only check the directory name (last segment), not the full path which has OS path separators
    const dirName = worktreePath.split(/[/\\]/).pop()!;
    expect(dirName).not.toMatch(/[:*?"<>|]/);
  });

  // Test 20
  it('create uses worktreeBasePath from config', async () => {
    vi.mocked(mockConfig.get as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string, def?: unknown) => (key === 'worktreeBasePath' ? 'D:\\worktrees' : def)
    );

    await service.create({
      branch: 'my-feature',
      isNewBranch: true,
    });

    const callArgs = vi.mocked(mockGit.addWorktree).mock.calls[0];
    const worktreePath = callArgs[0] as string;
    expect(worktreePath).toMatch(/^D:[/\\]worktrees/);
  });

  // Test 21
  it('remove delegates to git and triggers refresh', async () => {
    await service.refresh();
    vi.mocked(mockGit.listWorktrees).mockClear();

    await service.remove('/some/path', true);

    expect(mockGit.removeWorktree).toHaveBeenCalledWith('/some/path', true);
    expect(mockGit.listWorktrees).toHaveBeenCalled();
  });

  // Test 22
  it('determineState returns correct priority: merged > active > stale > idle', async () => {
    // Make isBranchMergedInto return true for 'merged-branch' only
    vi.mocked(mockGit.isBranchMergedInto).mockImplementation(
      async (branch: string) => branch === 'merged-branch'
    );

    const now = new Date();
    const oldDate = new Date(now);
    oldDate.setDate(oldDate.getDate() - 30);
    const recentDate = new Date(now);
    recentDate.setDate(recentDate.getDate() - 2);

    // Setup 4 worktrees to test all states
    vi.mocked(mockGit.listWorktrees).mockResolvedValue([
      makeWorktreeInfo({ path: '/main/repo', branchShort: 'main', branch: 'refs/heads/main' }),
      makeWorktreeInfo({ path: '/wt/merged', branchShort: 'merged-branch' }),
      makeWorktreeInfo({ path: '/wt/active', branchShort: 'active-branch' }),
      makeWorktreeInfo({ path: '/wt/stale', branchShort: 'stale-branch' }),
      makeWorktreeInfo({ path: '/wt/idle', branchShort: 'idle-branch' }),
    ]);

    vi.mocked(mockGit.getStatus).mockImplementation(async (wtPath: string) => {
      if (wtPath === '/wt/active') return makeStatus({ modifiedCount: 3 });
      return makeStatus();
    });

    vi.mocked(mockGit.getLastCommit).mockImplementation(async (wtPath: string) => {
      if (wtPath === '/wt/stale') return makeCommit({ date: oldDate.toISOString() });
      return makeCommit({ date: recentDate.toISOString() });
    });

    const cards = await service.refresh();

    const merged = cards.find((c) => c.branchShort === 'merged-branch');
    const active = cards.find((c) => c.branchShort === 'active-branch');
    const stale = cards.find((c) => c.branchShort === 'stale-branch');
    const idle = cards.find((c) => c.branchShort === 'idle-branch');

    expect(merged?.state).toBe('merged');
    expect(active?.state).toBe('active');
    expect(stale?.state).toBe('stale');
    expect(idle?.state).toBe('idle');
  });

  // Test 23
  it('detectMainBranch returns first worktree branch or falls back', async () => {
    // Case A: First worktree has a branch
    vi.mocked(mockGit.listWorktrees).mockResolvedValue([
      makeWorktreeInfo({ path: '/main/repo', branchShort: 'develop', branch: 'refs/heads/develop' }),
    ]);

    let cards = await service.refresh();
    // The main branch used internally is 'develop' - verify by checking the main card exists
    expect(cards[0].branchShort).toBe('develop');

    // Case B: First worktree has empty branch, fallback to common names
    vi.mocked(mockGit.listWorktrees).mockResolvedValue([
      makeWorktreeInfo({ path: '/main/repo', branchShort: '', branch: null }),
    ]);
    vi.mocked(mockGit.listLocalBranches).mockResolvedValue([
      { name: 'master', isRemote: false, ahead: 0, behind: 0, lastCommitDate: '' },
    ]);

    cards = await service.refresh();
    // Should not throw; the branch detection is internal
    expect(cards).toHaveLength(1);
  });
});
