# bonvoy Rollback Feature

> Automatic and manual rollback of failed releases.

## Problem

When a release fails mid-way (e.g., git push succeeds but npm publish fails), the repository is left in an inconsistent state. Currently, recovery is manual: delete tags, revert commits, unpublish packages, delete GitHub releases — all by hand.

## Solution

An **action log** records every side-effect during a release. On failure, bonvoy automatically rolls back all completed actions in reverse order. A `bonvoy rollback` command provides manual rollback as a safety net.

## Architecture

### Action Log

Every destructive operation is recorded incrementally to `.bonvoy/release-log.json` as it happens (not at the end). Each entry contains enough information to reverse the operation.

```typescript
interface ActionEntry {
  plugin: string;          // e.g. 'git', 'npm', 'github', 'gitlab'
  action: string;          // e.g. 'commit', 'tag', 'push', 'publish', 'release'
  timestamp: string;       // ISO 8601
  data: Record<string, unknown>; // Action-specific data for reversal
  status: 'completed' | 'failed';
}

interface ReleaseLog {
  startedAt: string;
  config: {
    tagFormat: string;
    rootPath: string;
  };
  packages: Array<{
    name: string;
    from: string;
    to: string;
  }>;
  actions: ActionEntry[];
  status: 'in-progress' | 'completed' | 'rolled-back' | 'rollback-failed';
}
```

### Reversible Actions

| Plugin | Action | Rollback | Notes |
|--------|--------|----------|-------|
| npm | `publish` | `npm unpublish <pkg>@<version>` | **Runs first**. 72h limit. If fails → skip git rollback |
| github | `release` | `DELETE /repos/{owner}/{repo}/releases/{id}` | Requires release ID in log |
| gitlab | `release` | `DELETE /projects/{id}/releases/{tag}` | Requires project ID in log |
| git | `commit` | `git reset HEAD~1 --hard` | **Runs last**. Skipped if npm unpublish failed |
| git | `tag` (local) | `git tag -d <tag>` | Skipped if npm unpublish failed |
| git | `push` (commits) | `git push --force-with-lease` | Skipped if npm unpublish failed |
| git | `push` (tags) | `git push --delete origin <tag>` | Skipped if npm unpublish failed |
| changelog | `write` | No-op | Covered by git reset |

### Rollback Order

Rollback runs in this order: **npm → github/gitlab → git**.

If npm unpublish fails, git rollback is **skipped** to keep git state consistent with what's published on npm. This prevents the situation where packages are live on npm but git tags/commits are reverted.

Plugin registration order enforces this: npm and github are registered before git, so tapable calls their rollback hooks first. The `RollbackContext.npmFailed` flag signals git to skip.

### Action Log Data per Action

```typescript
// git commit
{ commitSha: string }

// git tag
{ tags: string[] }

// git push (commits)
{ previousSha: string; branch: string }

// git push (tags)
{ tags: string[] }

// npm publish
{ packages: Array<{ name: string; version: string }> }

// github release
{ releases: Array<{ tag: string; id: number; owner: string; repo: string }> }

// gitlab release
{ releases: Array<{ tag: string; projectId: string; host: string }> }
```

## Hook Integration

New hook in the release lifecycle:

```typescript
interface ReleaseHooks {
  // ... existing hooks ...
  rollback: Hook<[RollbackContext], void>;
}

interface RollbackContext extends Context {
  actionLog: ActionEntry[];
  errors: Error[];       // Errors that triggered rollback
}
```

Each plugin taps into `rollback` to undo its own actions. The core iterates actions in reverse order, calling the responsible plugin for each.

### ActionLog on Context

The `Context` interface gets an `actionLog` helper:

```typescript
interface Context {
  // ... existing fields ...
  actionLog: {
    record(entry: Omit<ActionEntry, 'timestamp' | 'status'>): void;
    entries(): ActionEntry[];
  };
}
```

Plugins call `context.actionLog.record(...)` after each successful side-effect. The log is flushed to disk after every write.

## Behavior

### Automatic Rollback (on failure)

1. An error occurs during any hook (e.g., `publish` throws)
2. The shipit command catches the error
3. Reads the action log from context
4. Calls `hooks.rollback.promise(rollbackContext)` — plugins undo their actions in reverse
5. Updates `.bonvoy/release-log.json` status to `rolled-back` or `rollback-failed`
6. Logs what was rolled back and what failed
7. Re-throws the original error

### Manual Rollback (`bonvoy rollback`)

```bash
bonvoy rollback              # Rollback last release using .bonvoy/release-log.json
bonvoy rollback --dry-run    # Preview what would be rolled back
```

1. Reads `.bonvoy/release-log.json`
2. Validates the log exists and status is `in-progress` or `completed`
3. Initializes plugins and calls `hooks.rollback.promise(rollbackContext)`
4. Updates log status
5. Reports results

### Dry-run

`bonvoy rollback --dry-run` reads the action log and prints what would be undone without executing anything.

## Edge Cases

### npm unpublish limitations
- Only works within 72 hours of publish
- Fails if other packages depend on the published version
- Treated as **best-effort**: warn on failure, don't abort the rest of the rollback

### Partial rollback
- If rollback itself fails (e.g., can't delete remote tag), log the failure and continue with remaining actions
- Final status becomes `rollback-failed` with details of what couldn't be undone
- User gets a clear list of what to fix manually

### No action log found
- `bonvoy rollback` prints a clear error: "No release log found at .bonvoy/release-log.json"

### Already rolled back
- If status is `rolled-back`, print "Already rolled back" and exit

### Stale log / previous run
- Single file, overwritten at the start of each release
- Before overwriting, if the previous log has status `in-progress`, shipit warns: "⚠️ Previous release may have failed — run `bonvoy rollback` first or use `--force`" and aborts
- `--force` flag on shipit skips this check and overwrites

## CLI

```bash
bonvoy rollback              # Rollback last release
bonvoy rollback --dry-run    # Preview rollback actions
bonvoy rollback --force      # Skip confirmation prompt
```

## File Location

`.bonvoy/release-log.json` — same directory as `release-pr.json`, already gitignored.

## Implementation Plan

### Step 1: ActionLog in Core
- Add `ActionLog` class to `@bonvoy/core`
- Add `actionLog` to `Context` interface
- Add `rollback` hook to `ReleaseHooks`
- Write log to disk incrementally

### Step 2: Plugin Integration
- `plugin-git`: record commit, tag, push actions + rollback handler
- `plugin-npm`: record publish actions + rollback handler (best-effort unpublish)
- `plugin-github`: record release creation + rollback handler (delete release)
- `plugin-gitlab`: record release creation + rollback handler (delete release)

### Step 3: Auto-rollback in shipit
- Wrap hook execution in try/catch
- On error: trigger rollback, update log, re-throw

### Step 4: `bonvoy rollback` command
- New command in `@bonvoy/cli`
- Read log, initialize plugins, execute rollback
- `--dry-run` and `--force` flags

### Step 5: Tests
- Unit tests per plugin rollback handler
- Integration test: simulate failure mid-release, verify rollback
- Edge cases: npm unpublish failure, missing log, already rolled back

---

*Feature: Rollback*
*Status: ✅ Implemented*
*Depends on: @bonvoy/core, all default plugins*
