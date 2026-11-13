---
title: plugin-changelog
---

> `@bonvoy/plugin-changelog` — Default plugin

Generates CHANGELOG.md files for each released package.

## Output Format

```markdown
## 1.2.0 (2026-02-08)

### ✨ Features

- add user authentication (abc1234)
- add API rate limiting (def5678)

### 🐛 Bug Fixes

- resolve memory leak in cache (ghi9012)
```

## Configuration

```javascript
export default {
  changelog: {
    global: false,   // Generate a root CHANGELOG.md too
    sections: {
      feat: '✨ Features',
      fix: '🐛 Bug Fixes',
      perf: '⚡ Performance',
      docs: '📚 Documentation',
      breaking: '💥 Breaking Changes',
    },
  },
};
```

### `global`

When `true`, generates an aggregated changelog at the repo root in addition to per-package changelogs.

### `sections`

Map of commit types to section headers. Only commits matching these types appear in the changelog. Customize the headers or add new types:

```javascript
export default {
  changelog: {
    sections: {
      feat: '🚀 New Features',
      fix: '🐛 Fixes',
      perf: '⚡ Performance',
      refactor: '♻️ Refactoring',  // add refactor to changelog
    },
  },
};
```

## Hooks

| Hook | Action |
|------|--------|
| `generateChangelog` | Returns the changelog string for the current package |
| `afterChangelog` | Writes the changelog to `CHANGELOG.md` |

## Behavior

- New changelog content is **prepended** to the existing CHANGELOG.md
- If no CHANGELOG.md exists, one is created
- Each package gets its own CHANGELOG.md in its directory
- Commits are assigned to packages based on which files they modified
- A single commit can appear in multiple package changelogs
