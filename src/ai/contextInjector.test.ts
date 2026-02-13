import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextInjector } from './contextInjector';

vi.mock('../utils/logger', () => ({
  log: vi.fn(),
  logError: vi.fn(),
  logCommand: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

import * as fs from 'fs/promises';

const mockWriteFile = vi.mocked(fs.writeFile);
const mockUnlink = vi.mocked(fs.unlink);

describe('ContextInjector', () => {
  let injector: ContextInjector;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    injector = new ContextInjector();
  });

  // Test 49
  it('inject writes markdown file with description, issue URL, and prompt', async () => {
    await injector.inject('/wt/path', {
      description: 'Fix login bug',
      issueUrl: 'https://github.com/repo/issues/42',
      prompt: 'Focus on auth module',
    });

    expect(mockWriteFile).toHaveBeenCalledTimes(1);

    const [filePath, content] = mockWriteFile.mock.calls[0];
    expect(String(filePath)).toContain('.claude-task-context.md');
    const text = String(content);
    expect(text).toContain('# Task Context');
    expect(text).toContain('## Description');
    expect(text).toContain('Fix login bug');
    expect(text).toContain('## Issue');
    expect(text).toContain('https://github.com/repo/issues/42');
    expect(text).toContain('## Prompt');
    expect(text).toContain('Focus on auth module');
  });

  // Test 50
  it('remove deletes context file and silently handles missing file', async () => {
    // Case A: file exists
    mockUnlink.mockResolvedValue(undefined);
    await injector.remove('/wt/path');
    expect(mockUnlink).toHaveBeenCalledTimes(1);
    expect(String(mockUnlink.mock.calls[0][0])).toContain('.claude-task-context.md');

    // Case B: file does not exist (ENOENT)
    mockUnlink.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    await expect(injector.remove('/wt/path2')).resolves.toBeUndefined();
  });
});
