# bonvoy 🚢

[![CI](https://github.com/Zweer/bonvoy/actions/workflows/ci.yml/badge.svg)](https://github.com/Zweer/bonvoy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Coverage Badge](https://img.shields.io/badge/coverage-100%25-brightgreen?style=flat)

> "Bon voyage to your releases!"

A plugin-based release automation tool for npm packages and monorepos.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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
bonvoy shipit patch        # Force patch bump
bonvoy shipit minor        # Force minor bump  
bonvoy shipit major        # Force major bump
bonvoy shipit 2.0.0        # Force specific version
bonvoy prepare             # Create release PR (PR workflow)
bonvoy status              # Show pending changes
bonvoy changelog           # Preview changelog
```

## Configuration

Create `bonvoy.config.js` (optional - works without config):

```javascript
export default {
  versioning: 'independent',  // or 'fixed'
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
  workflow: 'direct',  // or 'pr'
  baseBranch: 'main',
  plugins: [],  // Additional plugins
};
```

Configuration is validated at runtime using [Zod](https://zod.dev) for type safety and helpful error messages.

## GitHub Actions

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

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@bonvoy/core` | Hook system, CLI, config loading, schema validation | ✅ **Implemented** |
| `@bonvoy/plugin-conventional` | Conventional commits parser (default) | ✅ **Implemented** |
| `@bonvoy/plugin-git` | Git commit, tag, push (default) | 🚧 Planned |
| `@bonvoy/plugin-npm` | npm publish with OIDC (default) | 🚧 Planned |
| `@bonvoy/plugin-github` | GitHub releases (default) | 🚧 Planned |
| `@bonvoy/plugin-changelog` | Changelog generation (default) | 🚧 Planned |
| `@bonvoy/plugin-gitlab` | GitLab releases (optional) | 🚧 Planned |
| `@bonvoy/plugin-slack` | Slack notifications (optional) | 🚧 Planned |
| `@bonvoy/plugin-changeset` | Changeset-style workflow (optional) | 🚧 Planned |

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

## License

MIT
