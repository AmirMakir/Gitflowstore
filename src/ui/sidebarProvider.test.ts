import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SidebarProvider } from './sidebarProvider';
import type { WorktreeService } from '../core/worktreeService';
import type { GitService } from '../core/gitService';
import type { SetupPipeline } from '../core/setupPipeline';
import type { CleanupService } from '../core/cleanupService';
import type { ConfigManager } from '../utils/config';
import type { WorktreeCard, CommitInfo } from '../shared/types';

vi.mock('../utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
}));

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

describe('SidebarProvider', () => {
  let provider: SidebarProvider;
  let postMessage: ReturnType<typeof vi.fn>;
  let mockWorktreeService: Record<string, ReturnType<typeof vi.fn>>;
  let mockGitService: Record<string, ReturnType<typeof vi.fn>>;
  let mockCleanupService: Record<string, ReturnType<typeof vi.fn>>;
  let mockSetupPipeline: Record<string, ReturnType<typeof vi.fn>>;
  let mockConfig: Record<string, ReturnType<typeof vi.fn>>;
  let messageHandler: (msg: unknown) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    postMessage = vi.fn();

    mockWorktreeService = {
      getAll: vi.fn().mockResolvedValue([makeCard()]),
      refresh: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue('/new/wt'),
      remove: vi.fn().mockResolvedValue(undefined),
      openInNewWindow: vi.fn().mockResolvedValue(undefined),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    };

    mockGitService = {
      listLocalBranches: vi.fn().mockResolvedValue([
        { name: 'main', isRemote: false, ahead: 0, behind: 0, lastCommitDate: '' },
        { name: 'feature', isRemote: false, ahead: 0, behind: 0, lastCommitDate: '' },
      ]),
      listRemoteBranches: vi.fn().mockResolvedValue([
        { name: 'origin/main', isRemote: true, ahead: 0, behind: 0, lastCommitDate: '' },
      ]),
    };

    mockCleanupService = {
      analyze: vi.fn().mockResolvedValue([]),
      batchRemove: vi.fn().mockResolvedValue({ succeeded: ['/a'], failed: [] }),
    };

    mockSetupPipeline = {
      run: vi.fn().mockResolvedValue(undefined),
    };

    mockConfig = {
      getAll: vi.fn().mockReturnValue({}),
      get: vi.fn(),
      onDidChange: vi.fn(),
    };

    const extensionUri = { fsPath: '/ext', path: '/ext' };

    provider = new SidebarProvider(
      extensionUri as any,
      mockWorktreeService as unknown as WorktreeService,
      mockGitService as unknown as GitService,
      mockSetupPipeline as unknown as SetupPipeline,
      mockCleanupService as unknown as CleanupService,
      mockConfig as unknown as ConfigManager
    );

    // Simulate resolveWebviewView
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn((cb: (msg: unknown) => void) => {
          messageHandler = cb;
          return { dispose: vi.fn() };
        }),
        postMessage,
        asWebviewUri: vi.fn((uri: { fsPath: string }) => uri.fsPath),
        cspSource: 'mock-csp',
      },
      onDidChangeVisibility: vi.fn(),
      visible: true,
    };

    provider.resolveWebviewView(
      mockWebviewView as any,
      {} as any,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as any
    );
  });

  // Test 42
  it('handleMessage requestWorktrees sends worktreeData', async () => {
    const cards = [makeCard({ displayName: 'my-feature' })];
    mockWorktreeService.getAll.mockResolvedValue(cards);

    postMessage.mockClear();
    await messageHandler({ type: 'requestWorktrees' });

    // Wait for async handling
    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'worktreeData', data: cards })
      );
    });
  });

  // Test 43
  it('handleMessage requestBranches merges local and remote branches', async () => {
    postMessage.mockClear();
    await messageHandler({ type: 'requestBranches' });

    await vi.waitFor(() => {
      const call = postMessage.mock.calls.find(
        (c) => (c[0] as { type: string }).type === 'branchData'
      );
      expect(call).toBeDefined();
      const data = (call![0] as { data: unknown[] }).data;
      expect(data).toHaveLength(3);
    });
  });

  // Test 44
  it('handleMessage createWorktree sends createResult on success', async () => {
    postMessage.mockClear();
    await messageHandler({
      type: 'createWorktree',
      options: {
        branch: 'new-feat',
        isNewBranch: true,
        copyEnvFiles: false,
        installDeps: false,
        openInNewWindow: false,
      },
    });

    await vi.waitFor(() => {
      const types = postMessage.mock.calls.map((c) => (c[0] as { type: string }).type);
      expect(types).toContain('loading');
      expect(types).toContain('createResult');

      const resultCall = postMessage.mock.calls.find(
        (c) => (c[0] as { type: string }).type === 'createResult'
      );
      expect((resultCall![0] as { success: boolean }).success).toBe(true);
      expect((resultCall![0] as { path: string }).path).toBe('/new/wt');
    });
  });

  // Test 45
  it('handleMessage batchRemove delegates to cleanupService', async () => {
    postMessage.mockClear();
    await messageHandler({ type: 'batchRemove', paths: ['/a'] });

    await vi.waitFor(() => {
      expect(mockCleanupService.batchRemove).toHaveBeenCalledWith(['/a']);
      expect(postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cleanupResult',
          succeeded: ['/a'],
          failed: [],
        })
      );
    });
  });
});
