export const EXTENSION_ID = 'gitflowStudio';

export const VIEW_IDS = {
  dashboard: 'gitflowStudio.dashboard',
} as const;

export const COMMANDS = {
  createWorktree: 'gitflowStudio.createWorktree',
  quickSwitch: 'gitflowStudio.quickSwitch',
  openWorktree: 'gitflowStudio.openWorktree',
  removeWorktree: 'gitflowStudio.removeWorktree',
  refreshWorktrees: 'gitflowStudio.refreshWorktrees',
  showCleanup: 'gitflowStudio.showCleanup',
} as const;

export const CONTEXT_KEYS = {
  hasWorktrees: 'gitflowStudio.hasWorktrees',
} as const;

export const CONFIG_SECTION = 'gitflowStudio';

export const CONFIG_KEYS = {
  copyFiles: 'autoSetup.copyFiles',
  symlinkDirs: 'autoSetup.symlinkDirs',
  postCreateCommands: 'autoSetup.postCreateCommands',
  openInNewWindow: 'autoSetup.openInNewWindow',
  worktreeBasePath: 'worktreeBasePath',
  pollIntervalSeconds: 'pollIntervalSeconds',
  staleThresholdDays: 'staleThresholdDays',
} as const;
