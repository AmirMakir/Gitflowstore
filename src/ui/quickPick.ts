import * as vscode from 'vscode';
import { WorktreeService } from '../core/worktreeService';

interface WorktreeQuickPickItem extends vscode.QuickPickItem {
  worktreePath: string;
}

export class QuickPick {
  constructor(private worktreeService: WorktreeService) {}

  async show(): Promise<void> {
    const worktrees = await this.worktreeService.getAll();

    const items: WorktreeQuickPickItem[] = worktrees.map((wt) => {
      const details: string[] = [];
      if (wt.modifiedCount > 0) details.push(`$(edit) ${wt.modifiedCount} modified`);
      if (wt.stagedCount > 0) details.push(`$(check) ${wt.stagedCount} staged`);
      if (wt.ahead > 0) details.push(`$(arrow-up) ${wt.ahead}`);
      if (wt.behind > 0) details.push(`$(arrow-down) ${wt.behind}`);
      details.push(`$(history) ${wt.lastCommit.relativeDate}`);

      return {
        label: `$(git-branch) ${wt.displayName}${wt.isMain ? ' (main)' : ''}`,
        description: wt.path,
        detail: details.join('  '),
        worktreePath: wt.path,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Switch to worktree...',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      await this.worktreeService.openInNewWindow(selected.worktreePath);
    }
  }
}
