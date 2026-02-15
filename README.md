# GitFlow Store

Finally, a normal UI for git worktrees in VS Code.

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/AmirMakir.gitflow-store)](https://marketplace.visualstudio.com/items?itemName=AmirMakir.gitflow-store)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## The problem

If you work on multiple features or bugs at the same time, you know the pain. Stash your changes, checkout another branch, wait for deps to install, fix the bug, then go back and try to remember where you left off. It's awful.

Git worktrees fix this. Each branch lives in its own folder, fully independent. But almost nobody uses them because the only way to manage them is through the terminal, and it gets messy fast.

I built this extension because I got tired of juggling worktrees manually.

## What it does

It adds a sidebar panel to VS Code where you can see all your worktrees, create new ones, switch between them, and clean up old ones. Everything through the UI, no git commands.

### Dashboard

The sidebar shows cards for each worktree with the stuff you actually care about: branch name, how many files you changed, whether you're ahead/behind remote, and when the last commit was. Worktrees get tagged as active, idle, merged, or stale so you can tell what's going on at a glance.

### Creating worktrees

Hit the + button, pick a branch (or make a new one), and you're done. The extension can automatically copy over your `.env` files, symlink `node_modules` so you don't waste disk space, and run whatever setup commands you need. It opens in a new VS Code window by default.

### Quick Switch

Press `Ctrl+Shift+W` (or `Cmd+Shift+W` on Mac) to get a fuzzy search popup across all your worktrees. Think of it like `Ctrl+P` but for workspaces instead of files.

### Cleanup

Worktrees pile up. The cleanup view lets you filter by merged branches, stale worktrees, or prunable entries and delete them in batch. It warns you if something has uncommitted changes before you nuke it.

### Status Bar

Shows which worktree you're in and how many you have total. Click it to quick-switch.

## Settings

All settings live under `gitflowStore.*` in your VS Code settings:

| Setting | Default | What it does |
|---------|---------|-------------|
| `gitflowStore.autoSetup.copyFiles` | `[".env", ".env.local"]` | Files to copy when creating a worktree |
| `gitflowStore.autoSetup.symlinkDirs` | `[]` | Dirs to symlink instead of copy (like `node_modules`) |
| `gitflowStore.autoSetup.postCreateCommands` | `[]` | Commands to run after creation (like `npm install`) |
| `gitflowStore.autoSetup.openInNewWindow` | `true` | Open new worktree in a separate window |
| `gitflowStore.worktreeBasePath` | `""` | Where to put worktrees. Empty = next to your repo |
| `gitflowStore.pollIntervalSeconds` | `30` | How often to check remote status |
| `gitflowStore.staleThresholdDays` | `14` | Days of no commits before marking as stale |

## Commands

| Command | Keybinding | What it does |
|---------|------------|-------------|
| GitFlow Store: Create Worktree | | Create a new worktree |
| GitFlow Store: Quick Switch Worktree | `Ctrl+Shift+W` | Fuzzy search your worktrees |
| GitFlow Store: Open Worktree in New Window | | Open in a new VS Code window |
| GitFlow Store: Remove Worktree | | Delete a worktree (with safety checks) |
| GitFlow Store: Refresh Worktrees | | Refresh the dashboard |
| GitFlow Store: Cleanup Manager | | Open cleanup view |

## Requirements

- VS Code 1.85+
- Git 2.15+

## What's next

Right now I'm working on letting each worktree have its own AI agent session (Claude Code, Aider, etc). Also want to add worktree templates so you can save your setup and reuse it.

## Contributing

If something doesn't work or you have ideas, just open an issue on [GitHub](https://github.com/AmirMakir/Gitflowstore). PRs are welcome too.

## License

[MIT](LICENSE)
