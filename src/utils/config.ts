import * as vscode from 'vscode';
import { CONFIG_SECTION } from '../shared/constants';
import type { ExtensionConfig } from '../shared/types';

export class ConfigManager {
  private get configuration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.configuration.get<T>(key, defaultValue as T);
  }

  getAll(): ExtensionConfig {
    return {
      copyFiles: this.get<string[]>('autoSetup.copyFiles', ['.env', '.env.local']),
      symlinkDirs: this.get<string[]>('autoSetup.symlinkDirs', []),
      postCreateCommands: this.get<string[]>('autoSetup.postCreateCommands', []),
      openInNewWindow: this.get<boolean>('autoSetup.openInNewWindow', true),
      worktreeBasePath: this.get<string>('worktreeBasePath', ''),
      pollIntervalSeconds: this.get<number>('pollIntervalSeconds', 30),
      staleThresholdDays: this.get<number>('staleThresholdDays', 14),
    };
  }

  onDidChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_SECTION)) {
        callback();
      }
    });
  }
}
