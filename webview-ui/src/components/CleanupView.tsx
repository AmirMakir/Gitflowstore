import { useState, useEffect } from 'react';
import { useCleanup } from '../hooks/useWorktrees';
import type { CleanupCandidate } from '../hooks/useWorktrees';
import type { VSCodeApi } from '../hooks/useVSCodeApi';

interface Props {
  vscode: VSCodeApi;
  onBack: () => void;
}

type FilterType = 'all' | 'merged' | 'stale' | 'prunable';

export function CleanupView({ vscode, onBack }: Props) {
  const { candidates, loading, analyze, batchRemove, lastResult, clearResult } = useCleanup(vscode);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('all');
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    analyze();
  }, [analyze]);

  // Clear selection when candidates update after removal
  useEffect(() => {
    setSelectedPaths(new Set());
    setConfirmingRemove(false);
  }, [candidates]);

  // Clear selection when filter changes so hidden items aren't selected
  useEffect(() => {
    setSelectedPaths(new Set());
    setConfirmingRemove(false);
  }, [filter]);

  const filtered = candidates.filter(
    (c) => filter === 'all' || c.reason === filter
  );

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPaths.size === filtered.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(filtered.map((c) => c.worktree.path)));
    }
  };

  const handleBatchRemove = () => {
    if (selectedPaths.size === 0) return;

    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }

    clearResult();
    batchRemove(Array.from(selectedPaths));
    setConfirmingRemove(false);
  };

  const countByReason = (reason: string) =>
    candidates.filter((c) => c.reason === reason).length;

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className="text-[12px] opacity-60 hover:opacity-100 transition-opacity"
          onClick={onBack}
        >
          &larr; Back
        </button>
        <span className="font-semibold text-[13px]">Cleanup Manager</span>
      </div>

      {/* Last result notification */}
      {lastResult && (
        <div
          className="p-2 mb-3 rounded text-[11px]"
          style={{
            backgroundColor: lastResult.failed.length > 0
              ? 'var(--vscode-inputValidation-warningBackground)'
              : 'var(--vscode-editor-background)',
            border: lastResult.failed.length > 0
              ? '1px solid var(--vscode-inputValidation-warningBorder)'
              : '1px solid var(--vscode-focusBorder)',
          }}
        >
          {lastResult.succeeded.length > 0 && (
            <div style={{ color: 'var(--vscode-charts-green, #89d185)' }}>
              Removed {lastResult.succeeded.length} worktree{lastResult.succeeded.length !== 1 ? 's' : ''}
            </div>
          )}
          {lastResult.failed.map((f) => (
            <div key={f.path} style={{ color: 'var(--vscode-errorForeground)' }}>
              Failed: {f.path.split(/[/\\]/).pop()} — {f.error}
            </div>
          ))}
          <button
            className="mt-1 text-[10px] opacity-50 hover:opacity-100"
            onClick={clearResult}
          >
            dismiss
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        <FilterTab
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="All"
          count={candidates.length}
        />
        <FilterTab
          active={filter === 'merged'}
          onClick={() => setFilter('merged')}
          label="Merged"
          count={countByReason('merged')}
          color="var(--vscode-charts-purple, #b180d7)"
        />
        <FilterTab
          active={filter === 'stale'}
          onClick={() => setFilter('stale')}
          label="Stale"
          count={countByReason('stale')}
          color="var(--vscode-charts-yellow, #cca700)"
        />
        <FilterTab
          active={filter === 'prunable'}
          onClick={() => setFilter('prunable')}
          label="Prunable"
          count={countByReason('prunable')}
          color="var(--vscode-charts-red, #f14c4c)"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-[12px] opacity-50 py-4 text-center">
          Analyzing worktrees...
        </div>
      )}

      {/* Empty state */}
      {!loading && candidates.length === 0 && (
        <div className="text-center py-6">
          <div className="text-[13px] opacity-50 mb-1">All clean!</div>
          <div className="text-[11px] opacity-30">
            No worktrees need cleanup.
          </div>
        </div>
      )}

      {/* Candidates list */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Select all */}
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer text-[11px]">
              <input
                type="checkbox"
                checked={selectedPaths.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
                style={{ accentColor: 'var(--vscode-button-background)' }}
              />
              <span className="opacity-60">Select all ({filtered.length})</span>
            </label>
          </div>

          {/* List */}
          {filtered.map((candidate) => (
            <CleanupItem
              key={candidate.worktree.path}
              candidate={candidate}
              selected={selectedPaths.has(candidate.worktree.path)}
              onToggle={() => toggleSelect(candidate.worktree.path)}
            />
          ))}

          {/* Batch remove button */}
          {selectedPaths.size > 0 && (
            <div className="flex gap-2 mt-3">
              <button
                className="flex-1 py-1.5 rounded text-[12px] transition-colors"
                style={{
                  backgroundColor: confirmingRemove
                    ? 'var(--vscode-errorForeground)'
                    : 'var(--vscode-button-background)',
                  color: confirmingRemove ? '#fff' : 'var(--vscode-button-foreground)',
                }}
                onClick={handleBatchRemove}
              >
                {confirmingRemove
                  ? `Confirm delete ${selectedPaths.size}?`
                  : `Remove ${selectedPaths.size} worktree${selectedPaths.size !== 1 ? 's' : ''}`}
              </button>
              {confirmingRemove && (
                <button
                  className="px-3 py-1.5 rounded text-[12px]"
                  style={{
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                  }}
                  onClick={() => setConfirmingRemove(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      className="px-2 py-0.5 text-[10px] rounded transition-colors"
      style={{
        backgroundColor: active
          ? 'var(--vscode-button-background)'
          : 'var(--vscode-button-secondaryBackground)',
        color: active
          ? 'var(--vscode-button-foreground)'
          : color || 'var(--vscode-button-secondaryForeground)',
      }}
      onClick={onClick}
    >
      {label} ({count})
    </button>
  );
}

function CleanupItem({
  candidate,
  selected,
  onToggle,
}: {
  candidate: CleanupCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  const { worktree, reason, safeToDelete, details } = candidate;

  const reasonColors = {
    merged: 'var(--vscode-charts-purple, #b180d7)',
    stale: 'var(--vscode-charts-yellow, #cca700)',
    prunable: 'var(--vscode-charts-red, #f14c4c)',
  };

  return (
    <div
      className="flex items-start gap-2 p-2 mb-1 rounded transition-colors cursor-pointer"
      style={{
        backgroundColor: selected
          ? 'var(--vscode-list-activeSelectionBackground)'
          : 'var(--vscode-editor-background)',
      }}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-0.5 cursor-pointer"
        style={{ accentColor: 'var(--vscode-button-background)' }}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium truncate">
            {worktree.displayName}
          </span>
          <span
            className="text-[9px] px-1 py-0.5 rounded uppercase"
            style={{
              color: reasonColors[reason],
              border: `1px solid ${reasonColors[reason]}`,
              opacity: 0.8,
            }}
          >
            {reason}
          </span>
        </div>
        <div className="text-[11px] opacity-50 mt-0.5">{details}</div>
        {!safeToDelete && (
          <div
            className="text-[10px] mt-1"
            style={{ color: 'var(--vscode-charts-yellow, #cca700)' }}
          >
            Has uncommitted changes
          </div>
        )}
      </div>
    </div>
  );
}
