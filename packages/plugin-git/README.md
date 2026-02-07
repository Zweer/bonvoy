# @bonvoy/plugin-git 🚢

> Git operations plugin for bonvoy

Handles git commit, tag, push, and branch operations during the release process.

## Installation

```bash
npm install @bonvoy/plugin-git
```

## Features

- ✅ Commits version bumps and changelog updates
- ✅ Creates git tags for each released package
- ✅ Pushes commits and tags to remote
- ✅ Branch creation and checkout for PR workflow
- ✅ Configurable commit message and tag format
- ✅ Dry-run support

## Configuration

```javascript
// bonvoy.config.js
export default {
  git: {
    commitMessage: 'chore: :bookmark: release',  // default
    tagFormat: '{name}@{version}',                // default
    push: true,                                   // default
  },
};
```

### Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{packages}` | Comma-separated list of released package names (for subject) |
| `{details}` | Package list with versions, one per line (for body) |
| `{name}` | Package name (for tag format) |
| `{version}` | Package version (for tag format) |

> **Note:** If neither `{details}` is used in the commit message, package details are automatically appended as the commit body.

## Hooks

This plugin taps into the following hooks:

| Hook | Action |
|------|--------|
| `beforePublish` | Commits changes, creates tags, pushes to remote |

## Operations

The plugin provides these git operations:

- `add(files, cwd)` - Stage files
- `commit(message, cwd)` - Create commit
- `tag(name, cwd)` - Create tag
- `push(cwd, branch?)` - Push to remote
- `pushTags(tags, cwd)` - Push tags
- `checkout(branch, cwd, create?)` - Checkout or create branch
- `getCurrentBranch(cwd)` - Get current branch name
- `getLastTag(cwd)` - Get most recent tag
- `getCommitsSinceTag(tag, cwd)` - Get commits since tag

## Default Behavior

This plugin is loaded automatically by bonvoy. During `beforePublish`:

1. Stage all changes (`git add .`)
2. Commit with the configured message
3. Create tags for each released package
4. Push commits and tags to the remote

## License

MIT
