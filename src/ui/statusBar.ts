import * as vscode from 'vscode';
import { WorktreeService } from '../core/worktreeService';
import { COMMANDS } from '../shared/constants';

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private worktreeService: WorktreeService,
    private currentPath: string
  ) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = COMMANDS.quickSwitch;
    this.item.tooltip = 'GitFlow Studio: Click to switch worktree';

    this.worktreeService.onDidChange(
      () => this.update(),
      undefined,
      this.disposables
    );

    this.update();
  }

  private async update(): Promise<void> {
    try {
      const worktrees = await this.worktreeService.getAll();
      const count = worktrees.length;

      if (count <= 1) {
        this.item.hide();
        return;
      }

      const normalizedCurrent = this.currentPath.toLowerCase();
      const current = worktrees.find((wt) =>
        normalizedCurrent.startsWith(wt.path.toLowerCase())
      );

      this.item.text = `$(git-branch) ${current?.displayName ?? 'worktree'} [${count}]`;
      this.item.show();
    } catch {
      this.item.hide();
    }
  }

  dispose(): void {
    this.item.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
