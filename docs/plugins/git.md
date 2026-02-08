# plugin-git

> `@bonvoy/plugin-git` — Default plugin

Handles git commit, tag, push, and branch operations during the release process.

## Configuration

```javascript
export default {
  git: {
    commitMessage: 'chore: :bookmark: release',  // default
    tagFormat: '{name}@{version}',                // default
    push: true,                                   // default
  },
};
```

### `commitMessage`

Release commit message. Supports placeholders:

| Placeholder | Description |
|-------------|-------------|
| `{packages}` | Comma-separated package names |
| `{details}` | Package list with versions, one per line |

If `{details}` is not in the message, package details are appended as the commit body automatically.

### `tagFormat`

Git tag format per package:

| Placeholder | Description |
|-------------|-------------|
| `{name}` | Package name (e.g., `@bonvoy/core`) |
| `{version}` | Package version (e.g., `1.2.0`) |

Default produces tags like `@bonvoy/core@1.2.0`.

### `push`

Set to `false` to commit and tag locally without pushing. Useful for testing.

## Hook

| Hook | Action |
|------|--------|
| `beforePublish` | Stages all changes, commits, creates tags, pushes |

## What It Does

During `beforePublish`:

1. `git add .` — stage all changes (version bumps, changelogs)
2. `git commit -m "..."` — commit with configured message
3. `git tag <tag>` — create a tag for each released package
4. `git push` — push commits to remote
5. `git push --tags` — push tags to remote
