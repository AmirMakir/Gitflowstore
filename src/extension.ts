import * as vscode from 'vscode';
import { SidebarProvider } from './ui/sidebarProvider';
import { GitService } from './core/gitService';
import { WorktreeService } from './core/worktreeService';
import { SetupPipeline } from './core/setupPipeline';
import { CleanupService } from './core/cleanupService';
import { QuickPick } from './ui/quickPick';
import { StatusBarManager } from './ui/statusBar';
import { ConfigManager } from './utils/config';
import { log, logError } from './utils/logger';
import { VIEW_IDS, COMMANDS, CONTEXT_KEYS } from './shared/constants';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  log(`GitFlow Studio activating in ${workspaceRoot}`);

  // Instantiate services
  const config = new ConfigManager();
  const gitService = new GitService(workspaceRoot);
  const worktreeService = new WorktreeService(gitService, config);
  const setupPipeline = new SetupPipeline(config, gitService);
  const cleanupService = new CleanupService(gitService, worktreeService, config);

  // Register sidebar webview provider
  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    worktreeService,
    gitService,
    setupPipeline,
    cleanupService,
    config
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_IDS.dashboard, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Register commands
  const quickPick = new QuickPick(worktreeService);

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.createWorktree, () =>
      sidebarProvider.showCreateForm()
    ),
    vscode.commands.registerCommand(COMMANDS.quickSwitch, () =>
      quickPick.show()
    ),
    vscode.commands.registerCommand(COMMANDS.openWorktree, (worktreePath: string) =>
      worktreeService.openInNewWindow(worktreePath)
    ),
    vscode.commands.registerCommand(COMMANDS.removeWorktree, (worktreePath: string) =>
      worktreeService.remove(worktreePath)
    ),
    vscode.commands.registerCommand(COMMANDS.refreshWorktrees, () =>
      sidebarProvider.refresh()
    ),
    vscode.commands.registerCommand(COMMANDS.showCleanup, () =>
      sidebarProvider.showCleanupView()
    )
  );

  // Status bar
  const statusBar = new StatusBarManager(worktreeService, workspaceRoot);
  context.subscriptions.push(statusBar);

  // Update context key reactively based on worktree count
  const updateContextKey = async () => {
    const worktrees = await worktreeService.getAll();
    vscode.commands.executeCommand('setContext', CONTEXT_KEYS.hasWorktrees, worktrees.length > 1);
  };
  worktreeService.onDidChange(updateContextKey);
  updateContextKey();

  // File system watcher for git changes (debounced).
  // Resolves git-common-dir so the watcher works inside worktrees
  // where .git is a file, not a directory.
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const debouncedRefresh = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => sidebarProvider.refresh(), 500);
  };

  let gitWatcher: vscode.FileSystemWatcher | undefined;
  const setupWatcher = (watchPath: string, pattern: string) => {
    gitWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(watchPath, pattern)
    );
    gitWatcher.onDidChange(debouncedRefresh);
    gitWatcher.onDidCreate(debouncedRefresh);
    gitWatcher.onDidDelete(debouncedRefresh);
  };

  gitService.getGitCommonDir().then((gitDir) => {
    setupWatcher(gitDir, '**');
  }).catch((err) => {
    logError('Failed to resolve git common dir, falling back to .git/**', err);
    setupWatcher(workspaceRoot, '.git/**');
  });

  context.subscriptions.push({
    dispose: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      gitWatcher?.dispose();
    },
  });

  // Polling timer for remote status
  const pollInterval = config.get<number>('pollIntervalSeconds', 30) * 1000;
  const pollTimer = setInterval(() => {
    sidebarProvider.refreshRemoteStatus();
  }, pollInterval);
  context.subscriptions.push({
    dispose: () => clearInterval(pollTimer),
  });

  // Push services for disposal
  context.subscriptions.push(worktreeService);
  context.subscriptions.push(sidebarProvider);

  // Listen for config changes
  context.subscriptions.push(
    config.onDidChange(() => {
      sidebarProvider.refresh();
    })
  );

  log('GitFlow Studio activated successfully');
}

export function deactivate(): void {
  log('GitFlow Studio deactivated');
}
