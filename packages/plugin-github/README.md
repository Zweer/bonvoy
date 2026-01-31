# @bonvoy/plugin-github 🚢

> GitHub releases plugin for bonvoy

Creates GitHub releases with changelogs for each published package.

## Installation

```bash
npm install @bonvoy/plugin-github
```

## Features

- ✅ Creates GitHub releases for each published package
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

## Requirements

- `GITHUB_TOKEN` environment variable with `contents: write` permission
- Repository must be hosted on GitHub

## Default Behavior

This plugin is loaded automatically by bonvoy. It runs during the `makeRelease` hook to create GitHub releases for each published package.

## License

MIT
