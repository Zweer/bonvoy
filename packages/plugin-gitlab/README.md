# @bonvoy/plugin-gitlab 🚢

> GitLab releases plugin for bonvoy

Optional plugin that creates GitLab releases after publishing packages.

## Features

- ✅ **Auto-detection** - Parses project from package.json or git remote
- ✅ **Per-package releases** - Creates individual releases with changelogs
- ✅ **Self-hosted support** - Works with GitLab.com and self-hosted instances
- ✅ **Dry-run support** - Preview releases without creating them

## Installation

```bash
npm install -D @bonvoy/plugin-gitlab
```

## Usage

```javascript
// bonvoy.config.js
export default {
  plugins: [
    '@bonvoy/plugin-gitlab',
    // NOTE: Use instead of @bonvoy/plugin-github, not alongside
  ]
};
```

## Configuration

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-gitlab', {
      token: process.env.GITLAB_TOKEN,  // Optional, defaults to env var
      host: 'https://gitlab.example.com', // Optional, defaults to gitlab.com
      projectId: 'group/project',        // Optional, auto-detected from package.json
    }]
  ]
};
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GITLAB_TOKEN` | GitLab personal access token with `api` scope |
| `GITLAB_HOST` | GitLab instance URL (default: `https://gitlab.com`) |

## Requirements

- `GITLAB_TOKEN` with `api` scope
- Repository URL in package.json or `projectId` in options

## Example Release

When you run `bonvoy shipit`, the plugin will:
1. Detect project from `repository` field in package.json
2. Create a release for each published package
3. Use the package's changelog as release description
4. Tag format: `package-name@version` (e.g., `@scope/core@1.0.0`)

## Self-hosted GitLab

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-gitlab', {
      host: 'https://gitlab.mycompany.com',
    }]
  ]
};
```

Or via environment variable:

```bash
GITLAB_HOST=https://gitlab.mycompany.com bonvoy shipit
```

## License

MIT
