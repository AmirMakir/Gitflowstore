import { useState, useEffect } from 'react';
import { BranchPicker } from './BranchPicker';
import { useBranches } from '../hooks/useWorktrees';
import type { VSCodeApi } from '../hooks/useVSCodeApi';

interface Props {
  vscode: VSCodeApi;
  onBack: () => void;
}

export function CreateDialog({ vscode, onBack }: Props) {
  const { branches, loading: branchesLoading, fetch: fetchBranches } = useBranches(vscode);

  const [isNewBranch, setIsNewBranch] = useState(true);
  const [branchName, setBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [copyEnvFiles, setCopyEnvFiles] = useState(true);
  const [installDeps, setInstallDeps] = useState(false);
  const [openInNewWindow, setOpenInNewWindow] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'createResult') {
        setCreating(false);
        if (!message.success) {
          setError(message.error || 'Failed to create worktree');
        }
      } else if (message.type === 'error' && creating) {
        // Catch-all: if an error arrives while creating, unblock the button
        setCreating(false);
        setError(message.message || 'An unexpected error occurred');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [creating]);

  const handleCreate = () => {
    if (!branchName.trim()) return;

    setCreating(true);
    setError(null);

    vscode.postMessage({
      type: 'createWorktree',
      options: {
        branch: branchName.trim(),
        baseBranch: isNewBranch && baseBranch ? baseBranch : undefined,
        isNewBranch,
        copyEnvFiles,
        installDeps,
        openInNewWindow,
      },
    });
  };

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
        <span className="font-semibold text-[13px]">Create Worktree</span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-4">
        <ToggleButton
          active={isNewBranch}
          onClick={() => setIsNewBranch(true)}
          label="New Branch"
        />
        <ToggleButton
          active={!isNewBranch}
          onClick={() => setIsNewBranch(false)}
          label="Existing Branch"
        />
      </div>

      {/* Branch name */}
      <div className="mb-3">
        <label className="block text-[11px] opacity-60 mb-1">
          {isNewBranch ? 'New Branch Name' : 'Select Branch'}
        </label>
        {isNewBranch ? (
          <input
            type="text"
            className="w-full"
            placeholder="feature/my-feature"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            autoFocus
          />
        ) : (
          <BranchPicker
            branches={branches.filter((b) => !b.isRemote)}
            loading={branchesLoading}
            value={branchName}
            onChange={setBranchName}
            onFetch={fetchBranches}
          />
        )}
      </div>

      {/* Base branch (only for new branches) */}
      {isNewBranch && (
        <div className="mb-3">
          <label className="block text-[11px] opacity-60 mb-1">
            Base Branch (optional)
          </label>
          <BranchPicker
            branches={branches}
            loading={branchesLoading}
            value={baseBranch}
            onChange={setBaseBranch}
            onFetch={fetchBranches}
          />
        </div>
      )}

      {/* Options */}
      <div className="mb-4 space-y-2">
        <label className="block text-[11px] opacity-60 mb-1">Options</label>
        <Checkbox
          checked={copyEnvFiles}
          onChange={setCopyEnvFiles}
          label="Copy .env files"
        />
        <Checkbox
          checked={installDeps}
          onChange={setInstallDeps}
          label="Run post-create commands"
        />
        <Checkbox
          checked={openInNewWindow}
          onChange={setOpenInNewWindow}
          label="Open in new window"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-2 mb-3 rounded text-[11px]"
          style={{
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder)',
            color: 'var(--vscode-errorForeground)',
          }}
        >
          {error}
        </div>
      )}

      {/* Create button */}
      <button
        className="w-full py-1.5 rounded text-[12px] transition-colors"
        style={{
          backgroundColor: creating
            ? 'var(--vscode-button-secondaryBackground)'
            : 'var(--vscode-button-background)',
          color: creating
            ? 'var(--vscode-button-secondaryForeground)'
            : 'var(--vscode-button-foreground)',
          opacity: !branchName.trim() || creating ? 0.5 : 1,
        }}
        disabled={!branchName.trim() || creating}
        onClick={handleCreate}
      >
        {creating ? 'Creating...' : 'Create Worktree'}
      </button>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="flex-1 py-1 text-[11px] rounded transition-colors"
      style={{
        backgroundColor: active
          ? 'var(--vscode-button-background)'
          : 'var(--vscode-button-secondaryBackground)',
        color: active
          ? 'var(--vscode-button-foreground)'
          : 'var(--vscode-button-secondaryForeground)',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-[12px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="cursor-pointer"
        style={{ accentColor: 'var(--vscode-button-background)' }}
      />
      <span>{label}</span>
    </label>
  );
}
