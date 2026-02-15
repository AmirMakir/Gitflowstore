import * as vscode from 'vscode';
import * as path from 'path';
import { WorktreeService } from '../core/worktreeService';
import { GitService } from '../core/gitService';
import { SetupPipeline } from '../core/setupPipeline';
import { CleanupService } from '../core/cleanupService';
import { ConfigManager } from '../utils/config';
import { logError } from '../utils/logger';
import type { WebviewMessage, ExtensionMessage, ViewType } from '../shared/protocol';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private worktreeService: WorktreeService,
    private gitService: GitService,
    private setupPipeline: SetupPipeline,
    private cleanupService: CleanupService,
    private config: ConfigManager
  ) {
    this.worktreeService.onDidChange(
      () => this.sendWorktreeData(),
      undefined,
      this.disposables
    );
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
      ],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        this.handleMessage(message).catch((err) => {
          logError('Message handler error', err);
          this.postMessage({
            type: 'error',
            message: `Error: ${err instanceof Error ? err.message : String(err)}`,
          });
        });
      },
      undefined,
      this.disposables
    );

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.sendWorktreeData();
      }
    });

    this.sendWorktreeData();
  }

  async refresh(): Promise<void> {
    await this.worktreeService.refresh();
  }

  async refreshRemoteStatus(): Promise<void> {
    await this.worktreeService.refresh();
  }

  showCreateForm(): void {
    this.postMessage({ type: 'showView', view: 'create' });
  }

  showCleanupView(): void {
    this.postMessage({ type: 'showView', view: 'cleanup' });
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'requestWorktrees':
        await this.sendWorktreeData();
        break;

      case 'requestBranches': {
        try {
          const [local, remote] = await Promise.all([
            this.gitService.listLocalBranches(),
            this.gitService.listRemoteBranches(),
          ]);
          this.postMessage({ type: 'branchData', data: [...local, ...remote] });
        } catch (err) {
          logError('Failed to fetch branches', err);
          this.postMessage({
            type: 'error',
            message: `Failed to fetch branches: ${err instanceof Error ? err.message : err}`,
          });
        }
        break;
      }

      case 'requestCleanupAnalysis': {
        this.postMessage({ type: 'loading', isLoading: true });
        try {
          const candidates = await this.cleanupService.analyze();
          this.postMessage({ type: 'cleanupData', data: candidates });
        } catch (err) {
          logError('Failed to analyze cleanup', err);
          this.postMessage({
            type: 'error',
            message: `Cleanup analysis failed: ${err instanceof Error ? err.message : err}`,
          });
        } finally {
          this.postMessage({ type: 'loading', isLoading: false });
        }
        break;
      }

      case 'requestConfig': {
        this.postMessage({ type: 'configData', config: this.config.getAll() });
        break;
      }

      case 'createWorktree': {
        try {
          this.postMessage({ type: 'loading', isLoading: true });
          const newPath = await this.worktreeService.create({
            branch: message.options.branch,
            baseBranch: message.options.baseBranch,
            isNewBranch: message.options.isNewBranch,
            customPath: message.options.customPath,
          });

          await this.setupPipeline.run(newPath, {
            copyEnvFiles: message.options.copyEnvFiles,
            installDeps: message.options.installDeps,
          });

          this.postMessage({
            type: 'createResult',
            success: true,
            path: newPath,
          });

          if (message.options.openInNewWindow) {
            await this.worktreeService.openInNewWindow(newPath);
          }
        } catch (err) {
          logError('Failed to create worktree', err);
          this.postMessage({
            type: 'createResult',
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        } finally {
          this.postMessage({ type: 'loading', isLoading: false });
        }
        break;
      }

      case 'removeWorktree': {
        const branchName = path.basename(message.path);
        const confirm = await vscode.window.showWarningMessage(
          `Delete worktree "${branchName}"?`,
          { modal: true, detail: message.path },
          'Delete'
        );
        if (confirm !== 'Delete') break;

        try {
          await this.worktreeService.remove(message.path, true);
          this.postMessage({ type: 'removeResult', success: true, path: message.path });
        } catch (err) {
          logError('Failed to remove worktree', err);
          const errMsg = err instanceof Error ? err.message : String(err);

          if (errMsg.includes('Permission denied')) {
            const retry = await vscode.window.showErrorMessage(
              `Cannot delete "${branchName}": a program has files locked in this folder. Close any VS Code windows, terminals, or editors open in this worktree, then retry.`,
              'Retry'
            );
            if (retry === 'Retry') {
              try {
                await this.worktreeService.remove(message.path, true);
                this.postMessage({ type: 'removeResult', success: true, path: message.path });
              } catch (retryErr) {
                logError('Retry remove failed', retryErr);
                const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
                vscode.window.showErrorMessage(`Still cannot delete: ${retryMsg}`);
                this.postMessage({ type: 'removeResult', success: false, path: message.path, error: retryMsg });
              }
            } else {
              this.postMessage({ type: 'removeResult', success: false, path: message.path, error: 'Retry dismissed' });
            }
          } else {
            vscode.window.showErrorMessage(`Failed to remove worktree: ${errMsg}`);
            this.postMessage({ type: 'removeResult', success: false, path: message.path, error: errMsg });
          }
        }
        break;
      }

      case 'openWorktree':
        await this.worktreeService.openInNewWindow(message.path);
        break;

      case 'batchRemove': {
        const result = await this.cleanupService.batchRemove(message.paths);
        this.postMessage({ type: 'cleanupResult', ...result });
        break;
      }

      case 'openInTerminal': {
        const terminal = vscode.window.createTerminal({
          name: `Worktree: ${path.basename(message.path)}`,
          cwd: message.path,
        });
        terminal.show();
        break;
      }

      case 'copyPath':
        await vscode.env.clipboard.writeText(message.path);
        vscode.window.showInformationMessage('Path copied to clipboard');
        break;

      case 'showInExplorer':
        await vscode.commands.executeCommand(
          'revealFileInOS',
          vscode.Uri.file(message.path)
        );
        break;
    }
  }

  private async sendWorktreeData(): Promise<void> {
    try {
      const worktrees = await this.worktreeService.getAll();
      this.postMessage({ type: 'worktreeData', data: worktrees });
    } catch (err) {
      logError('Failed to send worktree data', err);
      this.postMessage({
        type: 'error',
        message: 'Failed to load worktrees',
      });
    }
  }

  private postMessage(message: ExtensionMessage): void {
    this.view?.webview.postMessage(message);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distPath = vscode.Uri.joinPath(
      this.extensionUri,
      'dist',
      'webview',
      'assets'
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distPath, 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distPath, 'index.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
      style-src ${webview.cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}';
      font-src ${webview.cspSource};">
  <link href="${styleUri}" rel="stylesheet">
  <title>GitFlow Studio</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}

function getNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
