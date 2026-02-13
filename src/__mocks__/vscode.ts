import { vi } from 'vitest';

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
  })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  workspaceFolders: [{ uri: { fsPath: '/mock/workspace' } }],
  createFileSystemWatcher: vi.fn(() => ({
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  })),
};

export const window = {
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  })),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showQuickPick: vi.fn(),
  createTerminal: vi.fn(() => ({
    show: vi.fn(),
    sendText: vi.fn(),
    dispose: vi.fn(),
  })),
  createStatusBarItem: vi.fn(() => ({
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
    text: '',
    tooltip: '',
    command: '',
  })),
  withProgress: vi.fn((_opts: unknown, task: (progress: { report: ReturnType<typeof vi.fn> }, token: { isCancellationRequested: boolean }) => Promise<unknown>) => {
    const progress = { report: vi.fn() };
    const token = { isCancellationRequested: false };
    return task(progress, token);
  }),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const env = {
  clipboard: { writeText: vi.fn() },
};

export const Uri = {
  file: vi.fn((p: string) => ({ fsPath: p, path: p })),
  joinPath: vi.fn((...args: Array<{ fsPath?: string } | string>) => {
    const parts = args.map((a) => (typeof a === 'string' ? a : (a as { fsPath?: string }).fsPath || ''));
    return { fsPath: parts.join('/'), path: parts.join('/') };
  }),
};

const _listeners: Array<() => void> = [];

export class EventEmitter {
  private _listeners: Array<(...args: unknown[]) => void> = [];
  event = vi.fn((listener: (...args: unknown[]) => void) => {
    this._listeners.push(listener);
    return { dispose: vi.fn() };
  });
  fire = vi.fn((...args: unknown[]) => {
    this._listeners.forEach((l) => l(...args));
  });
  dispose = vi.fn();
}

export const StatusBarAlignment = { Left: 1, Right: 2 };
export const ProgressLocation = { Notification: 15 };

export class RelativePattern {
  constructor(
    public base: unknown,
    public pattern: string
  ) {}
}

export class Disposable {
  static from(..._args: unknown[]) {
    return { dispose: vi.fn() };
  }
}
