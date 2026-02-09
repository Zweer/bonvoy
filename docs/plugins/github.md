# plugin-github

> `@bonvoy/plugin-github` — Default plugin

Creates GitHub releases after publishing packages. Also handles PR creation for the PR-based workflow.

## Configuration

```javascript
export default {
  github: {
    draft: false,        // default
    prerelease: false,   // default: auto-detected
    // owner: 'my-org',  // auto-detected from git remote
    // repo: 'my-repo',  // auto-detected from git remote
  },
};
```

### `draft`

Create releases as drafts for manual review before publishing.

### `prerelease`

Force the prerelease flag. By default, bonvoy detects prerelease versions automatically (e.g., `1.0.0-beta.1` → prerelease).

### `owner` / `repo`

Usually not needed. bonvoy parses `git remote get-url origin` to detect the GitHub owner and repository.

## Requirements

- `GITHUB_TOKEN` environment variable with `contents: write` permission
- For PR workflow: also needs `pull-requests: write`

```yaml
permissions:
  contents: write
  pull-requests: write  # only for PR workflow
  id-token: write       # only for npm provenance
```

## Hooks

| Hook | Action |
|------|--------|
| `makeRelease` | Creates a GitHub release for each published package |
| `createPR` | Creates a pull request (PR workflow) |
| `rollback` | Deletes GitHub releases by ID |

## Release Format

For each published package, a GitHub release is created with:

- **Tag**: `@bonvoy/core@1.2.0` (configurable via `tagFormat`)
- **Title**: `@bonvoy/core v1.2.0`
- **Body**: the package's changelog for this version
- **Prerelease**: auto-detected from version string
