import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupPipeline } from './setupPipeline';
import type { ConfigManager } from '../utils/config';
import * as vscode from 'vscode';

vi.mock('../utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
}));

const mockCopyFiles = vi.fn().mockResolvedValue(undefined);
const mockCreateSymlinks = vi.fn().mockResolvedValue(undefined);

vi.mock('../utils/fileOps', () => ({
  copyFiles: (...args: unknown[]) => mockCopyFiles(...args),
  createSymlinks: (...args: unknown[]) => mockCreateSymlinks(...args),
}));

function createMockConfig(values: Record<string, unknown> = {}) {
  return {
    get: vi.fn((key: string, defaultValue?: unknown) => {
      return key in values ? values[key] : defaultValue;
    }),
  } as unknown as ConfigManager;
}

describe('SetupPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 30
  it('run skips entirely when no steps are generated', async () => {
    const config = createMockConfig({
      'autoSetup.copyFiles': [],
      'autoSetup.symlinkDirs': [],
      'autoSetup.postCreateCommands': [],
    });

    const pipeline = new SetupPipeline(config, '/main/repo');
    await pipeline.run('/wt/path', { copyEnvFiles: false, installDeps: false });

    expect(vscode.window.withProgress).not.toHaveBeenCalled();
  });

  // Test 31
  it('run creates copy step when copyEnvFiles is enabled', async () => {
    const config = createMockConfig({
      'autoSetup.copyFiles': ['.env', '.env.local'],
      'autoSetup.symlinkDirs': [],
      'autoSetup.postCreateCommands': [],
    });

    const pipeline = new SetupPipeline(config, '/main/repo');
    await pipeline.run('/wt/path', { copyEnvFiles: true, installDeps: false });

    expect(vscode.window.withProgress).toHaveBeenCalled();
    expect(mockCopyFiles).toHaveBeenCalledWith('/main/repo', '/wt/path', ['.env', '.env.local']);
  });

  // Test 32
  it('run creates symlink step when symlinkDirs is configured', async () => {
    const config = createMockConfig({
      'autoSetup.copyFiles': [],
      'autoSetup.symlinkDirs': ['node_modules', '.venv'],
      'autoSetup.postCreateCommands': [],
    });

    const pipeline = new SetupPipeline(config, '/main/repo');
    await pipeline.run('/wt/path', { copyEnvFiles: false, installDeps: false });

    expect(mockCreateSymlinks).toHaveBeenCalledWith('/main/repo', '/wt/path', ['node_modules', '.venv']);
  });

  // Test 33
  it('run respects cancellation token', async () => {
    const config = createMockConfig({
      'autoSetup.copyFiles': ['.env'],
      'autoSetup.symlinkDirs': ['node_modules'],
      'autoSetup.postCreateCommands': [],
    });

    // Override withProgress to cancel after first step
    vi.mocked(vscode.window.withProgress).mockImplementation(
      async (_opts: unknown, task: Function) => {
        const progress = { report: vi.fn() };
        const token = { isCancellationRequested: false };

        // Make copyFiles set cancellation to true
        mockCopyFiles.mockImplementation(async () => {
          token.isCancellationRequested = true;
        });

        return task(progress, token);
      }
    );

    const pipeline = new SetupPipeline(config, '/main/repo');
    await pipeline.run('/wt/path', { copyEnvFiles: true, installDeps: false });

    expect(mockCopyFiles).toHaveBeenCalled();
    expect(mockCreateSymlinks).not.toHaveBeenCalled();
  });
});
