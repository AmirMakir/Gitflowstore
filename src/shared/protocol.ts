import type {
  WorktreeCard,
  BranchInfo,
  CleanupCandidate,
  CreateWorktreeOptions,
  ExtensionConfig,
} from './types';

// Extension -> Webview messages
export type ExtensionMessage =
  | { type: 'worktreeData'; data: WorktreeCard[] }
  | { type: 'branchData'; data: BranchInfo[] }
  | { type: 'cleanupData'; data: CleanupCandidate[] }
  | { type: 'showView'; view: ViewType }
  | { type: 'createResult'; success: boolean; path?: string; error?: string }
  | { type: 'removeResult'; success: boolean; path: string; error?: string }
  | { type: 'cleanupResult'; succeeded: string[]; failed: Array<{ path: string; error: string }> }
  | { type: 'error'; message: string }
  | { type: 'loading'; isLoading: boolean }
  | { type: 'configData'; config: ExtensionConfig };

// Webview -> Extension messages
export type WebviewMessage =
  | { type: 'requestWorktrees' }
  | { type: 'requestBranches' }
  | { type: 'requestCleanupAnalysis' }
  | { type: 'requestConfig' }
  | { type: 'createWorktree'; options: CreateWorktreeOptions }
  | { type: 'removeWorktree'; path: string; force?: boolean }
  | { type: 'openWorktree'; path: string }
  | { type: 'batchRemove'; paths: string[] }
  | { type: 'openInTerminal'; path: string }
  | { type: 'copyPath'; path: string }
  | { type: 'showInExplorer'; path: string };

export type ViewType = 'dashboard' | 'create' | 'cleanup';
