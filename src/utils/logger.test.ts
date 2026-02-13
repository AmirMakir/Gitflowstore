import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

const appendLine = vi.fn();

vi.mocked(vscode.window.createOutputChannel).mockReturnValue({
  appendLine,
  show: vi.fn(),
  dispose: vi.fn(),
} as unknown as vscode.OutputChannel);

// Import logger AFTER setting up the mock, so it gets our mock output channel
import { log, logError } from './logger';

describe('logger', () => {
  beforeEach(() => {
    appendLine.mockClear();
  });

  // Test 40
  it('log writes timestamped message to output channel', () => {
    log('hello world');

    expect(appendLine).toHaveBeenCalledTimes(1);
    const msg = appendLine.mock.calls[0][0] as string;
    // Should match pattern [HH:MM:SS.mmm] hello world
    expect(msg).toMatch(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\] hello world$/);
  });

  // Test 41
  it('logError formats message with error details', () => {
    logError('operation failed', new Error('bad thing'));

    expect(appendLine).toHaveBeenCalledTimes(1);
    const msg = appendLine.mock.calls[0][0] as string;
    expect(msg).toContain('[ERROR] operation failed: bad thing');
  });
});
