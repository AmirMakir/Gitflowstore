import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickPick } from './quickPick';
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
      author: 'Test', date: new Date().toISOString(), relativeDate: '2 hours ago',
    } as CommitInfo,
    state: 'idle',
    isMain: false,
    displayName: 'test',
    ...overrides,
  };
}

describe('QuickPick', () => {
  let mockWorktreeService: {
    getAll: ReturnType<typeof vi.fn>;
    openInNewWindow: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorktreeService = {
      getAll: vi.fn().mockResolvedValue([]),
      openInNewWindow: vi.fn().mockResolvedValue(undefined),
    };
  });

  // Test 48
  it('show presents formatted items and opens selected worktree', async () => {
    const cards = [
      makeCard({ path: '/wt/main', displayName: 'main', isMain: true }),
      makeCard({ path: '/wt/feature', displayName: 'feature', modifiedCount: 2, ahead: 1 }),
    ];
    mockWorktreeService.getAll.mockResolvedValue(cards);

    // showQuickPick resolves to the feature item
    vi.mocked(vscode.window.showQuickPick).mockImplementation(
      async (items: any) => {
        const arr = items as Array<{ label: string; worktreePath: string }>;
        // Verify main item has (main) suffix
        const mainItem = arr.find((i) => i.label.includes('(main)'));
        expect(mainItem).toBeDefined();
        // Return the feature item
        return arr.find((i) => i.worktreePath === '/wt/feature');
      }
    );

    const qp = new QuickPick(mockWorktreeService as unknown as WorktreeService);
    await qp.show();

    expect(vscode.window.showQuickPick).toHaveBeenCalled();
    expect(mockWorktreeService.openInNewWindow).toHaveBeenCalledWith('/wt/feature');
  });
});
