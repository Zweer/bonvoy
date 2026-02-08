# PR Workflow

For teams that prefer a review step before releasing, bonvoy supports a PR-based workflow similar to release-please or changesets.

## How It Works

```
push to main → bonvoy prepare → Release PR created
                                      │
                                 review & merge
                                      │
push to main → bonvoy shipit → detects merged PR → publish only
```

### Step 1: `bonvoy prepare`

When code is pushed to main, `bonvoy prepare`:

1. Analyzes commits since last release
2. Calculates version bumps
3. Creates a `release/<timestamp>` branch
4. Updates package.json versions and changelogs
5. Pushes the branch and creates a PR
6. Saves tracking info to `.bonvoy/release-pr.json`

### Step 2: Review

The PR shows:
- Which packages are being released
- What versions they're bumped to
- The full changelog for each package

### Step 3: Merge & Publish

After the PR is merged, `bonvoy shipit` on main detects `.bonvoy/release-pr.json` and enters **publish-only mode**:

- Skips version calculation (already done in the PR)
- Publishes to npm
- Creates GitHub releases
- Cleans up the tracking file

## GitHub Actions Setup

A single workflow handles both steps:

```yaml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npx bonvoy shipit
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`bonvoy shipit` auto-detects the context:
- If `.bonvoy/release-pr.json` exists → publish-only mode
- Otherwise → creates a release PR (same as `bonvoy prepare`)

## Configuration

```javascript
export default {
  workflow: 'pr',
  baseBranch: 'main',
};
```

## Tracking File

`.bonvoy/release-pr.json` contains:

```json
{
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "branch": "release/1707321600000",
  "baseBranch": "main",
  "createdAt": "2026-02-08T12:00:00.000Z",
  "packages": ["@scope/core", "@scope/utils"]
}
```

::: tip
Add `.bonvoy/release-pr.json` to `.gitignore` if you don't want it tracked. The file is cleaned up automatically after publishing.
:::

## GitLab

The PR workflow also works with GitLab. Install `@bonvoy/plugin-gitlab` and it creates merge requests instead of pull requests.
