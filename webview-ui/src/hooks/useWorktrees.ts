import { useState, useEffect, useCallback } from 'react';
import type { VSCodeApi } from './useVSCodeApi';

export interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  relativeDate: string;
}

export interface WorktreeCard {
  path: string;
  head: string;
  branch: string | null;
  branchShort: string;
  isBare: boolean;
  isDetached: boolean;
  isLocked: boolean;
  lockReason?: string;
  isPrunable: boolean;
  modifiedCount: number;
  untrackedCount: number;
  stagedCount: number;
  ahead: number;
  behind: number;
  lastCommit: CommitInfo;
  state: 'active' | 'idle' | 'merged' | 'stale';
  isMain: boolean;
  displayName: string;
}

export interface BranchInfo {
  name: string;
  isRemote: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  lastCommitDate: string;
}

export interface CleanupCandidate {
  worktree: WorktreeCard;
  reason: 'merged' | 'stale' | 'prunable';
  safeToDelete: boolean;
  details: string;
}

export function useWorktrees(vscode: VSCodeApi) {
  const [worktrees, setWorktrees] = useState<WorktreeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'worktreeData':
          setWorktrees(message.data);
          setLoading(false);
          setError(null);
          break;
        case 'error':
          setError(message.message);
          setLoading(false);
          break;
        case 'loading':
          setLoading(message.isLoading);
          break;
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'requestWorktrees' });

    return () => window.removeEventListener('message', handler);
  }, [vscode]);

  const refresh = useCallback(() => {
    setLoading(true);
    vscode.postMessage({ type: 'requestWorktrees' });
  }, [vscode]);

  return { worktrees, loading, error, refresh };
}

export function useBranches(vscode: VSCodeApi) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'branchData':
          setBranches(message.data);
          setLoading(false);
          setError(null);
          break;
        case 'error':
          if (loading) {
            setLoading(false);
            setError(message.message);
          }
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loading]);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    vscode.postMessage({ type: 'requestBranches' });
  }, [vscode]);

  return { branches, loading, error, fetch };
}

export interface CleanupResult {
  succeeded: string[];
  failed: Array<{ path: string; error: string }>;
}

export function useCleanup(vscode: VSCodeApi) {
  const [candidates, setCandidates] = useState<CleanupCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'cleanupData':
          setCandidates(message.data);
          setLoading(false);
          break;
        case 'cleanupResult':
          setLastResult({ succeeded: message.succeeded, failed: message.failed });
          setLoading(true);
          vscode.postMessage({ type: 'requestCleanupAnalysis' });
          break;
        case 'error':
          setLoading(false);
          break;
        case 'loading':
          setLoading(message.isLoading);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [vscode]);

  const analyze = useCallback(() => {
    setLoading(true);
    vscode.postMessage({ type: 'requestCleanupAnalysis' });
  }, [vscode]);

  const batchRemove = useCallback(
    (paths: string[]) => {
      setLoading(true);
      vscode.postMessage({ type: 'batchRemove', paths });
    },
    [vscode]
  );

  const clearResult = useCallback(() => setLastResult(null), []);

  return { candidates, loading, analyze, batchRemove, lastResult, clearResult };
}
