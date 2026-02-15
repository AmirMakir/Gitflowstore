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
