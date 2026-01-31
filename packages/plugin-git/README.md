# @bonvoy/plugin-git 🚢

> Git operations plugin for bonvoy

Handles git commit, tag, and push operations during the release process.

## Installation

```bash
npm install @bonvoy/plugin-git
```

## Features

- ✅ Commits version bumps and changelog updates
- ✅ Creates git tags for each released package
- ✅ Pushes commits and tags to remote
- ✅ Configurable commit message and tag format
- ✅ Dry-run support

## Configuration

```javascript
// bonvoy.config.js
export default {
  git: {
    commitMessage: 'chore(release): {packages}', // default
    tagFormat: '{name}@{version}',               // default
    push: true,                                   // default
  },
};
```

## Default Behavior

This plugin is loaded automatically by bonvoy. It runs during the `beforePublish` hook to:

1. Stage all changes (`git add .`)
2. Commit with the configured message
3. Create tags for each released package
4. Push commits and tags to the remote

## License

MIT
