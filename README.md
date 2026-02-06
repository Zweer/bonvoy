# bonvoy 🚢

[![CI](https://github.com/Zweer/bonvoy/actions/workflows/ci.yml/badge.svg)](https://github.com/Zweer/bonvoy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage Badge](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat)

> "Bon voyage to your releases!"

A plugin-based release automation tool for npm packages and monorepos.

## Why bonvoy?

Existing release tools have frustrating limitations:

| Tool | Problem |
|------|---------|
| semantic-release | Too automatic, complex plugin config |
| release-it | No monorepo support |
| changesets | Mandatory PR workflow, unpredictable bumps |
| release-please | Complex config, PR-only |
| auto | Label-based, PR-dependent |

**bonvoy** gives you:
- 🔌 **Plugin architecture** - Extend or replace any functionality
- 📦 **Monorepo-native** - npm workspaces out of the box
- 🎯 **Flexible workflows** - Direct release or PR-based
- ⚡ **Zero config** - Works immediately for npm + GitHub
- 🏷️ **Independent versioning** - Each package has its own version
- 📝 **Conventional commits** - Automatic changelog from commit messages
- 🛡️ **Runtime validation** - Config validated with Zod for type safety

## Installation

```bash
npm install -D @bonvoy/core
```

## Quick Start

```bash
# Release all changed packages
npx bonvoy shipit

# Preview what would happen
npx bonvoy shipit --dry-run

# Force a specific bump
npx bonvoy shipit minor
npx bonvoy shipit 2.0.0
```

## How It Works

1. **Analyze commits** - Parse conventional commits since last release
2. **Determine versions** - Calculate bump per package based on changes
3. **Generate changelog** - Create CHANGELOG.md entries
4. **Publish** - npm publish + GitHub release + git tags

## CLI Commands

```bash
bonvoy shipit              # Release all changed packages
bonvoy shipit --dry-run    # Preview changes
bonvoy shipit --json       # Output JSON for CI integration
bonvoy shipit patch        # Force patch bump
bonvoy shipit minor        # Force minor bump  
bonvoy shipit major        # Force major bump
bonvoy shipit 2.0.0        # Force specific version
bonvoy shipit prerelease --preid beta  # Create prerelease (1.0.0 → 1.0.1-beta.0)
bonvoy shipit prerelease --preid beta  # Increment prerelease (1.0.1-beta.0 → 1.0.1-beta.1)
bonvoy shipit patch        # Graduate prerelease to stable (1.0.1-beta.3 → 1.0.1)
bonvoy prepare             # Create release PR (PR workflow)
bonvoy status              # Show pending changes
bonvoy changelog           # Preview changelog
```

## Configuration

Create `bonvoy.config.js` (optional - works without config).

Supported formats: `.js`, `.mjs`, `.ts`, `.json`, `.yaml`, `.yml`, `.toml`, `.bonvoyrc`, or `"bonvoy"` key in `package.json`.

```javascript
export default {
  versioning: 'independent',  // or 'fixed' (all packages share same version)
  rootVersionStrategy: 'max', // 'max' | 'patch' | 'none' (monorepo root version)
  commitMessage: 'chore: release {packages}',
  tagFormat: '{name}@{version}',
  changelog: {
    global: false,  // Generate global changelog at repo root
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
      perf: '⚡ Performance',
      docs: '📚 Documentation',
      breaking: '💥 Breaking Changes',
    },
  },
  conventional: {
    preset: 'angular',  // 'angular' | 'conventional' | 'atom' | 'custom'
    // types: { feat: 'minor', fix: 'patch' },  // Custom types (when preset: 'custom')
  },
  git: {
    // commitMessage: '...',  // Overrides top-level commitMessage
    // tagFormat: '...',      // Overrides top-level tagFormat
    push: true,               // Push commits and tags to remote
  },
  npm: {
    registry: 'https://registry.npmjs.org',
    access: 'public',       // 'public' | 'restricted'
    skipExisting: true,      // Skip already-published versions
    provenance: true,        // Enable npm provenance (OIDC)
  },
  github: {
    draft: false,      // Create releases as drafts
    prerelease: false, // Force prerelease flag (auto-detected by default)
  },
  gitlab: {
    // host: 'https://gitlab.com',
    // projectId: 12345,
  },
  workflow: 'direct',  // or 'pr'
  baseBranch: 'main',
  plugins: [],  // Additional plugins
  // hooks: { afterRelease: (ctx) => console.log('Released!') },  // Inline hooks
};
```

Configuration is validated at runtime using [Zod](https://zod.dev) for type safety and helpful error messages.

## GitHub Actions

### Direct Release

```yaml
name: Release
on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump (patch/minor/major/x.y.z)'
        required: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npx bonvoy shipit ${{ github.event.inputs.bump }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### PR-based Release

For a release-please style workflow where changes accumulate in a PR:

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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npx bonvoy shipit
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `shipit` command auto-detects the context:
- **On feature branch**: Creates/updates a release PR with version bumps and changelog
- **On main after PR merge**: Publishes packages (detected via `.bonvoy/release-pr.json`)

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@bonvoy/cli](./packages/cli) | [![npm](https://img.shields.io/npm/v/@bonvoy/cli)](https://www.npmjs.com/package/@bonvoy/cli) | CLI orchestration and commands |
| [@bonvoy/core](./packages/core) | [![npm](https://img.shields.io/npm/v/@bonvoy/core)](https://www.npmjs.com/package/@bonvoy/core) | Hook system, config loading, schema validation |
| [@bonvoy/plugin-changelog](./packages/plugin-changelog) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-changelog)](https://www.npmjs.com/package/@bonvoy/plugin-changelog) | Changelog generation (default) |
| [@bonvoy/plugin-changeset](./packages/plugin-changeset) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-changeset)](https://www.npmjs.com/package/@bonvoy/plugin-changeset) | Changeset-compatible workflow (optional) |
| [@bonvoy/plugin-conventional](./packages/plugin-conventional) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-conventional)](https://www.npmjs.com/package/@bonvoy/plugin-conventional) | Conventional commits parser (default) |
| [@bonvoy/plugin-discord](./packages/plugin-discord) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-discord)](https://www.npmjs.com/package/@bonvoy/plugin-discord) | Discord notifications (optional) |
| [@bonvoy/plugin-exec](./packages/plugin-exec) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-exec)](https://www.npmjs.com/package/@bonvoy/plugin-exec) | Custom shell commands (optional) |
| [@bonvoy/plugin-git](./packages/plugin-git) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-git)](https://www.npmjs.com/package/@bonvoy/plugin-git) | Git commit, tag, push (default) |
| [@bonvoy/plugin-github](./packages/plugin-github) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-github)](https://www.npmjs.com/package/@bonvoy/plugin-github) | GitHub releases (default) |
| [@bonvoy/plugin-gitlab](./packages/plugin-gitlab) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-gitlab)](https://www.npmjs.com/package/@bonvoy/plugin-gitlab) | GitLab releases (optional) |
| [@bonvoy/plugin-notification](./packages/plugin-notification) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-notification)](https://www.npmjs.com/package/@bonvoy/plugin-notification) | Base notification plugin |
| [@bonvoy/plugin-npm](./packages/plugin-npm) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-npm)](https://www.npmjs.com/package/@bonvoy/plugin-npm) | npm publish with OIDC (default) |
| [@bonvoy/plugin-slack](./packages/plugin-slack) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-slack)](https://www.npmjs.com/package/@bonvoy/plugin-slack) | Slack notifications (optional) |
| [@bonvoy/plugin-teams](./packages/plugin-teams) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-teams)](https://www.npmjs.com/package/@bonvoy/plugin-teams) | Microsoft Teams notifications (optional) |
| [@bonvoy/plugin-telegram](./packages/plugin-telegram) | [![npm](https://img.shields.io/npm/v/@bonvoy/plugin-telegram)](https://www.npmjs.com/package/@bonvoy/plugin-telegram) | Telegram notifications (optional) |

## Plugin: Conventional Commits

The `@bonvoy/plugin-conventional` analyzes commit messages to determine semantic version bumps automatically.

### Features

- ✅ **Robust parsing** with [`conventional-commits-parser`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-commits-parser)
- ✅ **Breaking changes** support (`feat!:` and `BREAKING CHANGE:`)
- ✅ **Configurable presets** (angular, conventional, atom, custom)
- ✅ **Monorepo-ready** with per-package commit filtering
- ✅ **Graceful fallbacks** for malformed commits

### Supported Commit Types

| Type | Bump | Example |
|------|------|---------|
| `feat` | `minor` | `feat: add new API endpoint` |
| `fix` | `patch` | `fix: resolve memory leak` |
| `perf` | `patch` | `perf: optimize database queries` |
| `feat!` | `major` | `feat!: remove deprecated API` |
| `BREAKING CHANGE` | `major` | Any commit with `BREAKING CHANGE:` in body |

### Configuration

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-conventional', {
      preset: 'angular', // 'angular' | 'conventional' | 'atom' | 'custom'
      types: {
        // Custom types (when preset: 'custom')
        feat: 'minor',
        fix: 'patch',
        breaking: 'major'
      }
    }]
  ]
};
```

### Examples

```bash
# These commits will trigger releases:
git commit -m "feat: add user authentication"     # → minor bump
git commit -m "fix: resolve login bug"            # → patch bump  
git commit -m "feat!: remove legacy API"          # → major bump
git commit -m "perf: optimize queries"            # → patch bump

# These commits will NOT trigger releases:
git commit -m "docs: update README"               # → no bump
git commit -m "chore: update dependencies"        # → no bump
git commit -m "style: fix formatting"             # → no bump
```

## Plugin: GitHub Releases

The `@bonvoy/plugin-github` automatically creates GitHub releases after publishing packages.

### Features

- ✅ **Auto-detection** - Parses repository from git remote URL
- ✅ **Per-package releases** - Creates individual releases with changelogs
- ✅ **Prerelease support** - Automatically detects prerelease versions (e.g., `1.0.0-beta.1`)
- ✅ **Draft releases** - Optional draft mode for manual review
- ✅ **Dry-run support** - Preview releases without creating them

### Configuration

```javascript
export default {
  github: {
    token: process.env.GITHUB_TOKEN,  // Optional, defaults to env var
    owner: 'my-org',                   // Optional, auto-detected from git remote
    repo: 'my-repo',                   // Optional, auto-detected from git remote
    draft: false,                      // Create as draft (default: false)
    prerelease: false,                 // Force prerelease flag (default: auto-detect)
  },
};
```

### Requirements

- `GITHUB_TOKEN` environment variable with `contents: write` permission
- Repository must be on GitHub

### Example Release

When you run `bonvoy shipit`, the plugin will:
1. Detect repository from `git remote get-url origin`
2. Create a release for each published package
3. Use the package's changelog as release body
4. Tag format: `package-name@version` (e.g., `@bonvoy/core@1.0.0`)
5. Release name: `package-name vversion` (e.g., `@bonvoy/core v1.0.0`)

## Writing Plugins

```typescript
import { BonvoyPlugin } from '@bonvoy/core';

export default class MyPlugin implements BonvoyPlugin {
  name = 'my-plugin';

  apply(bonvoy) {
    bonvoy.hooks.afterRelease.tap(this.name, (context) => {
      console.log(`Released ${context.packages.length} packages!`);
    });
  }
}
```

## Notification Plugins

Send release notifications to your team via various channels:

### Slack

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-slack', {
      // Option 1: Webhook
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      // Option 2: Bot API
      token: process.env.SLACK_BOT_TOKEN,
      channel: '#releases',
    }]
  ]
};
```

### Discord

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-discord', {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    }]
  ]
};
```

### Telegram

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-telegram', {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    }]
  ]
};
```

### Microsoft Teams

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-teams', {
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
    }]
  ]
};
```

All notification plugins support:
- `onSuccess` - Send on successful release (default: `true`)
- `onFailure` - Send on failed release (default: `false`)
- `includeChangelog` - Include changelog in message (default: `true`)

## License

MIT
