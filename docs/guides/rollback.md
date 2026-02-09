# Rollback & Recovery

bonvoy tracks every action during a release. If something fails mid-way, it automatically rolls back completed actions. You can also trigger a manual rollback.

## How It Works

API calls to GitHub and GitLab are automatically retried up to 3 times with exponential backoff before giving up. This handles transient errors (rate limiting, server errors) without triggering a rollback.

If an operation still fails after retries, bonvoy rolls back:

During `bonvoy shipit`, every action (git commit, tag, push, npm publish, GitHub/GitLab release) is recorded to `.bonvoy/release-log.json`. If a failure occurs:

1. bonvoy stops the release
2. reads the action log to see what was completed
3. rolls back each action in reverse order
4. marks the log as `failed`

```
commit → tag → push → npm publish → GitHub release ✗
                                          ↓
                              auto-rollback starts
                                          ↓
         unpublish ← force-push ← delete tags ← reset HEAD
```

## Action Log

The release log is written to `.bonvoy/release-log.json` and updated incrementally as each action completes:

```json
{
  "status": "in-progress",
  "startedAt": "2026-02-09T15:30:00.000Z",
  "entries": [
    { "plugin": "git", "action": "commit", "data": { "sha": "abc123", "previousSha": "def456" }, "timestamp": "...", "status": "completed" },
    { "plugin": "git", "action": "tag", "data": { "tag": "@bonvoy/core@1.2.0" }, "timestamp": "...", "status": "completed" },
    { "plugin": "npm", "action": "publish", "data": { "name": "@bonvoy/core", "version": "1.2.0" }, "timestamp": "...", "status": "completed" }
  ]
}
```

### Stale Log Detection

If a previous release log has `"status": "in-progress"`, bonvoy aborts with a warning — a previous release may have crashed without cleanup. Use `--force` to override:

```bash
bonvoy shipit --force    # ignore stale log and proceed
```

## Manual Rollback

Roll back the last release using the action log:

```bash
bonvoy rollback              # roll back from .bonvoy/release-log.json
bonvoy rollback --dry-run    # preview what would be rolled back
bonvoy rollback --force      # skip stale log check
```

## What Gets Rolled Back

Each plugin handles its own rollback:

| Plugin | Action | Rollback |
|--------|--------|----------|
| **git** | `commit` | `git reset --hard <previousSha>` |
| **git** | `tag` | `git tag -d <tag>` |
| **git** | `push` | `git push --force` |
| **git** | `pushTags` | `git push origin --delete <tags>` |
| **npm** | `publish` | `npm unpublish <pkg>@<version>` (best-effort) |
| **github** | `release` | Delete GitHub release via API |
| **gitlab** | `release` | Delete GitLab release via API |

::: warning
npm unpublish is best-effort. npm has strict unpublish policies (72-hour window, no dependents). If unpublish fails, bonvoy warns and continues rolling back other actions.
:::

## Plugin Authors

To support rollback in a custom plugin, tap into the `rollback` hook:

```typescript
class MyPlugin {
  apply(bonvoy) {
    bonvoy.hooks.makeRelease.tapPromise('MyPlugin', async (context) => {
      // Record the action before doing it
      context.actionLog.record('my-plugin', 'create-thing', { id: 123 });
      await createThing(123);
    });

    bonvoy.hooks.rollback.tapPromise('MyPlugin', async (rollbackContext) => {
      const actions = rollbackContext.actions
        .filter((a) => a.plugin === 'my-plugin')
        .reverse();

      for (const action of actions) {
        if (action.action === 'create-thing') {
          await deleteThing(action.data.id);
        }
      }
    });
  }
}
```

The `rollbackContext.actions` array contains only completed actions, already filtered by status.
