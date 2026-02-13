export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string | null;
  branchShort: string;
  isBare: boolean;
  isDetached: boolean;
  isLocked: boolean;
  lockReason?: string;
  isPrunable: boolean;
}

export interface WorktreeStatusInfo {
  modifiedCount: number;
  untrackedCount: number;
  stagedCount: number;
  ahead: number;
  behind: number;
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  relativeDate: string;
}

export interface BranchInfo {
  name: string;
  isRemote: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  lastCommitDate: string;
}

export type WorktreeState = 'active' | 'idle' | 'merged' | 'stale';

export interface WorktreeCard extends WorktreeInfo {
  modifiedCount: number;
  untrackedCount: number;
  stagedCount: number;
  ahead: number;
  behind: number;
  lastCommit: CommitInfo;
  state: WorktreeState;
  isMain: boolean;
  displayName: string;
}

export interface CreateWorktreeOptions {
  branch: string;
  baseBranch?: string;
  isNewBranch: boolean;
  customPath?: string;
  copyEnvFiles: boolean;
  installDeps: boolean;
  openInNewWindow: boolean;
}

export interface CleanupCandidate {
  worktree: WorktreeCard;
  reason: 'merged' | 'stale' | 'prunable';
  safeToDelete: boolean;
  details: string;
}

export interface ExtensionConfig {
  copyFiles: string[];
  symlinkDirs: string[];
  postCreateCommands: string[];
  openInNewWindow: boolean;
  worktreeBasePath: string;
  pollIntervalSeconds: number;
  staleThresholdDays: number;
}
