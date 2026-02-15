# GitFlow Store

**Visual git worktree manager for VS Code** — run multiple branches side-by-side, each in its own isolated workspace.

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/AmirMakir.gitflow-store)](https://marketplace.visualstudio.com/items?itemName=AmirMakir.gitflow-store)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why Worktrees?

Developers using AI agents (Claude Code, Copilot, Aider) hit a wall: **one directory = one branch = one agent**. Switching tasks means stashing, checking out, losing context, and rebuilding.

[Git worktrees](https://git-scm.com/docs/git-worktree) solve this — each branch gets its own folder. But managing them is CLI-only with zero visual tooling. **Less than 5% of developers use them.**

GitFlow Store changes that with a visual dashboard built into VS Code.

---

## Features

### Worktree Dashboard

A sidebar panel showing all your worktrees at a glance:

- Branch name and file path
- Uncommitted changes count
- Ahead/behind remote tracking
- Last commit message and timestamp
- Status badges: **active** / **idle** / **merged** / **stale**

### One-Click Creation

Create new worktrees without touching the terminal:

- Pick an existing branch or create a new one from any base
- Auto-setup: copy `.env` files, symlink `node_modules`, run install commands
- Optionally open in a new VS Code window

### Quick Switch (`Ctrl+Shift+W` / `Cmd+Shift+W`)

Fuzzy search across all worktrees — like `Ctrl+P` for files, but for workspaces.

### Cleanup Manager

Keep your repo tidy:

- Filter by: merged branches, stale worktrees, prunable entries
- Batch delete with safety warnings for uncommitted changes

### Auto-Setup Pipeline

Configure per-project automation in `settings.json`:

- **Copy files** — `.env`, `.env.local`, config files
- **Symlink directories** — `node_modules`, `.venv` (saves disk space)
- **Post-create commands** — `npm install`, `pip install -r requirements.txt`

### Status Bar Integration

Shows current worktree name and total count. Click to quick-switch.

---

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `gitflowStore.autoSetup.copyFiles` | `[".env", ".env.local"]` | Files to copy from main worktree |
| `gitflowStore.autoSetup.symlinkDirs` | `[]` | Directories to symlink instead of copying |
| `gitflowStore.autoSetup.postCreateCommands` | `[]` | Shell commands to run after creation |
| `gitflowStore.autoSetup.openInNewWindow` | `true` | Open new worktree in a new VS Code window |
| `gitflowStore.worktreeBasePath` | `""` | Base directory for worktrees (empty = sibling to repo) |
| `gitflowStore.pollIntervalSeconds` | `30` | Interval (seconds) for remote status polling |
| `gitflowStore.staleThresholdDays` | `14` | Days before a worktree is marked stale |

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| GitFlow Store: Create Worktree | — | Open the worktree creation form |
| GitFlow Store: Quick Switch Worktree | `Ctrl+Shift+W` | Fuzzy search and switch worktrees |
| GitFlow Store: Open Worktree in New Window | — | Open a worktree in a separate VS Code window |
| GitFlow Store: Remove Worktree | — | Delete a worktree with safety checks |
| GitFlow Store: Refresh Worktrees | — | Refresh the dashboard data |
| GitFlow Store: Cleanup Manager | — | Open the cleanup view |

## Requirements

- **VS Code** 1.85 or later
- **Git** 2.15+ installed and available in PATH

## Roadmap

- **v0.2** — Per-worktree AI sessions (Claude Code, Aider integration)
- **v0.3** — Worktree templates, branch comparison view

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/AmirMakir/Gitflowstore).

## License

[MIT](LICENSE)
