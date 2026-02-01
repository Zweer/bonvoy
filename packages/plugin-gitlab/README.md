# @bonvoy/plugin-gitlab 🚢

> GitLab releases and MR plugin for bonvoy

Creates GitLab releases with changelogs and manages release merge requests.

## Installation

```bash
npm install @bonvoy/plugin-gitlab
```

## Features

- ✅ Creates GitLab releases for each published package
- ✅ Creates release MRs for PR-based workflow
- ✅ Auto-detects project from package.json or git remote
- ✅ Includes changelog as release description
- ✅ Custom GitLab host support (self-hosted)
- ✅ Dry-run support

## Configuration

```javascript
// bonvoy.config.js
export default {
  gitlab: {
    token: process.env.GITLAB_TOKEN,       // default
    host: 'https://gitlab.com',            // default, or self-hosted URL
    projectId: 'my-group/my-project',      // optional, auto-detected
  },
};
```

## Hooks

This plugin taps into the following hooks:

| Hook | Action |
|------|--------|
| `makeRelease` | Creates GitLab releases for published packages |
| `createPR` | Creates a release MR with version bumps and changelog |

## Requirements

- `GITLAB_TOKEN` environment variable with `api` scope
- For self-hosted: `GITLAB_HOST` environment variable (optional)

## Project Detection

The plugin auto-detects the project in this order:

1. Config option (`projectId`)
2. `package.json` repository field
3. Git remote URL

Supported URL formats:
- `https://gitlab.com/group/project`
- `https://gitlab.com/group/subgroup/project`
- `git@gitlab.com:group/project.git`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITLAB_TOKEN` | GitLab personal access token |
| `GITLAB_HOST` | GitLab host URL (default: `https://gitlab.com`) |

## MR Workflow

When using `bonvoy prepare`, this plugin:

1. Creates an MR from the release branch to the base branch
2. Sets MR title and description with version bumps and changelog
3. Stores MR info in `.bonvoy/release-pr.json` for merge detection

## Usage

To use GitLab instead of GitHub, disable the GitHub plugin:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    '@bonvoy/plugin-gitlab',
    // GitHub plugin is disabled when GitLab is explicitly added
  ],
};
```

## License

MIT
