import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager } from './config';
import * as vscode from 'vscode';

describe('ConfigManager', () => {
  let config: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    config = new ConfigManager();
  });

  // Test 34
  it('get returns configured value from workspace configuration', () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, _def?: unknown) => 30),
    } as unknown as vscode.WorkspaceConfiguration);

    const result = config.get<number>('staleThresholdDays', 14);

    expect(result).toBe(30);
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('gitflowStudio');
  });

  // Test 35
  it('getAll returns complete ExtensionConfig with all keys', () => {
    const mockGet = vi.fn((key: string) => {
      const values: Record<string, unknown> = {
        'autoSetup.copyFiles': ['.env'],
        'autoSetup.symlinkDirs': ['node_modules'],
        'autoSetup.postCreateCommands': ['npm install'],
        'autoSetup.openInNewWindow': false,
        'worktreeBasePath': '/custom/path',
        'pollIntervalSeconds': 60,
        'staleThresholdDays': 7,
      };
      return values[key];
    });

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockGet,
    } as unknown as vscode.WorkspaceConfiguration);

    const result = config.getAll();

    expect(result).toEqual({
      copyFiles: ['.env'],
      symlinkDirs: ['node_modules'],
      postCreateCommands: ['npm install'],
      openInNewWindow: false,
      worktreeBasePath: '/custom/path',
      pollIntervalSeconds: 60,
      staleThresholdDays: 7,
    });
  });
});
