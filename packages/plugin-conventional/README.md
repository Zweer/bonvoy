# @bonvoy/plugin-conventional 🚢

> Conventional commits plugin for bonvoy

Analyzes conventional commit messages to automatically determine semantic version bumps for your packages.

## Features

- ✅ **Robust Parsing** - Uses [`conventional-commits-parser`](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-commits-parser)
- 💥 **Breaking Changes** - Supports `feat!:` syntax and `BREAKING CHANGE:` footer
- 🎛️ **Configurable Presets** - Angular, Conventional, Atom, or custom
- 📦 **Monorepo Ready** - Per-package commit filtering
- 🛡️ **Graceful Fallbacks** - Handles malformed commits without crashing

## Installation

```bash
npm install @bonvoy/plugin-conventional
```

This plugin is included by default in bonvoy, so you typically don't need to install it separately.

## Usage

### Default Configuration

The plugin works out of the box with the Angular preset:

```javascript
// bonvoy.config.js
export default {
  plugins: [
    '@bonvoy/plugin-conventional', // Uses Angular preset by default
  ],
};
```

### Custom Configuration

```javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-conventional', {
      preset: 'conventional', // 'angular' | 'conventional' | 'atom' | 'custom'
      types: {
        // Only used when preset: 'custom'
        feat: 'minor',
        fix: 'patch',
        breaking: 'major',
        perf: 'patch',
      }
    }]
  ],
};
```

## Supported Commit Types

### Angular Preset (default)

| Type | Bump | Example |
|------|------|---------|
| `feat` | `minor` | `feat: add new API endpoint` |
| `fix` | `patch` | `fix: resolve memory leak` |
| `perf` | `patch` | `perf: optimize database queries` |
| `feat!` | `major` | `feat!: remove deprecated API` |
| `BREAKING CHANGE` | `major` | Any commit with `BREAKING CHANGE:` in body |

### Breaking Changes

Breaking changes can be indicated in two ways:

1. **Exclamation mark**: `feat!: remove old API`
2. **Footer**: Any commit with `BREAKING CHANGE:` in the body

```bash
feat: add new authentication system

BREAKING CHANGE: The old auth API has been removed. 
Use the new `authenticate()` method instead.
```

## Examples

### Commits that trigger releases:

```bash
git commit -m "feat: add user authentication"     # → minor bump
git commit -m "fix: resolve login bug"            # → patch bump  
git commit -m "feat!: remove legacy API"          # → major bump
git commit -m "perf: optimize queries"            # → patch bump
```

### Commits that DON'T trigger releases:

```bash
git commit -m "docs: update README"               # → no bump
git commit -m "chore: update dependencies"        # → no bump
git commit -m "style: fix formatting"             # → no bump
git commit -m "test: add unit tests"              # → no bump
```

## Presets

### Angular (default)
- `feat` → minor
- `fix` → patch  
- `perf` → patch

### Conventional
- `feat` → minor
- `fix` → patch
- `perf` → patch

### Atom
- `:sparkles:` → minor
- `:bug:` → patch
- `:racehorse:` → patch

### Custom
Define your own commit types and their corresponding bumps.

## Monorepo Support

The plugin automatically filters commits based on the files they modify, ensuring each package only gets bumped for relevant changes.

```bash
# This commit only affects @myorg/core
git commit -m "feat(core): add new feature" packages/core/src/feature.ts

# This commit affects both packages
git commit -m "feat: add shared utility" packages/core/src/util.ts packages/cli/src/util.ts
```

## API

```typescript
import ConventionalPlugin from '@bonvoy/plugin-conventional';

interface ConventionalConfig {
  preset?: 'angular' | 'conventional' | 'atom' | 'custom';
  types?: Record<string, SemverBump>;
}

const plugin = new ConventionalPlugin({
  preset: 'angular',
  types: {
    feat: 'minor',
    fix: 'patch',
  }
});
```

## License

MIT
