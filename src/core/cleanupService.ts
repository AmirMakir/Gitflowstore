import { GitService } from './gitService';
import { WorktreeService } from './worktreeService';
import { ConfigManager } from '../utils/config';
import { logError } from '../utils/logger';
import type { CleanupCandidate } from '../shared/types';

export class CleanupService {
  constructor(
    private git: GitService,
    private worktreeService: WorktreeService,
    private config: ConfigManager
  ) {}

  async analyze(): Promise<CleanupCandidate[]> {
    const worktrees = await this.worktreeService.getAll(true);
    const mergedBranches = await this.git.getMergedBranches().catch(() => [] as string[]);
    const staleThreshold = this.config.get<number>('staleThresholdDays', 14);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleThreshold);

    const candidates: CleanupCandidate[] = [];

    for (const wt of worktrees) {
      if (wt.isMain) continue;

      if (wt.isPrunable) {
        candidates.push({
          worktree: wt,
          reason: 'prunable',
          safeToDelete: true,
          details: 'Worktree directory no longer exists on disk',
        });
        continue;
      }

      const hasChanges =
        wt.modifiedCount > 0 || wt.untrackedCount > 0 || wt.stagedCount > 0;

      if (mergedBranches.includes(wt.branchShort)) {
        candidates.push({
          worktree: wt,
          reason: 'merged',
          safeToDelete: !hasChanges,
          details: hasChanges
            ? `Merged but has ${wt.modifiedCount + wt.untrackedCount} uncommitted changes`
            : 'Branch has been merged',
        });
      } else if (wt.lastCommit.date) {
        const commitDate = new Date(wt.lastCommit.date);
        if (commitDate < cutoff) {
          const daysSince = Math.floor(
            (Date.now() - commitDate.getTime()) / 86400000
          );
          candidates.push({
            worktree: wt,
            reason: 'stale',
            safeToDelete: !hasChanges,
            details: `No commits for ${daysSince} days`,
          });
        }
      }
    }

    return candidates;
  }

  async batchRemove(
    paths: string[]
  ): Promise<{ succeeded: string[]; failed: Array<{ path: string; error: string }> }> {
    const succeeded: string[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    for (const p of paths) {
      try {
        await this.git.removeWorktree(p, true);
        succeeded.push(p);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logError(`Failed to remove worktree: ${p}`, err);
        failed.push({ path: p, error: message });
      }
    }

    if (succeeded.length > 0) {
      await this.git.pruneWorktrees().catch(() => {});
      await this.worktreeService.refresh();
    }

    return { succeeded, failed };
  }
}
