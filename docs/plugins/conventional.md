# plugin-conventional

> `@bonvoy/plugin-conventional` — Default plugin

Parses [conventional commit](https://www.conventionalcommits.org/) messages to determine semantic version bumps automatically.

## Commit Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

## Supported Commit Types

| Commit | Bump | Example |
|--------|------|---------|
| `feat:` | minor | `feat: add user authentication` |
| `fix:` | patch | `fix: resolve memory leak` |
| `perf:` | patch | `perf: optimize database queries` |
| `feat!:` | major | `feat!: remove deprecated API` |
| `fix!:` | major | `fix!: change return type` |
| `BREAKING CHANGE:` in footer | major | Any commit with `BREAKING CHANGE:` in body |

Commits with other types (`docs:`, `chore:`, `style:`, `refactor:`, `test:`, `ci:`) do **not** trigger a release.

## Configuration

```javascript
export default {
  conventional: {
    preset: 'angular',  // default
  },
};
```

### Presets

| Preset | Description |
|--------|-------------|
| `angular` | Standard Angular convention (default) |
| `conventional` | Same as angular |
| `atom` | Atom editor convention (emoji-based) |
| `custom` | Define your own type-to-bump mapping |

### Custom Types

```javascript
export default {
  conventional: {
    preset: 'custom',
    types: {
      feat: 'minor',
      fix: 'patch',
      perf: 'patch',
      refactor: 'patch',   // refactor triggers a patch
      breaking: 'major',
    },
  },
};
```

## How It Works

1. Reads all commits since the last git tag
2. Parses each commit message with [conventional-commits-parser](https://github.com/conventional-changelog/conventional-changelog)
3. Maps the commit type to a bump level
4. Returns the highest bump across all commits

In a monorepo, commits are filtered per package based on which files were modified.

## Hook

| Hook | Action |
|------|--------|
| `getVersion` | Returns the calculated `SemverBump` for the current package |
