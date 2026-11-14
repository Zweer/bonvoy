# @bonvoy/plugin-changelog 🚢

> Changelog generation plugin for bonvoy

Automatically generates and maintains CHANGELOG.md files for your packages based on conventional commit messages.

## Features

- 📝 **Per-package Changelogs** - Each package gets its own CHANGELOG.md
- 🌍 **Global Changelog** - Optional aggregated changelog at repo root
- 🎨 **Customizable Sections** - Configure section titles and commit types
- 📅 **Standard Format** - Follows [Keep a Changelog](https://keepachangelog.com/) format
- 🔄 **Incremental Updates** - Preserves existing changelog history
- 🎯 **Conventional Commits** - Only includes semantic commit types

## Installation

```bash
npm install @bonvoy/plugin-changelog
```

This plugin is included by default in bonvoy, so you typically don't need to install it separately.

## Usage

### Default Configuration

The plugin works out of the box with sensible defaults:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    '@bonvoy/plugin-changelog', // Uses default configuration
  ],
};
```

### Custom Configuration

```javascript
// bonvoy.config.js
export default {
  plugins: [
    [
      '@bonvoy/plugin-changelog',
      {
        global: true, // Generate global changelog at repo root
        includeCommitHash: true, // Include commit hashes in entries
        sections: {
          feat: '🚀 New Features',
          fix: '🔧 Bug Fixes',
          perf: '⚡ Performance Improvements',
          docs: '📚 Documentation',
          breaking: '💥 Breaking Changes',
        },
      },
    ],
  ],
};
```

## Generated Format

### Per-package CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-01-09

### ✨ Features

- feat: add new API endpoint
- feat(auth): implement OAuth2 support

### 🐛 Bug Fixes

- fix: resolve memory leak in parser
- fix(api): handle edge case in validation

### ⚡ Performance

- perf: optimize database queries

## [1.1.0] - 2026-01-08

### ✨ Features

- feat: add user management
```

### Global Changelog (optional)

When `global: true` is enabled, a global changelog is created at the repo root:

```markdown
# Changelog

## @myorg/core

### ✨ Features

- feat: add new API endpoint

### 🐛 Bug Fixes

- fix: resolve memory leak

## @myorg/utils

### ✨ Features

- feat: add utility functions
```

## Configuration Options

```typescript
interface ChangelogConfig {
  // Generate global changelog at repo root
  global?: boolean; // default: false

  // Section titles for different commit types
  sections?: Record<string, string>; // default: emoji sections

  // Include commit hashes in changelog entries
  includeCommitHash?: boolean; // default: false
}
```

### Default Sections

```javascript
{
  feat: '✨ Features',
  fix: '🐛 Bug Fixes', 
  perf: '⚡ Performance',
  docs: '📚 Documentation',
  breaking: '💥 Breaking Changes',
}
```

## Commit Filtering

The plugin automatically filters commits based on:

1. **Conventional format**: Only `type: description` commits are included
2. **Package relevance**: Commits are assigned to packages based on modified files
3. **Semantic types**: Only configured commit types generate changelog entries

### Examples

```bash
# These commits will appear in changelog:
git commit -m "feat: add new feature"        # → ✨ Features
git commit -m "fix: resolve bug"             # → 🐛 Bug Fixes
git commit -m "feat!: breaking change"       # → 💥 Breaking Changes

# These commits will NOT appear:
git commit -m "chore: update dependencies"   # → ignored (not configured)
git commit -m "docs: update README"          # → ignored (unless docs configured)
git commit -m "random commit message"        # → ignored (not conventional)
```

## Monorepo Support

In monorepos, each package gets its own changelog with only relevant commits:

```bash
# This commit affects both packages
git commit -m "feat: add shared utility" packages/core/src/util.ts packages/cli/src/util.ts

# This commit only affects @myorg/core
git commit -m "fix(core): resolve parsing issue" packages/core/src/parser.ts
```

The changelog plugin will:

- Add the shared commit to both package changelogs
- Add the core-specific commit only to @myorg/core changelog

## File Management

The plugin intelligently manages changelog files:

- **New files**: Creates complete changelog with header and format explanation
- **Existing files**: Prepends new entries while preserving history
- **Custom headers**: Preserves existing changelog titles and descriptions
- **Incremental**: Only adds new version entries, never overwrites existing ones

## Integration with Other Plugins

Works seamlessly with other bonvoy plugins:

- **@bonvoy/plugin-conventional**: Provides commit parsing and type detection
- **@bonvoy/plugin-git**: Commits the generated changelog files
- **@bonvoy/plugin-github**: Includes changelog content in GitHub releases

## API

```typescript
import ChangelogPlugin from '@bonvoy/plugin-changelog';

const plugin = new ChangelogPlugin({
  global: true,
  sections: {
    feat: '🚀 Features',
    fix: '🔧 Fixes',
  },
  includeCommitHash: true,
});
```

## License

MIT
