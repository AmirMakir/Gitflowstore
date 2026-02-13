// AI Session Badge — Phase 2 placeholder
// Will display AI agent status per worktree (running/paused/stopped)
// and provide controls to start/stop/switch AI sessions.

interface Props {
  agentType?: string;
  status?: 'running' | 'paused' | 'stopped';
}

export function AiSessionBadge({ agentType, status }: Props) {
  if (!agentType || !status) {
    return null;
  }

  const statusColors = {
    running: 'var(--vscode-charts-green, #89d185)',
    paused: 'var(--vscode-charts-yellow, #cca700)',
    stopped: 'var(--vscode-charts-red, #f14c4c)',
  };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
      style={{
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: statusColors[status] }}
      />
      {agentType}
    </span>
  );
}
