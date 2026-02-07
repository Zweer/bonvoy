# @bonvoy/cli 🚢

> CLI for bonvoy release automation

Command-line interface for bonvoy - the plugin-based release automation tool for npm packages and monorepos.

## Features

- 🚀 **Simple Commands** - Intuitive CLI with `shipit`, `prepare`, `status`
- 🔍 **Dry Run Mode** - Preview changes before executing
- 📊 **Rich Output** - Colored output with progress indicators
- ⚙️ **Flexible Options** - Force version bumps, select packages
- 🛡️ **Type Safety** - Built with TypeScript and commander.js

## Installation

```bash
# Install globally
npm install -g @bonvoy/cli

# Or use with npx
npx @bonvoy/cli shipit
```

## Commands

### `shipit` - Release packages

```bash
# Release all changed packages
bonvoy shipit

# Preview changes (dry run)
bonvoy shipit --dry-run

# Output JSON for CI integration
bonvoy shipit --json

# Force specific version bump
bonvoy shipit patch
bonvoy shipit minor
bonvoy shipit major
bonvoy shipit 2.0.0

# Release specific packages
bonvoy shipit --package @scope/core --package @scope/utils
```

### `prepare` - Create release PR

```bash
# Create PR with version bumps and changelog
bonvoy prepare

# Preview PR changes
bonvoy prepare --dry-run
```

### `status` - Show pending changes

```bash
# Show packages with unreleased changes
bonvoy status
```

### `changelog` - Preview changelog

```bash
# Show changelog for all packages
bonvoy changelog
```

## Configuration

Create `bonvoy.config.js` in your project root:

```javascript
export default {
  versioning: 'independent',
  commitMessage: 'chore: :bookmark: release',
  tagFormat: '{name}@{version}',
  workflow: 'direct',
  plugins: [
    '@bonvoy/plugin-conventional',
    '@bonvoy/plugin-changelog',
    '@bonvoy/plugin-git',
    '@bonvoy/plugin-npm',
    '@bonvoy/plugin-github',
  ],
};
```

## Examples

```bash
# Standard release workflow
bonvoy shipit

# Preview what would happen
bonvoy shipit --dry-run

# Force minor bump for all packages
bonvoy shipit minor

# Release only specific packages
bonvoy shipit --package @myorg/core --package @myorg/utils

# Create release PR instead of direct release
bonvoy prepare

# Check what packages have changes
bonvoy status
```

## License

MIT
