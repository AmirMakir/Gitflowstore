import { useState, useMemo } from 'react';
import type { BranchInfo } from '../hooks/useWorktrees';

interface Props {
  branches: BranchInfo[];
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
  onFetch: () => void;
}

export function BranchPicker({ branches, loading, value, onChange, onFetch }: Props) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch branches when dropdown opens
  const handleFocus = () => {
    setIsOpen(true);
    if (branches.length === 0) {
      onFetch();
    }
  };

  const filtered = useMemo(() => {
    if (!search) return branches;
    const q = search.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, search]);

  const localBranches = filtered.filter((b) => !b.isRemote);
  const remoteBranches = filtered.filter((b) => b.isRemote);

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full"
        placeholder={loading ? 'Loading branches...' : 'Search or select branch...'}
        value={isOpen ? search : value || search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={() => {
          // Delay to allow click on dropdown item
          setTimeout(() => setIsOpen(false), 200);
        }}
      />

      {isOpen && (
        <div
          className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded"
          style={{
            backgroundColor: 'var(--vscode-dropdown-background)',
            border: '1px solid var(--vscode-dropdown-border)',
          }}
        >
          {loading && (
            <div className="p-2 text-[11px] opacity-50">Loading...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="p-2 text-[11px] opacity-50">
              {search ? 'No matching branches' : 'No branches found'}
            </div>
          )}

          {localBranches.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] opacity-40 uppercase tracking-wider">
                Local
              </div>
              {localBranches.map((b) => (
                <BranchItem
                  key={b.name}
                  branch={b}
                  selected={value === b.name}
                  onClick={() => {
                    onChange(b.name);
                    setSearch('');
                    setIsOpen(false);
                  }}
                />
              ))}
            </>
          )}

          {remoteBranches.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] opacity-40 uppercase tracking-wider mt-1">
                Remote
              </div>
              {remoteBranches.map((b) => (
                <BranchItem
                  key={b.name}
                  branch={b}
                  selected={value === b.name}
                  onClick={() => {
                    onChange(b.name);
                    setSearch('');
                    setIsOpen(false);
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BranchItem({
  branch,
  selected,
  onClick,
}: {
  branch: BranchInfo;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="px-2 py-1.5 text-[12px] cursor-pointer transition-colors"
      style={{
        backgroundColor: selected
          ? 'var(--vscode-list-activeSelectionBackground)'
          : 'transparent',
        color: selected
          ? 'var(--vscode-list-activeSelectionForeground)'
          : 'var(--vscode-dropdown-foreground)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      onClick={onClick}
    >
      <span>{branch.name}</span>
      {branch.upstream && (
        <span className="ml-2 opacity-40 text-[10px]">{branch.upstream}</span>
      )}
    </div>
  );
}
