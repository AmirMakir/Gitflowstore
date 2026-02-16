# Changelog

All notable changes to GitFlow Store will be documented in this file.

## [0.1.4] - 2026-02-16

### Fixed

- Newly created branches pointing to the same commit as main are no longer falsely flagged as "merged" in the cleanup manager and worktree dashboard

## [0.1.3] - 2026-02-15

### Changed

- Version bump release

## [0.1.2] - 2026-02-15

### Changed

- Package manifest formatting cleanup

## [0.1.1] - 2026-02-15

### Fixed

- Cleanup manager details message now includes staged files in the uncommitted changes count
- Setup pipeline no longer crashes when git returns an empty worktree list

## [0.1.0] - 2025-02-14

### Added

- Visual Worktree Dashboard with real-time status cards
- One-click worktree creation with branch picker and auto-setup
- Quick Switch via `Ctrl+Shift+W` / `Cmd+Shift+W`
- Cleanup Manager for merged, stale, and prunable worktrees
- Auto-setup pipeline: copy files, symlink directories, run post-create commands
- Status bar integration showing current worktree and count
- Configurable settings for polling interval, stale threshold, and base path
- Open worktree in new VS Code window
