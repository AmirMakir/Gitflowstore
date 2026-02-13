import type { WorktreeCard as WorktreeCardType } from '../hooks/useWorktrees';

interface Props {
  worktree: WorktreeCardType;
  onOpen: (path: string) => void;
  onRemove: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onCopyPath: (path: string) => void;
}

const stateConfig = {
  active: {
    color: 'var(--vscode-charts-green, #89d185)',
    label: 'Active',
  },
  idle: {
    color: 'var(--vscode-charts-blue, #4fc1ff)',
    label: 'Idle',
  },
  merged: {
    color: 'var(--vscode-charts-purple, #b180d7)',
    label: 'Merged',
  },
  stale: {
    color: 'var(--vscode-charts-yellow, #cca700)',
    label: 'Stale',
  },
} as const;

export function WorktreeCard({ worktree, onOpen, onRemove, onOpenTerminal, onCopyPath }: Props) {
  const { color, label } = stateConfig[worktree.state];

  return (
    <div
      className="mb-2 rounded cursor-pointer transition-colors"
      style={{
        borderLeft: `3px solid ${color}`,
        backgroundColor: 'var(--vscode-editor-background)',
        padding: '10px 12px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--vscode-editor-background)';
      }}
      onClick={() => onOpen(worktree.path)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold truncate" style={{ color: 'var(--vscode-editor-foreground)' }}>
            {worktree.displayName}
          </span>
          {worktree.isMain && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--vscode-badge-background)',
                color: 'var(--vscode-badge-foreground)',
              }}
            >
              main
            </span>
          )}
        </div>
        <span className="text-[10px] opacity-60 ml-2 whitespace-nowrap" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Path */}
      <div
        className="text-[11px] mt-1 truncate opacity-50"
        title={worktree.path}
      >
        {worktree.path}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 mt-2 text-[11px] flex-wrap">
        {worktree.modifiedCount > 0 && (
          <span style={{ color: 'var(--vscode-charts-yellow, #cca700)' }}>
            {worktree.modifiedCount} modified
          </span>
        )}
        {worktree.stagedCount > 0 && (
          <span style={{ color: 'var(--vscode-charts-green, #89d185)' }}>
            {worktree.stagedCount} staged
          </span>
        )}
        {worktree.untrackedCount > 0 && (
          <span className="opacity-60">
            {worktree.untrackedCount} untracked
          </span>
        )}
        {worktree.ahead > 0 && (
          <span style={{ color: 'var(--vscode-charts-green, #89d185)' }}>
            +{worktree.ahead}
          </span>
        )}
        {worktree.behind > 0 && (
          <span style={{ color: 'var(--vscode-charts-red, #f14c4c)' }}>
            -{worktree.behind}
          </span>
        )}
      </div>

      {/* Last commit */}
      {worktree.lastCommit.message && (
        <div className="mt-2 text-[11px] opacity-50 truncate">
          {worktree.lastCommit.shortSha && (
            <span className="opacity-70">{worktree.lastCommit.shortSha} </span>
          )}
          {worktree.lastCommit.message}
          <span className="ml-2">{worktree.lastCommit.relativeDate}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 mt-2.5" onClick={(e) => e.stopPropagation()}>
        <ActionButton onClick={() => onOpen(worktree.path)} label="Open" primary />
        <ActionButton onClick={() => onOpenTerminal(worktree.path)} label="Terminal" />
        <ActionButton onClick={() => onCopyPath(worktree.path)} label="Copy Path" />
        {!worktree.isMain && (
          <ActionButton onClick={() => onRemove(worktree.path)} label="Remove" danger />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  primary,
  danger,
}: {
  onClick: () => void;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  let bg = 'var(--vscode-button-secondaryBackground)';
  let fg = 'var(--vscode-button-secondaryForeground)';
  let hoverBg = 'var(--vscode-button-secondaryHoverBackground)';

  if (primary) {
    bg = 'var(--vscode-button-background)';
    fg = 'var(--vscode-button-foreground)';
    hoverBg = 'var(--vscode-button-hoverBackground)';
  }
  if (danger) {
    bg = 'transparent';
    fg = 'var(--vscode-errorForeground)';
    hoverBg = 'rgba(255, 0, 0, 0.1)';
  }

  return (
    <button
      className="px-2 py-0.5 text-[11px] rounded transition-colors"
      style={{ backgroundColor: bg, color: fg }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bg;
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
