import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('GitFlow Studio');
  }
  return outputChannel;
}

export function log(message: string): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  getOutputChannel().appendLine(`[${timestamp}] ${message}`);
}

export function logError(message: string, error?: unknown): void {
  const errorStr = error instanceof Error ? error.message : String(error ?? '');
  log(`[ERROR] ${message}${errorStr ? ': ' + errorStr : ''}`);
}

export function logCommand(args: string[], cwd?: string): void {
  const cmd = `git ${args.join(' ')}`;
  log(`[CMD] ${cmd}${cwd ? ` (cwd: ${cwd})` : ''}`);
}
