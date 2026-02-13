import { WorktreeCard } from './WorktreeCard';
import type { WorktreeCard as WorktreeCardType } from '../hooks/useWorktrees';

interface VSCodeApi {
  postMessage(message: unknown): void;
}

interface Props {
  worktrees: WorktreeCardType[];
  loading: boolean;
  error: string | null;
  vscode: VSCodeApi;
  onRefresh: () => void;
  onCreateClick: () => void;
  onCleanupClick: () => void;
}

export function WorktreeList({
  worktrees,
  loading,
  error,
  vscode,
  onRefresh,
  onCreateClick,
  onCleanupClick,
}: Props) {
  const handleOpen = (path: string) => {
    vscode.postMessage({ type: 'openWorktree', path });
  };

  const handleRemove = (path: string) => {
    vscode.postMessage({ type: 'removeWorktree', path });
  };

  const handleOpenTerminal = (path: string) => {
    vscode.postMessage({ type: 'openInTerminal', path });
  };

  const handleCopyPath = (path: string) => {
    vscode.postMessage({ type: 'copyPath', path });
  };

  // Loading state
  if (loading && worktrees.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 opacity-60">
          <LoadingSpinner />
          <span>Loading worktrees...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div
          className="p-3 rounded text-[12px]"
          style={{
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder)',
          }}
        >
          <div className="font-semibold mb-1">Error</div>
          <div>{error}</div>
          <button
            className="mt-2 px-3 py-1 rounded text-[11px]"
            style={{
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
            }}
            onClick={onRefresh}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (worktrees.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="opacity-50 mb-3">
          <svg width="48" height="48" viewBox="0 0 48 48" className="mx-auto mb-2 opacity-30">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M18 24h12M24 18v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="text-[13px]">No worktrees yet</div>
          <div className="text-[11px] mt-1">Create your first worktree to start working on multiple branches in parallel.</div>
        </div>
        <button
          className="px-4 py-1.5 rounded text-[12px]"
          style={{
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
          }}
          onClick={onCreateClick}
        >
          Create Worktree
        </button>
      </div>
    );
  }

  // Main list
  const mainWorktree = worktrees.find((w) => w.isMain);
  const otherWorktrees = worktrees.filter((w) => !w.isMain);

  return (
    <div className="p-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] opacity-60">
          {worktrees.length} worktree{worktrees.length !== 1 ? 's' : ''}
          {loading && <LoadingSpinner />}
        </span>
        <div className="flex gap-1">
          <MiniButton onClick={onCreateClick} label="New" />
          <MiniButton onClick={onCleanupClick} label="Cleanup" />
        </div>
      </div>

      {/* Main worktree first */}
      {mainWorktree && (
        <WorktreeCard
          worktree={mainWorktree}
          onOpen={handleOpen}
          onRemove={handleRemove}
          onOpenTerminal={handleOpenTerminal}
          onCopyPath={handleCopyPath}
        />
      )}

      {/* Other worktrees */}
      {otherWorktrees.map((wt) => (
        <WorktreeCard
          key={wt.path}
          worktree={wt}
          onOpen={handleOpen}
          onRemove={handleRemove}
          onOpenTerminal={handleOpenTerminal}
          onCopyPath={handleCopyPath}
        />
      ))}
    </div>
  );
}

function MiniButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      className="px-2 py-0.5 text-[10px] rounded transition-colors"
      style={{
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <span
      className="inline-block w-3 h-3 ml-1 rounded-full animate-spin"
      style={{
        border: '2px solid var(--vscode-foreground)',
        borderTopColor: 'transparent',
        opacity: 0.4,
      }}
    />
  );
}
