import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusBarManager } from './statusBar';
import type { WorktreeService } from '../core/worktreeService';
import type { WorktreeCard, CommitInfo } from '../shared/types';
import * as vscode from 'vscode';

function makeCard(overrides: Partial<WorktreeCard> = {}): WorktreeCard {
  return {
    path: '/wt/test',
    head: 'abc',
    branch: 'refs/heads/test',
    branchShort: 'test',
    isBare: false,
    isDetached: false,
    isLocked: false,
    isPrunable: false,
    modifiedCount: 0,
    untrackedCount: 0,
    stagedCount: 0,
    ahead: 0,
    behind: 0,
    lastCommit: {
      sha: 'abc', shortSha: 'abc', message: 'test',
      author: 'Test', date: new Date().toISOString(), relativeDate: 'now',
    } as CommitInfo,
    state: 'idle',
    isMain: false,
    displayName: 'test',
    ...overrides,
  };
}

describe('StatusBarManager', () => {
  let mockItem: {
    text: string;
    tooltip: string;
    command: string;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };
  let mockWorktreeService: {
    getAll: ReturnType<typeof vi.fn>;
    onDidChange: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockItem = {
      text: '',
      tooltip: '',
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(vscode.window.createStatusBarItem).mockReturnValue(
      mockItem as unknown as vscode.StatusBarItem
    );

    mockWorktreeService = {
      getAll: vi.fn().mockResolvedValue([]),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    };
  });

  // Test 46
  it('update shows bar with branch name and count for multiple worktrees', async () => {
    const cards = [
      makeCard({ path: '/wt/main', displayName: 'main', isMain: true }),
      makeCard({ path: '/wt/feature', displayName: 'feature' }),
      makeCard({ path: '/wt/bugfix', displayName: 'bugfix' }),
    ];
    mockWorktreeService.getAll.mockResolvedValue(cards);

    // Constructor calls update()
    new StatusBarManager(
      mockWorktreeService as unknown as WorktreeService,
      '/wt/feature'
    );

    // Wait for async update
    await vi.waitFor(() => {
      expect(mockItem.show).toHaveBeenCalled();
    });

    expect(mockItem.text).toContain('feature');
    expect(mockItem.text).toContain('[3]');
  });

  // Test 47
  it('update hides status bar when only one worktree exists', async () => {
    mockWorktreeService.getAll.mockResolvedValue([
      makeCard({ path: '/wt/main', isMain: true }),
    ]);

    new StatusBarManager(
      mockWorktreeService as unknown as WorktreeService,
      '/wt/main'
    );

    await vi.waitFor(() => {
      expect(mockItem.hide).toHaveBeenCalled();
    });
  });
});
