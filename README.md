# GitFlow Studio

Visual git worktree manager with AI agent integration for VS Code.

## The Problem

Developers using AI agents (Claude Code, Copilot CLI, Aider) face a fundamental limitation: **one working directory = one branch = one agent**. Switching between tasks requires stash, checkout, losing agent context, and rebuilding dependencies.

Git worktrees solve this elegantly — each branch lives in its own directory. But less than 5% of developers use them because management is CLI-only with no visual tools.

## The Solution

GitFlow Studio provides a **visual dashboard** for managing git worktrees, designed for parallel AI-agent workflows.

Each worktree is an isolated workspace with its own branch, state, and (soon) AI session — like browser tabs, but for branches.

## Features

### Visual Worktree Dashboard
Sidebar panel with cards for all worktrees showing:
- Branch name and path
- Uncommitted changes count
- Ahead/behind remote
- Last commit info
- Status: active / idle / merged / stale

### One-Click Worktree Creation
- Pick existing branch or create new from any base
- Auto-setup: copy `.env` files, create symlinks, run install commands
- Open in new VS Code window automatically

### Quick Switch (`Ctrl+Shift+W`)
Fuzzy search across all worktrees — like `Ctrl+P` for files, but for workspaces.

### Cleanup Manager
- Filter by: merged branches, stale worktrees, prunable entries
- Batch delete with safety warnings for uncommitted changes

### Auto-Setup Pipeline
Configurable per-project in `settings.json`:
- Copy config files (`.env`, `.env.local`)
- Symlink heavy directories (`node_modules`, `.venv`)
- Run post-create commands (`npm install`, `pip install`)

### Status Bar
Shows current worktree and total count. Click to quick-switch.

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `gitflowStudio.autoSetup.copyFiles` | `[".env", ".env.local"]` | Files to copy from main worktree |
| `gitflowStudio.autoSetup.symlinkDirs` | `[]` | Directories to symlink instead of copying |
| `gitflowStudio.autoSetup.postCreateCommands` | `[]` | Commands to run after creation |
| `gitflowStudio.autoSetup.openInNewWindow` | `true` | Open new worktree in new window |
| `gitflowStudio.worktreeBasePath` | `""` | Base directory for worktrees (empty = sibling to repo) |
| `gitflowStudio.pollIntervalSeconds` | `30` | Remote status polling interval |
| `gitflowStudio.staleThresholdDays` | `14` | Days before a worktree is marked stale |

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| GitFlow Studio: Create Worktree | — | Open creation form |
| GitFlow Studio: Quick Switch Worktree | `Ctrl+Shift+W` | Fuzzy search worktrees |
| GitFlow Studio: Refresh Worktrees | — | Refresh dashboard data |
| GitFlow Studio: Cleanup Manager | — | Open cleanup view |

## Requirements

- VS Code 1.85+
- Git installed and available in PATH

## Roadmap

- **v0.2** — Per-worktree AI sessions (Claude Code, Aider integration)
- **v0.3** — Worktree templates, branch comparison view

## License

MIT
