# CLI Reference

## `bonvoy shipit`

Release all changed packages.

```bash
bonvoy shipit [bump] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `bump` | Optional. Force a version bump: `patch`, `minor`, `major`, `prerelease`, or an exact version like `2.0.0` |

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without executing anything |
| `--json` | Output results as JSON (for CI pipelines) |
| `--package <name>` | Only release specific package(s). Repeatable |
| `--preid <id>` | Prerelease identifier: `alpha`, `beta`, `rc`, etc. Default: `next` |
| `--force` | Ignore stale release log and proceed (see [Rollback](/guides/rollback)) |

### Examples

```bash
# Automatic bump from conventional commits
bonvoy shipit

# Preview what would happen
bonvoy shipit --dry-run

# Force bumps
bonvoy shipit patch
bonvoy shipit minor
bonvoy shipit major
bonvoy shipit 2.0.0

# Prereleases
bonvoy shipit prerelease --preid beta     # 1.0.0 → 1.0.1-beta.0
bonvoy shipit prerelease --preid beta     # 1.0.1-beta.0 → 1.0.1-beta.1
bonvoy shipit patch                       # 1.0.1-beta.1 → 1.0.1

# Release specific packages only
bonvoy shipit --package @scope/core
bonvoy shipit --package @scope/core --package @scope/utils

# JSON output for CI
bonvoy shipit --json
```

### JSON Output

When using `--json`, the output looks like:

```json
{
  "success": true,
  "dryRun": false,
  "released": [
    { "name": "@scope/core", "version": "1.2.0", "bump": "minor" },
    { "name": "@scope/utils", "version": "1.1.1", "bump": "patch" }
  ],
  "changelogs": {
    "@scope/core": "## 1.2.0\n\n### ✨ Features\n...",
    "@scope/utils": "## 1.1.1\n\n### 🐛 Bug Fixes\n..."
  }
}
```

### Auto-Detection

`shipit` is context-aware:

- **On main with `.bonvoy/release-pr.json`**: enters publish-only mode (the release PR was merged, so it only publishes and creates GitHub releases — no version bumps)
- **Otherwise**: runs the full release lifecycle

## `bonvoy prepare`

Create a release PR with version bumps and changelogs (PR-based workflow).

```bash
bonvoy prepare [bump] [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `bump` | Optional. Force a version bump type or exact version |

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview without creating the PR |
| `--preid <id>` | Prerelease identifier |

### What It Does

1. Analyzes commits since last release
2. Calculates version bumps
3. Creates a release branch (`release/<timestamp>`)
4. Updates `package.json` versions
5. Generates changelogs
6. Commits and pushes the branch
7. Creates a PR targeting the base branch
8. Saves tracking info to `.bonvoy/release-pr.json`

After the PR is merged, running `bonvoy shipit` on the base branch will detect the tracking file and enter publish-only mode.

## `bonvoy status`

Show pending changes since the last release.

```bash
bonvoy status
```

Displays which packages have changes and what commits affect them.

## `bonvoy changelog`

Preview the changelog that would be generated.

```bash
bonvoy changelog
```

Shows the changelog content without making any changes.

## `bonvoy rollback`

Roll back the last release using the action log.

```bash
bonvoy rollback [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would be rolled back without executing |
| `--force` | Skip stale release log check |

### Examples

```bash
# Roll back the last release
bonvoy rollback

# Preview rollback actions
bonvoy rollback --dry-run
```

See the [Rollback Guide](/guides/rollback) for details on how rollback works.
