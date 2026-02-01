# @bonvoy/plugin-github 🚢

> GitHub releases and PR plugin for bonvoy

Creates GitHub releases with changelogs and manages release PRs.

## Installation

```bash
npm install @bonvoy/plugin-github
```

## Features

- ✅ Creates GitHub releases for each published package
- ✅ Creates release PRs for PR-based workflow
- ✅ Auto-detects repository from package.json or git remote
- ✅ Includes changelog as release body
- ✅ Automatic prerelease detection (e.g., `1.0.0-beta.1`)
- ✅ Draft release support
- ✅ Dry-run support

## Configuration

```javascript
// bonvoy.config.js
export default {
  github: {
    token: process.env.GITHUB_TOKEN, // default
    owner: 'my-org',                  // optional, auto-detected
    repo: 'my-repo',                  // optional, auto-detected
    draft: false,                     // default
    prerelease: false,                // default, auto-detected from version
  },
};
```

## Hooks

This plugin taps into the following hooks:

| Hook | Action |
|------|--------|
| `makeRelease` | Creates GitHub releases for published packages |
| `createPR` | Creates a release PR with version bumps and changelog |

## Requirements

- `GITHUB_TOKEN` environment variable
- For releases: `contents: write` permission
- For PRs: `pull-requests: write` permission

## Repository Detection

The plugin auto-detects the repository in this order:

1. Config options (`owner` and `repo`)
2. `package.json` repository field (URL or object)
3. Git remote URL (`git remote get-url origin`)

Supported URL formats:
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

## PR Workflow

When using `bonvoy prepare`, this plugin:

1. Creates a PR from the release branch to the base branch
2. Sets PR title and body with version bumps and changelog
3. Stores PR info in `.bonvoy/release-pr.json` for merge detection

## Default Behavior

This plugin is loaded automatically by bonvoy. It runs during:
- `makeRelease` hook to create GitHub releases
- `createPR` hook to create release PRs

## License

MIT
