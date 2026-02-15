export const VIEW_IDS = {
  dashboard: 'gitflowStore.dashboard',
} as const;

export const COMMANDS = {
  createWorktree: 'gitflowStore.createWorktree',
  quickSwitch: 'gitflowStore.quickSwitch',
  openWorktree: 'gitflowStore.openWorktree',
  removeWorktree: 'gitflowStore.removeWorktree',
  refreshWorktrees: 'gitflowStore.refreshWorktrees',
  showCleanup: 'gitflowStore.showCleanup',
} as const;

export const CONTEXT_KEYS = {
  hasWorktrees: 'gitflowStore.hasWorktrees',
} as const;

export const CONFIG_SECTION = 'gitflowStore';
